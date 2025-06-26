import { VulnerabilityAnalyzer } from './VulnerabilityAnalyzer';
import { VulnerabilityReport } from '../types/VulnerabilityReport';
import { Node, Statement, Expression } from '../types/SolidityTypes';

export class WeakRandomnessAnalyzer extends VulnerabilityAnalyzer {
    analyze(): VulnerabilityReport {
        this.contract.subNodes.forEach((node: Node) => {
            if (node.type === 'FunctionDefinition') {
                this.analyzeFunction(node);
            }
        });
        return this.report;
    }

    private analyzeFunction(func: Node) {
        if (!func.body?.statements) return;

        func.body.statements.forEach(statement => {
            this.analyzeStatement(statement);
        });
    }

    private analyzeStatement(statement: Statement) {
        if (statement.type === 'ExpressionStatement' && statement.expression) {
            this.analyzeExpression(statement.expression);
        }

        // Recursively analyze nested statements
        if (statement.statements) {
            statement.statements.forEach(stmt => this.analyzeStatement(stmt));
        }
    }

    private analyzeExpression(expression: Expression) {
        // Check for weak randomness sources
        if (this.containsWeakRandomness(expression)) {
            const location = expression.loc;
            if (!location) return;

            this.addVulnerability(
                'MEDIUM',
                'Weak Randomness Source',
                'Using block.timestamp, block.difficulty, or other predictable values for randomness.',
                {
                    start: location.start,
                    end: location.end
                },
                'Use Chainlink VRF, commit-reveal schemes, or other secure randomness solutions. Never rely on block variables for randomness.'
            );
        }

        // Check for keccak256 with weak inputs
        if (this.isWeakKeccak256(expression)) {
            const location = expression.loc;
            if (!location) return;

            this.addVulnerability(
                'HIGH',
                'Weak Randomness in Hash Function',
                'Using keccak256 with predictable inputs like block.timestamp for randomness.',
                {
                    start: location.start,
                    end: location.end
                },
                'Use Chainlink VRF or other secure randomness oracles. Hash functions with predictable inputs are not random.'
            );
        }
    }

    private containsWeakRandomness(node: any): boolean {
        if (!node) return false;

        // Check for block.timestamp
        if (node.type === 'MemberAccess' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'block' && 
            node.memberName === 'timestamp') {
            return true;
        }

        // Check for block.difficulty
        if (node.type === 'MemberAccess' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'block' && 
            node.memberName === 'difficulty') {
            return true;
        }

        // Check for block.number
        if (node.type === 'MemberAccess' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'block' && 
            node.memberName === 'number') {
            return true;
        }

        // Check for blockhash
        if (node.type === 'FunctionCall' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'blockhash') {
            return true;
        }

        // Check for now (alias for block.timestamp)
        if (node.type === 'Identifier' && node.name === 'now') {
            return true;
        }

        // Recursively check child nodes
        if (node.children) {
            return node.children.some((child: any) => this.containsWeakRandomness(child));
        }

        // Check common expression types
        if (node.left && this.containsWeakRandomness(node.left)) return true;
        if (node.right && this.containsWeakRandomness(node.right)) return true;
        if (node.expression && this.containsWeakRandomness(node.expression)) return true;
        if (node.arguments) {
            return node.arguments.some((arg: any) => this.containsWeakRandomness(arg));
        }

        return false;
    }

    private isWeakKeccak256(node: any): boolean {
        if (!node) return false;

        // Check for keccak256 function calls
        if (node.type === 'FunctionCall' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'keccak256') {
            
            // Check if any arguments contain weak randomness
            if (node.arguments) {
                return node.arguments.some((arg: any) => this.containsWeakRandomness(arg));
            }
        }

        // Check for abi.encodePacked with weak randomness
        if (node.type === 'FunctionCall' && 
            node.expression?.type === 'MemberAccess' && 
            node.expression.expression?.type === 'Identifier' && 
            node.expression.expression.name === 'abi' && 
            node.expression.memberName === 'encodePacked') {
            
            if (node.arguments) {
                return node.arguments.some((arg: any) => this.containsWeakRandomness(arg));
            }
        }

        // Recursively check child nodes
        if (node.children) {
            return node.children.some((child: any) => this.isWeakKeccak256(child));
        }

        // Check common expression types
        if (node.left && this.isWeakKeccak256(node.left)) return true;
        if (node.right && this.isWeakKeccak256(node.right)) return true;
        if (node.expression && this.isWeakKeccak256(node.expression)) return true;
        if (node.arguments) {
            return node.arguments.some((arg: any) => this.isWeakKeccak256(arg));
        }

        return false;
    }
} 
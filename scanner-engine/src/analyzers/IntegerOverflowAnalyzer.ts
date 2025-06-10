import { VulnerabilityAnalyzer } from './VulnerabilityAnalyzer';
import { VulnerabilityReport } from '../types/VulnerabilityReport';
import { Node, Statement, Expression } from '../types/SolidityTypes';

export class IntegerOverflowAnalyzer extends VulnerabilityAnalyzer {
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
        // Check for arithmetic operations
        if (expression.type === 'BinaryOperation') {
            const operator = expression.operator;
            if (['+', '-', '*', '/'].includes(operator)) {
                this.checkArithmeticOperation(expression);
            }
        }
    }

    private checkArithmeticOperation(expression: Expression) {
        const location = expression.loc;
        if (!location) return;

        // Check if SafeMath is not being used
        const isUsingSafeMath = this.isUsingSafeMath(expression);
        
        if (!isUsingSafeMath) {
            this.addVulnerability(
                'HIGH',
                'Potential Integer Overflow/Underflow',
                'Arithmetic operation without SafeMath could lead to integer overflow/underflow.',
                {
                    start: location.start,
                    end: location.end
                },
                'Use SafeMath library for arithmetic operations or upgrade to Solidity ^0.8.0 which has built-in overflow checks.'
            );
        }
    }

    private isUsingSafeMath(expression: Expression): boolean {
        // Check if the expression is using SafeMath library
        if (expression.type === 'FunctionCall' && 
            expression.expression?.type === 'MemberAccess') {
            const memberName = expression.expression.memberName;
            return ['add', 'sub', 'mul', 'div'].includes(memberName || '');
        }
        return false;
    }
} 
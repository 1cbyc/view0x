import { VulnerabilityAnalyzer } from './VulnerabilityAnalyzer';
import { VulnerabilityReport } from '../types/VulnerabilityReport';
import { Node, Statement, Expression } from '../types/SolidityTypes';

export class TxOriginAnalyzer extends VulnerabilityAnalyzer {
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
        // Check for tx.origin usage
        if (this.containsTxOrigin(expression)) {
            const location = expression.loc;
            if (!location) return;

            this.addVulnerability(
                'MEDIUM',
                'Dangerous tx.origin Usage',
                'Using tx.origin for authorization can be exploited by malicious contracts.',
                {
                    start: location.start,
                    end: location.end
                },
                'Use msg.sender instead of tx.origin for authorization checks. tx.origin refers to the EOA that initiated the transaction, not the immediate caller.'
            );
        }

        // Check for tx.origin in require statements
        if (expression.type === 'FunctionCall' && 
            expression.expression?.type === 'Identifier' &&
            expression.expression.name === 'require') {
            
            if (expression.arguments && expression.arguments.length > 0) {
                const condition = expression.arguments[0];
                if (this.containsTxOrigin(condition)) {
                    const location = expression.loc;
                    if (!location) return;

                    this.addVulnerability(
                        'HIGH',
                        'tx.origin in Authorization Check',
                        'Using tx.origin in require statements for authorization is highly dangerous.',
                        {
                            start: location.start,
                            end: location.end
                        },
                        'Replace tx.origin with msg.sender for proper authorization checks. Consider using OpenZeppelin AccessControl for complex permission systems.'
                    );
                }
            }
        }
    }

    private containsTxOrigin(node: any): boolean {
        if (!node) return false;

        // Check if this node is tx.origin
        if (node.type === 'MemberAccess' && 
            node.expression?.type === 'Identifier' && 
            node.expression.name === 'tx' && 
            node.memberName === 'origin') {
            return true;
        }

        // Recursively check child nodes
        if (node.children) {
            return node.children.some((child: any) => this.containsTxOrigin(child));
        }

        // Check common expression types
        if (node.left && this.containsTxOrigin(node.left)) return true;
        if (node.right && this.containsTxOrigin(node.right)) return true;
        if (node.expression && this.containsTxOrigin(node.expression)) return true;
        if (node.arguments) {
            return node.arguments.some((arg: any) => this.containsTxOrigin(arg));
        }

        return false;
    }
} 
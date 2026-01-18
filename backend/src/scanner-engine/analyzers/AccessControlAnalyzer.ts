import { VulnerabilityAnalyzer } from './VulnerabilityAnalyzer';
import { VulnerabilityReport } from '../types/VulnerabilityReport';
import { Node, Statement, Expression } from '../types/SolidityTypes';

export class AccessControlAnalyzer extends VulnerabilityAnalyzer {
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

        // Check if function has access control modifiers
        const hasAccessControl = this.hasAccessControlModifiers(func);
        
        // Check if function modifies state
        const modifiesState = this.functionModifiesState(func);

        if (modifiesState && !hasAccessControl) {
            this.addVulnerability(
                'HIGH',
                'Missing Access Control',
                'Function modifies state but lacks access control modifiers.',
                {
                    start: func.loc?.start || 0,
                    end: func.loc?.end || 0
                },
                'Add access control modifiers (e.g., onlyOwner, onlyRole) to restrict function access.'
            );
        }

        // Analyze function statements
        func.body.statements.forEach(statement => {
            this.analyzeStatement(statement);
        });
    }

    private hasAccessControlModifiers(func: Node): boolean {
        const modifiers = func.modifiers || [];
        const accessControlModifiers = [
            'onlyOwner',
            'onlyRole',
            'onlyAdmin',
            'onlyAuthorized',
            'authenticated',
            'restricted'
        ];

        return modifiers.some(mod => 
            accessControlModifiers.includes(mod.name?.toLowerCase() || '')
        );
    }

    private functionModifiesState(func: Node): boolean {
        if (!func.body?.statements) return false;

        let modifiesState = false;
        const checkStatement = (statement: Statement) => {
            if (this.isStateModification(statement)) {
                modifiesState = true;
            }
            if (statement.statements) {
                statement.statements.forEach(checkStatement);
            }
        };

        func.body.statements.forEach(checkStatement);
        return modifiesState;
    }

    private isStateModification(statement: Statement): boolean {
        if (statement.type === 'ExpressionStatement' && statement.expression) {
            return this.isStateModificationExpression(statement.expression);
        }
        return false;
    }

    private isStateModificationExpression(expression: Expression): boolean {
        // Check for state variable assignments
        if (expression.type === 'Assignment') {
            const left = expression.left;
            if (left?.type === 'MemberAccess') {
                // Check if it's a state variable (starts with this.)
                return left.expression?.type === 'Identifier' && 
                       left.expression.name === 'this';
            }
        }
        return false;
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
        // Check for direct state modifications
        if (this.isStateModificationExpression(expression)) {
            const location = expression.loc;
            if (!location) return;

            this.addWarning(
                'State Modification',
                'Direct state modification detected.',
                {
                    start: location.start,
                    end: location.end
                },
                'Consider adding access control checks before state modifications.'
            );
        }
    }
} 
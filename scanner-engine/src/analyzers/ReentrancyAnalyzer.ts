import { parse } from '@solidity-parser/parser';
import { VulnerabilityAnalyzer } from './VulnerabilityAnalyzer';
import { VulnerabilityReport } from '../types/VulnerabilityReport';
import { Contract, FunctionDefinition, Statement, Node } from '../types/SolidityTypes';

export class ReentrancyAnalyzer extends VulnerabilityAnalyzer {
    analyze(): VulnerabilityReport {
        this.contract.subNodes.forEach((node: Node) => {
            if (node.type === 'FunctionDefinition') {
                this.analyzeFunction(node as FunctionDefinition);
            }
        });
        return this.report;
    }

    private analyzeFunction(func: FunctionDefinition) {
        if (!func.body) return;

        const externalCalls: Statement[] = [];
        const stateChanges: Statement[] = [];

        // Find all external calls and state changes
        this.traverseStatements(func.body.statements, externalCalls, stateChanges);

        // Check for reentrancy vulnerability
        if (externalCalls.length > 0 && stateChanges.length > 0) {
            // Check if state changes happen after external calls
            const hasReentrancyRisk = this.checkReentrancyRisk(externalCalls, stateChanges);
            
            if (hasReentrancyRisk) {
                this.addVulnerability(
                    'HIGH',
                    'Potential Reentrancy Vulnerability',
                    'External calls are made before state changes, which could lead to reentrancy attacks.',
                    {
                        start: func.loc?.start || 0,
                        end: func.loc?.end || 0
                    },
                    'Consider using the checks-effects-interactions pattern. Update state before making external calls.'
                );
            }
        }
    }

    private traverseStatements(
        statements: Statement[],
        externalCalls: Statement[],
        stateChanges: Statement[]
    ) {
        statements.forEach(statement => {
            if (this.isExternalCall(statement)) {
                externalCalls.push(statement);
            } else if (this.isStateChange(statement)) {
                stateChanges.push(statement);
            }

            // Recursively check nested statements
            if (statement.statements) {
                this.traverseStatements(statement.statements, externalCalls, stateChanges);
            }
        });
    }

    private isExternalCall(statement: Statement): boolean {
        // Check for external calls like .call(), .transfer(), .send()
        if (statement.type === 'ExpressionStatement' && statement.expression) {
            const expr = statement.expression;
            
            // Check for .call(), .transfer(), .send()
            if (expr.type === 'FunctionCall' && expr.expression?.type === 'MemberAccess') {
                const memberName = expr.expression.memberName;
                if (['call', 'transfer', 'send'].includes(memberName || '')) {
                    return true;
                }
            }
            
            // Check for low-level calls
            if (expr.type === 'FunctionCall' && expr.expression?.type === 'Identifier') {
                const funcName = expr.expression.name;
                if (['call', 'delegatecall', 'staticcall'].includes(funcName || '')) {
                    return true;
                }
            }
        }
        return false;
    }

    private isStateChange(statement: Statement): boolean {
        if (statement.type === 'ExpressionStatement' && statement.expression) {
            const expr = statement.expression;
            
            // Check for direct assignments to state variables
            if (expr.type === 'Assignment') {
                const left = expr.left;
                if (this.isStateVariable(left)) {
                    return true;
                }
            }
            
            // Check for function calls that might modify state
            if (expr.type === 'FunctionCall') {
                return this.isStateModifyingFunction(expr);
            }
        }
        return false;
    }

    private isStateVariable(node: any): boolean {
        // Check if the node represents a state variable
        if (node.type === 'Identifier') {
            // Check if this identifier is a state variable
            return this.isStateVariableInContract(node.name);
        }
        
        if (node.type === 'MemberAccess') {
            // Check for this.variable patterns
            if (node.expression?.type === 'Identifier' && node.expression.name === 'this') {
                return true;
            }
        }
        
        return false;
    }

    private isStateVariableInContract(varName: string): boolean {
        // Check if the variable is declared as a state variable in the contract
        return this.contract.subNodes.some((node: Node) => {
            if (node.type === 'StateVariableDeclaration') {
                return node.variables.some((v: any) => v.name === varName);
            }
            return false;
        });
    }

    private isStateModifyingFunction(call: any): boolean {
        // Check for common state-modifying functions
        const stateModifyingFunctions = [
            'transfer', 'send', 'call', 'delegatecall', 'selfdestruct',
            'mint', 'burn', 'approve', 'transferFrom'
        ];
        
        if (call.expression?.type === 'Identifier') {
            return stateModifyingFunctions.includes(call.expression.name || '');
        }
        
        if (call.expression?.type === 'MemberAccess') {
            return stateModifyingFunctions.includes(call.expression.memberName || '');
        }
        
        return false;
    }

    private checkReentrancyRisk(
        externalCalls: Statement[],
        stateChanges: Statement[]
    ): boolean {
        // Check if any state change happens after an external call
        for (const stateChange of stateChanges) {
            for (const externalCall of externalCalls) {
                if (stateChange.loc && externalCall.loc &&
                    stateChange.loc.start > externalCall.loc.start) {
                    return true;
                }
            }
        }
        return false;
    }
} 
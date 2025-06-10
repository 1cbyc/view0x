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
        return statement.type === 'ExpressionStatement' &&
            statement.expression?.type === 'FunctionCall' &&
            statement.expression.expression?.type === 'MemberAccess' &&
            ['call', 'transfer', 'send'].includes(statement.expression.expression.memberName || '');
    }

    private isStateChange(statement: Statement): boolean {
        // Check for state variable modifications
        return statement.type === 'ExpressionStatement' &&
            statement.expression?.type === 'Assignment' &&
            statement.expression.left?.type === 'MemberAccess';
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
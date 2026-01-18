import { parse } from '@solidity-parser/parser';
import { Contract } from './types/SolidityTypes';
import { VulnerabilityReport } from './types/VulnerabilityReport';
import { ReentrancyAnalyzer } from './analyzers/ReentrancyAnalyzer';
import { IntegerOverflowAnalyzer } from './analyzers/IntegerOverflowAnalyzer';
import { AccessControlAnalyzer } from './analyzers/AccessControlAnalyzer';
import { TxOriginAnalyzer } from './analyzers/TxOriginAnalyzer';
import { WeakRandomnessAnalyzer } from './analyzers/WeakRandomnessAnalyzer';
import { VulnerabilityAnalyzer } from './analyzers/VulnerabilityAnalyzer';

export class ScannerEngine {
    private analyzers: VulnerabilityAnalyzer[] = [];

    constructor() {
        // Initialize all analyzers
        this.analyzers = [
            new ReentrancyAnalyzer(null as any),
            new IntegerOverflowAnalyzer(null as any),
            new AccessControlAnalyzer(null as any),
            new TxOriginAnalyzer(null as any),
            new WeakRandomnessAnalyzer(null as any)
        ];
    }

    async analyzeContract(sourceCode: string): Promise<VulnerabilityReport> {
        try {
            // Parse the Solidity code
            const ast = parse(sourceCode, { loc: true });
            
            // Find the main contract
            const contract = this.findMainContract(ast);
            if (!contract) {
                throw new Error('No contract found in the source code');
            }

            // Initialize analyzers with the contract
            this.analyzers.forEach(analyzer => {
                analyzer.contract = contract;
            });

            // Run all analyzers and combine their reports
            const reports = await Promise.all(
                this.analyzers.map(analyzer => analyzer.analyze())
            );

            // Combine all reports
            return this.combineReports(reports);
        } catch (error) {
            console.error('Error analyzing contract:', error);
            throw error;
        }
    }

    private findMainContract(ast: any): Contract | null {
        // Find the first contract definition in the AST
        for (const node of ast.children) {
            if (node.type === 'ContractDefinition') {
                return node as Contract;
            }
        }
        return null;
    }

    private combineReports(reports: VulnerabilityReport[]): VulnerabilityReport {
        return reports.reduce((combined, report) => ({
            vulnerabilities: [...combined.vulnerabilities, ...report.vulnerabilities],
            warnings: [...combined.warnings, ...report.warnings],
            suggestions: [...combined.suggestions, ...report.suggestions]
        }), {
            vulnerabilities: [],
            warnings: [],
            suggestions: []
        });
    }
} 
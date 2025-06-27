declare module 'scanner-engine' {
  export interface VulnerabilityReport {
    vulnerabilities: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      lineNumber?: number;
      recommendation?: string;
    }>;
    gasOptimizations: Array<{
      type: string;
      description: string;
      lineNumber?: number;
      potentialSavings?: string;
      recommendation?: string;
    }>;
    codeQuality: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      lineNumber?: number;
      recommendation?: string;
    }>;
    overallScore: number;
  }

  export interface AnalysisOptions {
    includeWarnings?: boolean;
    includeSuggestions?: boolean;
    severity?: 'high' | 'medium' | 'low' | 'all';
  }

  export class ScannerEngine {
    constructor();
    analyzeContract(contractCode: string, options?: AnalysisOptions): Promise<VulnerabilityReport>;
  }
} 
declare module 'scanner-engine' {
  export interface Vulnerability {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    location: {
      start: number;
      end: number;
    };
    recommendation: string;
  }

  export interface Warning {
    title: string;
    description: string;
    location: {
      start: number;
      end: number;
    };
    recommendation: string;
  }

  export interface Suggestion {
    title: string;
    description: string;
    location: {
      start: number;
      end: number;
    };
    recommendation: string;
  }

  export interface VulnerabilityReport {
    vulnerabilities: Vulnerability[];
    warnings: Warning[];
    suggestions: Suggestion[];
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
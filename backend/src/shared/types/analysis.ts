// Shared TypeScript interfaces for analysis system
export interface Vulnerability {
  id?: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  location: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  recommendation: string;
  source: 'slither' | 'solhint' | 'mythx' | 'custom';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  cweId?: number;
}

export interface GasOptimization {
  id?: string;
  type: string;
  title: string;
  description: string;
  location: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  potentialSavings: string;
  recommendation: string;
  estimatedGasSaved?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CodeQualityIssue {
  id?: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  location: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  recommendation: string;
  category: 'style' | 'naming' | 'complexity' | 'documentation' | 'best-practice';
}

export interface AnalysisOptions {
  includeGasOptimization?: boolean;
  includeCodeQuality?: boolean;
  severityFilter?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  toolsToUse?: ('slither' | 'solhint' | 'mythx')[];
  timeout?: number; // in seconds
  customRules?: string[];
}

export interface ContractInfo {
  name?: string;
  code: string;
  language: 'solidity';
  version?: string;
  size: number; // in bytes
  lineCount: number;
  functionCount?: number;
  complexity?: number;
}

export interface AnalysisSummary {
  totalVulnerabilities: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  gasOptimizations: number;
  codeQualityIssues: number;
  overallScore: number; // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AnalysisMetadata {
  analysisTime: number; // in milliseconds
  toolsUsed: string[];
  contractStats: {
    lines: number;
    functions: number;
    complexity: number;
    imports: number;
  };
  timestamp: string;
  version: string;
  cacheHit: boolean;
}

export interface AnalysisResult {
  id: string;
  summary: AnalysisSummary;
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  codeQuality: CodeQualityIssue[];
  metadata: AnalysisMetadata;
  contractInfo: ContractInfo;
}

export interface AnalysisJob {
  id: string;
  userId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  contractInfo: ContractInfo;
  options: AnalysisOptions;
  result?: AnalysisResult;
  error?: string;
  estimatedTime?: number; // in seconds
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// WebSocket event types
export interface AnalysisProgressEvent {
  jobId: string;
  status: AnalysisJob['status'];
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

export interface AnalysisCompletedEvent {
  jobId: string;
  result: AnalysisResult;
}

export interface AnalysisFailedEvent {
  jobId: string;
  error: string;
  details?: any;
}

// API Request/Response types
export interface CreateAnalysisRequest {
  contractCode: string;
  contractName?: string;
  options?: AnalysisOptions;
}

export interface CreateAnalysisResponse {
  jobId: string;
  status: 'queued';
  estimatedTime: number;
}

export interface GetAnalysisResponse {
  job: AnalysisJob;
}

export interface AnalysisHistoryItem {
  id: string;
  contractName?: string;
  status: AnalysisJob['status'];
  summary?: AnalysisSummary;
  createdAt: string;
  completedAt?: string;
}

export interface GetAnalysisHistoryResponse {
  analyses: AnalysisHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Report generation types
export interface ReportOptions {
  format: 'pdf' | 'html' | 'json' | 'csv';
  includeCode?: boolean;
  includeSummaryOnly?: boolean;
  severityFilter?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  sections?: ('vulnerabilities' | 'gas' | 'quality')[];
}

export interface GenerateReportRequest {
  analysisId: string;
  options: ReportOptions;
}

export interface GenerateReportResponse {
  reportId: string;
  downloadUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  estimatedTime?: number;
}

// Analysis statistics for dashboard
export interface AnalysisStats {
  totalAnalyses: number;
  completedAnalyses: number;
  averageProcessingTime: number;
  mostCommonVulnerabilities: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  severityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  trendsOverTime: Array<{
    date: string;
    count: number;
    averageScore: number;
  }>;
}

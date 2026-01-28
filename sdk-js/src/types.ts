export interface View0xConfig {
    apiKey: string;
    baseURL?: string;
    timeout?: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    company?: string;
}

export interface AnalysisOptions {
    contractCode: string;
    contractName?: string;
    options?: Record<string, any>;
}

export interface Analysis {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    contractCode: string;
    contractName?: string;
    vulnerabilities?: Vulnerability[];
    gasReport?: GasReport;
    createdAt: string;
    completedAt?: string;
    error?: string;
}

export interface Vulnerability {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
    title: string;
    description: string;
    location?: {
        file?: string;
        line?: number;
        column?: number;
    };
    recommendation?: string;
}

export interface GasReport {
    totalGas?: number;
    functions?: Array<{
        name: string;
        gas: number;
    }>;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface AnalysisHistory {
    analyses: Analysis[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    isActive: boolean;
    createdAt: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface RepositoryAnalysisOptions {
    repositoryUrl: string;
    branch?: string;
    token?: string;
    platform?: 'github' | 'gitlab';
}

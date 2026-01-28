import axios, { AxiosInstance, AxiosError } from 'axios';
import {
    View0xConfig,
    LoginCredentials,
    RegisterData,
    AnalysisOptions,
    Analysis,
    AnalysisHistory,
    PaginationParams,
    Webhook,
    ApiResponse,
    RepositoryAnalysisOptions,
} from './types';

export class View0xSDK {
    private client: AxiosInstance;
    private apiKey: string;

    constructor(config: View0xConfig) {
        this.apiKey = config.apiKey;

        this.client = axios.create({
            baseURL: config.baseURL || 'https://api.view0x.com',
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
        });

        // Response interceptor for consistent error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError<ApiResponse>) => {
                if (error.response?.data) {
                    throw new Error(error.response.data.error || error.response.data.message || 'API Error');
                }
                throw new Error(error.message || 'Network Error');
            }
        );
    }

    /**
     * Authentication Methods
     */

    async login(credentials: LoginCredentials): Promise<{ token: string; user: any }> {
        const response = await this.client.post<ApiResponse<{ token: string; user: any }>>(
            '/auth/login',
            credentials
        );
        return response.data.data!;
    }

    async register(userData: RegisterData): Promise<{ token: string; user: any }> {
        const response = await this.client.post<ApiResponse<{ token: string; user: any }>>(
            '/auth/register',
            userData
        );
        return response.data.data!;
    }

    async getCurrentUser(): Promise<any> {
        const response = await this.client.get<ApiResponse>('/auth/me');
        return response.data.data;
    }

    /**
     * Analysis Methods
     */

    async createAnalysis(options: AnalysisOptions): Promise<Analysis> {
        const response = await this.client.post<ApiResponse<Analysis>>('/analysis', options);
        return response.data.data!;
    }

    async getAnalysis(analysisId: string): Promise<Analysis> {
        const response = await this.client.get<ApiResponse<Analysis>>(`/analysis/${analysisId}`);
        return response.data.data!;
    }

    async getAnalysisHistory(params?: PaginationParams): Promise<AnalysisHistory> {
        const response = await this.client.get<ApiResponse<AnalysisHistory>>('/analysis', { params });
        return response.data.data!;
    }

    async generateReport(analysisId: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob> {
        const response = await this.client.post(
            `/analysis/${analysisId}/report`,
            { format },
            { responseType: 'blob' }
        );
        return response.data;
    }

    async shareAnalysis(analysisId: string): Promise<{ shareToken: string; shareUrl: string }> {
        const response = await this.client.post<ApiResponse<{ shareToken: string; shareUrl: string }>>(
            `/analysis/${analysisId}/share`
        );
        return response.data.data!;
    }

    async revokeShare(analysisId: string): Promise<void> {
        await this.client.delete(`/analysis/${analysisId}/share`);
    }

    /**
     * Repository Analysis Methods
     */

    async analyzeGitHubRepository(options: RepositoryAnalysisOptions): Promise<Analysis[]> {
        const response = await this.client.post<ApiResponse<{ analyses: Analysis[] }>>(
            '/repository/github',
            options
        );
        return response.data.data!.analyses;
    }

    async analyzeGitLabRepository(options: RepositoryAnalysisOptions): Promise<Analysis[]> {
        const response = await this.client.post<ApiResponse<{ analyses: Analysis[] }>>(
            '/repository/gitlab',
            options
        );
        return response.data.data!.analyses;
    }

    async analyzeRepository(options: RepositoryAnalysisOptions): Promise<Analysis[]> {
        const response = await this.client.post<ApiResponse<{ analyses: Analysis[] }>>(
            '/repository/analyze',
            options
        );
        return response.data.data!.analyses;
    }

    /**
     * Webhook Methods
     */

    async createWebhook(url: string, events: string[], secret?: string): Promise<Webhook> {
        const response = await this.client.post<ApiResponse<Webhook>>('/webhooks', {
            url,
            events,
            secret,
        });
        return response.data.data!;
    }

    async getWebhooks(): Promise<Webhook[]> {
        const response = await this.client.get<ApiResponse<Webhook[]>>('/webhooks');
        return response.data.data!;
    }

    async updateWebhook(
        id: string,
        url: string,
        events: string[],
        secret?: string,
        isActive?: boolean
    ): Promise<Webhook> {
        const response = await this.client.put<ApiResponse<Webhook>>(`/webhooks/${id}`, {
            url,
            events,
            secret,
            isActive,
        });
        return response.data.data!;
    }

    async deleteWebhook(id: string): Promise<void> {
        await this.client.delete(`/webhooks/${id}`);
    }

    async testWebhook(id: string): Promise<void> {
        await this.client.post(`/webhooks/${id}/test`);
    }

    /**
     * Analytics Methods
     */

    async getAnalyticsDashboard(params?: {
        startDate?: string;
        endDate?: string;
        dateRange?: string;
    }): Promise<any> {
        const response = await this.client.get<ApiResponse>('/analytics/dashboard', { params });
        return response.data.data;
    }

    async getEndpointAnalytics(endpoint: string): Promise<any> {
        const response = await this.client.get<ApiResponse>('/analytics/endpoint', {
            params: { endpoint },
        });
        return response.data.data;
    }

    async exportAnalytics(format: 'csv' | 'json' = 'json'): Promise<Blob> {
        const response = await this.client.get('/analytics/export', {
            params: { format },
            responseType: 'blob',
        });
        return response.data;
    }
}

export * from './types';
export default View0xSDK;

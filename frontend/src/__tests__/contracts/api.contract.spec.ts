import { Pact } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

// Consumer test for view0x frontend
const provider = new Pact({
    consumer: 'view0x-frontend',
    provider: 'view0x-backend',
    port: 9000,
    log: path.resolve(process.cwd(), 'pact/logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pact/pacts'),
    logLevel: 'info',
});

describe('view0x API Contract Tests', () => {
    beforeAll(() => provider.setup());
    afterEach(() => provider.verify());
    afterAll(() => provider.finalize());

    describe('Analysis API', () => {
        it('should create a new analysis job', async () => {
            await provider.addInteraction({
                state: 'user is authenticated',
                uponReceiving: 'a request to create an analysis',
                withRequest: {
                    method: 'POST',
                    path: '/api/analysis',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer valid-token',
                    },
                    body: {
                        contractCode: 'pragma solidity ^0.8.0; contract Test {}',
                    },
                },
                willRespondWith: {
                    status: 201,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        data: {
                            id: '123e4567-e89b-12d3-a456-426614174000',
                            status: 'pending',
                            contractCode: 'pragma solidity ^0.8.0; contract Test {}',
                            createdAt: '2024-01-01T00:00:00.000Z',
                        },
                    },
                },
            });

            const response = await axios.post(
                'http://localhost:9000/api/analysis',
                {
                    contractCode: 'pragma solidity ^0.8.0; contract Test {}',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer valid-token',
                    },
                }
            );

            expect(response.status).toBe(201);
            expect(response.data.success).toBe(true);
            expect(response.data.data).toHaveProperty('id');
            expect(response.data.data.status).toBe('pending');
        });

        it('should get analysis results', async () => {
            await provider.addInteraction({
                state: 'analysis exists with id 123',
                uponReceiving: 'a request to get analysis results',
                withRequest: {
                    method: 'GET',
                    path: '/api/analysis/123e4567-e89b-12d3-a456-426614174000',
                    headers: {
                        Authorization: 'Bearer valid-token',
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        data: {
                            id: '123e4567-e89b-12d3-a456-426614174000',
                            status: 'completed',
                            vulnerabilities: [],
                            gasReport: {},
                            createdAt: '2024-01-01T00:00:00.000Z',
                            completedAt: '2024-01-01T00:00:10.000Z',
                        },
                    },
                },
            });

            const response = await axios.get(
                'http://localhost:9000/api/analysis/123e4567-e89b-12d3-a456-426614174000',
                {
                    headers: {
                        Authorization: 'Bearer valid-token',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.status).toBe('completed');
        });
    });

    describe('Auth API', () => {
        it('should login with valid credentials', async () => {
            await provider.addInteraction({
                state: 'user exists with email test@example.com',
                uponReceiving: 'a login request with valid credentials',
                withRequest: {
                    method: 'POST',
                    path: '/api/auth/login',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        email: 'test@example.com',
                        password: 'ValidPassword123!',
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        data: {
                            token: 'jwt-token-string',
                            user: {
                                id: '123e4567-e89b-12d3-a456-426614174000',
                                email: 'test@example.com',
                                username: 'testuser',
                            },
                        },
                    },
                },
            });

            const response = await axios.post('http://localhost:9000/api/auth/login', {
                email: 'test@example.com',
                password: 'ValidPassword123!',
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data).toHaveProperty('token');
            expect(response.data.data.user.email).toBe('test@example.com');
        });
    });

    describe('Analytics API', () => {
        it('should get analytics dashboard data', async () => {
            await provider.addInteraction({
                state: 'user is authenticated',
                uponReceiving: 'a request for analytics dashboard',
                withRequest: {
                    method: 'GET',
                    path: '/api/analytics/dashboard',
                    headers: {
                        Authorization: 'Bearer valid-token',
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        data: {
                            summary: {
                                totalRequests: 1000,
                                errorCount: 10,
                                errorRate: 1.0,
                                avgResponseTime: 120,
                            },
                            requestsByStatus: [],
                            requestsByEndpoint: [],
                            requestsOverTime: [],
                        },
                    },
                },
            });

            const response = await axios.get(
                'http://localhost:9000/api/analytics/dashboard',
                {
                    headers: {
                        Authorization: 'Bearer valid-token',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.summary).toHaveProperty('totalRequests');
        });
    });
});

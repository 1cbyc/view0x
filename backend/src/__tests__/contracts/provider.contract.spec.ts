import "../setup";
import { Verifier } from '@pact-foundation/pact';
import path from 'path';

jest.mock('../../config/database', () => {
    const mockSequelize = {
        define: jest.fn(),
        transaction: jest.fn((callback) => callback({})),
        authenticate: jest.fn().mockResolvedValue(true),
        sync: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(true),
    };

    return {
        sequelize: mockSequelize,
        cacheRedis: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
            disconnect: jest.fn(),
        },
        redis: {
            ping: jest.fn().mockResolvedValue('PONG'),
            disconnect: jest.fn(),
            on: jest.fn(),
        },
        bullQueueClient: {
            disconnect: jest.fn(),
        },
        bullQueueSubscriber: {
            disconnect: jest.fn(),
        },
        initializeConnections: jest.fn().mockResolvedValue(true),
        getConnectionHealth: jest.fn().mockResolvedValue({
            database: { status: 'up', responseTime: 1 },
            redis: { status: 'up', responseTime: 1 },
            cache: { status: 'up', responseTime: 1 },
        }),
    };
});

import { app } from '../../app';
import { Server } from 'http';

let server: Server;
const PORT = 9001;

describe('Pact Provider Verification', () => {
    beforeAll((done) => {
        server = app.listen(PORT, () => {
            console.log(`Provider service running on port ${PORT}`);
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should validate the expectations of the frontend consumer', async () => {
        const opts = {
            provider: 'view0x-backend',
            providerBaseUrl: `http://localhost:${PORT}`,
            pactUrls: [
                path.resolve(
                    process.cwd(),
                    '../frontend/pact/pacts/view0x-frontend-view0x-backend.json'
                ),
            ],
            stateHandlers: {
                'user is authenticated': async () => {
                    // Setup: Create test user and generate token
                    return Promise.resolve({});
                },
                'analysis exists with id 123': async () => {
                    // Setup: Create test analysis record
                    return Promise.resolve({});
                },
                'user exists with email test@example.com': async () => {
                    // Setup: Create test user
                    return Promise.resolve({});
                },
            },
            requestFilter: (req: any, res: any, next: any) => {
                // Modify requests as needed before verification
                // e.g., inject auth tokens
                if (req.headers.authorization === 'Bearer valid-token') {
                    // Add test user to request
                    (req as any).user = {
                        userId: '123e4567-e89b-12d3-a456-426614174000',
                        email: 'test@example.com',
                    };
                }
                next();
            },
            logLevel: 'info' as any,
        };

        const verifier = new Verifier(opts as any);
        await verifier.verifyProvider();
    });
});

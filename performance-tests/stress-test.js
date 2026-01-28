import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const publicAnalysisDuration = new Trend('public_analysis_duration');

// Test configuration
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 100 },  // Ramp up to 100 users (stress)
        { duration: '2m', target: 50 },   // Ramp down to 50 users
        { duration: '1m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1000ms
        'errors': ['rate<0.01'], // Error rate < 1%
        'http_req_failed': ['rate<0.01'], // HTTP failure rate < 1%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// Sample contract code for testing
const SAMPLE_CONTRACT = `pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public value;
    
    function setValue(uint256 _value) public {
        value = _value;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`;

export default function () {
    // Test 1: Health Check
    const healthCheck = http.get(`${BASE_URL}/health`);
    check(healthCheck, {
        'health check status is 200': (r) => r.status === 200,
        'health check is healthy': (r) => {
            const body = JSON.parse(r.body);
            return body.status === 'healthy';
        },
    });
    errorRate.add(healthCheck.status !== 200);
    sleep(1);

    // Test 2: Public Analysis (most common endpoint)
    const publicAnalysisStart = Date.now();
    const publicAnalysis = http.post(
        `${BASE_URL}/api/analysis/public`,
        JSON.stringify({
            contractCode: SAMPLE_CONTRACT,
        }),
        {
            headers: { 'Content-Type': 'application/json' },
        }
    );

    const publicAnalysisTime = Date.now() - publicAnalysisStart;
    publicAnalysisDuration.add(publicAnalysisTime);

    check(publicAnalysis, {
        'public analysis status is 200': (r) => r.status === 200,
        'public analysis returns success': (r) => {
            const body = JSON.parse(r.body);
            return body.success === true;
        },
        'public analysis has vulnerabilities array': (r) => {
            const body = JSON.parse(r.body);
            return Array.isArray(body.data?.vulnerabilities);
        },
    });
    errorRate.add(publicAnalysis.status !== 200);
    sleep(2);

    // Test 3: API Documentation
    const apiDocs = http.get(`${BASE_URL}/api-docs.json`);
    check(apiDocs, {
        'api docs status is 200': (r) => r.status === 200,
        'api docs is valid JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                return false;
            }
        },
    });
    errorRate.add(apiDocs.status !== 200);
    sleep(1);

    // Test 4: Rate Limit Testing (hitting same endpoint multiple times)
    for (let i = 0; i < 3; i++) {
        const rateLimitTest = http.get(`${BASE_URL}/health`);
        check(rateLimitTest, {
            'rate limit test returns valid response': (r) => r.status === 200 || r.status === 429,
        });

        if (rateLimitTest.status === 429) {
            console.log('Rate limit hit - this is expected behavior');
        }
        sleep(0.1);
    }

    sleep(1);
}

// Setup function - runs once at start
export function setup() {
    console.log('Starting stress test...');
    console.log(`Target URL: ${BASE_URL}`);
    return { timestamp: Date.now() };
}

// Teardown function - runs once at end
export function teardown(data) {
    console.log('Stress test completed');
    console.log(`Test duration: ${(Date.now() - data.timestamp) / 1000}s`);
}

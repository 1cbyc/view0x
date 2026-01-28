# Performance Testing for view0x

This directory contains performance testing scripts for load testing and stress testing the view0x API.

## Prerequisites

### Artillery (Load Testing)
```bash
npm install -g artillery
```

### k6 (Stress Testing)
```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Running Tests

### Load Testing with Artillery

Artillery simulates realistic user traffic patterns.

```bash
# Run load test
cd performance-tests
artillery run load-test.yml

# Run with custom duration
artillery run --duration 300 load-test.yml

# Generate HTML report
artillery run --output report.json load-test.yml
artillery report report.json
```

**Expected Results:**
- **Response Time**: p95 < 500ms, p99 < 1000ms
- **Error Rate**: < 1%
- **Throughput**: 10-20 requests/second sustained

### Stress Testing with k6

k6 gradually increases load to identify breaking points.

```bash
# Run stress test
cd performance-tests
k6 run stress-test.js

# Run with custom environment
API_URL=https://api.view0x.com k6 run stress-test.js

# Generate summary report
k6 run --summary-export=summary.json stress-test.js
```

**Expected Results:**
- **Virtual Users**: Handles 100+ concurrent users
- **Response Time**: p95 < 500ms under normal load (10-50 users)
- **Error Rate**: < 1%
- **Database Connections**: No connection pool exhaustion

## Performance Benchmarks

### API Endpoints

| Endpoint | Expected p95 | Expected p99 | Notes |
|----------|--------------|--------------|-------|
| GET /health | < 50ms | < 100ms | Simple health check |
| POST /api/analysis/public | < 300ms | < 500ms | Quick synchronous scan |
| GET /api/analysis | < 200ms | < 400ms | Database query with pagination |
| GET /api/analysis/:id | < 150ms | < 300ms | Single record fetch |

### System Resources

- **CPU Usage**: < 70% under peak load
- **Memory Usage**: < 80% of available RAM
- **Database Connections**: < 80% of pool size
- **Redis Connections**: < 50 concurrent connections

## Interpreting Results

### Artillery Output
```
All virtual users finished
Summary report @ 22:00:00
  Scenarios launched:  600
  Scenarios completed: 600
  Requests completed:  2400
  Mean response/sec: 10
  Response time (msec):
    min: 50
    max: 800
    median: 120
    p95: 300
    p99: 500
  Scenario counts:
    Public Analysis Flow: 300
    Health Check: 120
    authenticated Analysis Flow: 120
    API Documentation: 60
  Codes:
    200: 2380
    202: 20
```

### k6 Output
```
     ✓ health check status is 200
     ✓ public analysis status is 200
     ✓ public analysis returns success

     checks.........................: 100.00% ✓ 15000  ✗ 0
     data_received..................: 45 MB   150 kB/s
     data_sent......................: 15 MB   50 kB/s
     http_req_duration..............: avg=120ms min=50ms med=100ms max=800ms p(95)=300ms p(99)=500ms
     http_reqs......................: 5000    16.67/s
     iterations.....................: 1000    3.33/s
```

## Performance Optimization Tips

If tests fail to meet benchmarks:

1. **Database Query Optimization**
   - Add indexes for frequently queried fields
   - Use database query explain plans
   - Implement query result caching

2. **Connection Pooling**
   - Increase PostgreSQL connection pool size
   - Configure Redis connection pooling
   - Monitor connection pool utilization

3. **Caching Strategy**
   - Enable Redis caching for public endpoints
   - Implement cache invalidation strategy
   - Use CDN for static assets

4. **Code Optimization**
   - Profile slow endpoints with profiling tools
   - Optimize N+1 queries
   - Reduce unnecessary data serialization

5. **Horizontal Scaling**
   - Deploy multiple backend instances
   - Use load balancer (nginx, HAProxy)
   - Implement session affinity if needed

## Continuous Performance Testing

Add performance tests to CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run k6 test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: performance-tests/stress-test.js
          cloud: true
          token: ${{ secrets.K6_CLOUD_TOKEN }}
```

## Monitoring in Production

Use these tools for ongoing performance monitoring:

- **Application Performance Monitoring (APM)**: New Relic, DataDog, etc.
- **Database Monitoring**: PostgreSQL pg_stat_statements
- **Redis Monitoring**: Redis INFO command, RedisInsight
- **Infrastructure Monitoring**: Prometheus + Grafana

## Troubleshooting

### High Response Times
- Check database query performance
- Review application logs for errors
- Monitor CPU and memory usage
- Check network latency

### High Error Rates
- Review error logs for patterns
- Check rate limiting configuration
- Verify database connection stability
- Monitor memory leaks

### Connection Pool Exhaustion
- Increase pool size in configuration
- Check for connection leaks
- Reduce query timeout values
- Implement connection retry logic

## Contact

For performance issues or questions, open an issue on GitHub.

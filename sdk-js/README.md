# view0x JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for [view0x](https://view0x.com) - Smart Contract Security Analysis Platform.

## Installation

```bash
npm install view0x
# or
yarn add view0x
# or
pnpm add view0x
```

## Quick Start

```typescript
import { View0xSDK } from 'view0x';

// Initialize the SDK with your API key
const client = new View0xSDK({
  apiKey: 'your-api-key-here',
  // baseURL: 'https://api.view0x.com', // Optional: custom API URL
  // timeout: 30000, // Optional: request timeout in ms
});

// Create an analysis
const analysis = await client.createAnalysis({
  contractCode: `
    pragma solidity ^0.8.0;
    contract MyContract {
      // Your contract code
    }
  `,
  contractName: 'MyContract',
});

console.log('Analysis ID:', analysis.id);
console.log('Status:', analysis.status);

// Get analysis results
const result = await client.getAnalysis(analysis.id);
console.log('Vulnerabilities found:', result.vulnerabilities?.length);
```

## Features

- Full TypeScript support with type definitions
- Promise-based API
- Automatic authentication handling
- Comprehensive error handling
- Support for all view0x API endpoints
- Repository analysis (GitHub/GitLab)
- Webhook management
- Analytics and reporting
- Zero hardcoded values - fully configurable

## API Reference

### Authentication

```typescript
// Login
const { token, user } = await client.login({
  email: 'user@example.com',
  password: 'password',
});

// Register
const { token, user } = await client.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword',
  company: 'My Company', // optional
});

// Get current user
const user = await client.getCurrentUser();
```

### Analysis

```typescript
// Create analysis
const analysis = await client.createAnalysis({
  contractCode: solidityCode,
  contractName: 'MyContract', // optional
  options: {}, // optional
});

// Get analysis by ID
const analysis = await client.getAnalysis('analysis-id');

// Get analysis history with pagination
const history = await client.getAnalysisHistory({
  page: 1,
  limit: 10,
  search: 'MyContract', // optional
  sortBy: 'createdAt', // optional
  sortOrder: 'DESC', // optional
});

// Generate report
const pdfBlob = await client.generateReport('analysis-id', 'pdf');
// Save to file or download

// Share analysis
const { shareToken, shareUrl } = await client.shareAnalysis('analysis-id');

// Revoke share
await client.revokeShare('analysis-id');
```

### Repository Analysis

```typescript
// Analyze GitHub repository
const analyses = await client.analyzeGitHubRepository({
  repositoryUrl: 'https://github.com/user/repo',
  branch: 'main', // optional
  token: 'github-token', // optional, for private repos
});

// Analyze GitLab repository
const analyses = await client.analyzeGitLabRepository({
  repositoryUrl: 'https://gitlab.com/user/repo',
  branch: 'main', // optional
  token: 'gitlab-token', // optional, for private repos
});

// Auto-detect platform
const analyses = await client.analyzeRepository({
  repositoryUrl: 'https://github.com/user/repo',
});
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.createWebhook(
  'https://myapp.com/webhook',
  ['analysis.completed', 'analysis.failed'],
  'webhook-secret' // optional
);

// Get all webhooks
const webhooks = await client.getWebhooks();

// Update webhook
const updated = await client.updateWebhook(
  'webhook-id',
  'https://myapp.com/new-webhook',
  ['analysis.completed'],
  'new-secret',
  true // isActive
);

// Delete webhook
await client.deleteWebhook('webhook-id');

// Test webhook
await client.testWebhook('webhook-id');
```

### Analytics

```typescript
// Get analytics dashboard
const dashboard = await client.getAnalyticsDashboard({
  dateRange: '7d', // optional: 7d, 30d, 90d
  startDate: '2024-01-01', // optional
  endDate: '2024-01-31', // optional
});

// Get endpoint-specific analytics
const endpointStats = await client.getEndpointAnalytics('/api/analysis');

// Export analytics
const csvBlob = await client.exportAnalytics('csv');
const jsonBlob = await client.exportAnalytics('json');
```

## Error Handling

```typescript
try {
  const analysis = await client.createAnalysis({
    contractCode: code,
  });
} catch (error) {
  console.error('Analysis failed:', error.message);
}
```

## Environment Configuration

The SDK respects environment variables:

```bash
# Use custom API URL
export VIEW0X_API_URL=https://api.view0x.com

# Set default timeout
export VIEW0X_TIMEOUT=30000
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { View0xSDK, Analysis, Vulnerability } from 'view0x';

const client = new View0xSDK({ apiKey: 'key' });

const analysis: Analysis = await client.getAnalysis('id');
const vulnerabilities: Vulnerability[] = analysis.vulnerabilities || [];
```

## Contributing

See [CONTRIBUTING.md](https://github.com/1cbyc/view0x/blob/main/CONTRIBUTING.md)

## License

MIT © [Nsisong Labs](https://github.com/1cbyc)

## Links

- [Documentation](https://docs.view0x.com)
- [API Reference](https://api.view0x.com/docs)
- [GitHub](https://github.com/1cbyc/view0x)
- [Website](https://view0x.com)

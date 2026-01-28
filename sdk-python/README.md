# view0x Python SDK

Official Python SDK for [view0x](https://view0x.com) - Smart Contract Security Analysis Platform.

## Installation

```bash
pip install view0x
```

## Quick Start

```python
from view0x_sdk import View0xSDK, View0xConfig

# Initialize the SDK with your API key
config = View0xConfig(
    api_key="your-api-key-here",
    # base_url="https://api.view0x.com",  # Optional: custom API URL
    # timeout=30  # Optional: request timeout in seconds
)
client = View0xSDK(config)

# Create an analysis
analysis = client.create_analysis(
    contract_code="""
    pragma solidity ^0.8.0;
    contract MyContract {
      // Your contract code
    }
    """,
    contract_name="MyContract"
)

print(f"Analysis ID: {analysis['id']}")
print(f"Status: {analysis['status']}")

# Get analysis results
result = client.get_analysis(analysis['id'])
print(f"Vulnerabilities found: {len(result.get('vulnerabilities', []))}")
```

## Features

- Full Python 3.8+ support with type hints
- Comprehensive API coverage
- Automatic authentication handling
- Robust error handling
- Repository analysis (GitHub/GitLab)
- Webhook management
- Analytics and reporting
- Zero hardcoded values - fully configurable

## API Reference

### Authentication

```python
# Login
result = client.login(
    email="user@example.com",
    password="password"
)
token = result['token']
user = result['user']

# Register
result = client.register(
    name="John Doe",
    email="john@example.com",
    password="securepassword",
    company="My Company"  # optional
)

# Get current user
user = client.get_current_user()
```

### Analysis

```python
# Create analysis
analysis = client.create_analysis(
    contract_code=solidity_code,
    contract_name="MyContract",  # optional
    options={}  # optional
)

# Get analysis by ID
analysis = client.get_analysis("analysis-id")

# Get analysis history with pagination
history = client.get_analysis_history(
    page=1,
    limit=10,
   search="MyContract",  # optional
    sort_by="createdAt",  # optional
    sort_order="DESC"  # optional
)

# Generate report
pdf_bytes = client.generate_report("analysis-id", format="pdf")
# Save to file
with open("report.pdf", "wb") as f:
    f.write(pdf_bytes)

# Share analysis
share_info = client.share_analysis("analysis-id")
print(f"Share URL: {share_info['shareUrl']}")

# Revoke share
client.revoke_share("analysis-id")
```

### Repository Analysis

```python
# Analyze GitHub repository
analyses = client.analyze_github_repository(
    repository_url="https://github.com/user/repo",
    branch="main",  # optional
    token="github-token"  # optional, for private repos
)

# Analyze GitLab repository
analyses = client.analyze_gitlab_repository(
    repository_url="https://gitlab.com/user/repo",
    branch="main",  # optional
    token="gitlab-token"  # optional, for private repos
)

# Auto-detect platform
analyses = client.analyze_repository(
    repository_url="https://github.com/user/repo"
)
```

### Webhooks

```python
# Create webhook
webhook = client.create_webhook(
    url="https://myapp.com/webhook",
    events=["analysis.completed", "analysis.failed"],
    secret="webhook-secret"  # optional
)

# Get all webhooks
webhooks = client.get_webhooks()

# Update webhook
updated = client.update_webhook(
    webhook_id="webhook-id",
    url="https://myapp.com/new-webhook",
    events=["analysis.completed"],
    secret="new-secret",
    is_active=True
)

# Delete webhook
client.delete_webhook("webhook-id")

# Test webhook
client.test_webhook("webhook-id")
```

### Analytics

```python
# Get analytics dashboard
dashboard = client.get_analytics_dashboard(
    date_range="7d",  # optional: 7d, 30d, 90d
    start_date="2024-01-01",  # optional
    end_date="2024-01-31"  # optional
)

# Get endpoint-specific analytics
stats = client.get_endpoint_analytics("/api/analysis")

# Export analytics
csv_bytes = client.export_analytics(format="csv")
json_bytes = client.export_analytics(format="json")
```

## Error Handling

```python
try:
    analysis = client.create_analysis(contract_code=code)
except Exception as e:
    print(f"Analysis failed: {str(e)}")
```

## Environment Configuration

The SDK respects environment variables:

```bash
# Use custom API URL
export VIEW0X_API_URL=https://api.view0x.com

# Set default timeout
export VIEW0X_TIMEOUT=30
```

## Type Hints

The SDK includes type hints for better IDE support:

```python
from view0x_sdk import View0xSDK, View0xConfig
from typing import List, Dict, Any

config: View0xConfig = View0xConfig(api_key="key")
client: View0xSDK = View0xSDK(config)

analysis: Dict[str, Any] = client.get_analysis("id")
vulnerabilities: List[Dict[str, Any]] = analysis.get("vulnerabilities", [])
```

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black view0x_sdk

# Type checking
mypy view0x_sdk

# Linting
flake8 view0x_sdk
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

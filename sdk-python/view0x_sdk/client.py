from typing import Optional, List, Dict, Any
import requests
from dataclasses import dataclass


@dataclass
class View0xConfig:
    """Configuration for View0x SDK"""
    api_key: str
    base_url: str = "https://api.view0x.com"
    timeout: int = 30


class View0xSDK:
    """Official Python SDK for view0x Smart Contract Security Analysis Platform"""

    def __init__(self, config: View0xConfig):
        """
        Initialize the View0x SDK

        Args:
            config: View0xConfig object with API key and optional base_url and timeout
        """
        self.api_key = config.api_key
        self.base_url = config.base_url.rstrip('/')
        self.timeout = config.timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault('timeout', self.timeout)

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            data = response.json()

            if not data.get('success'):
                raise Exception(data.get('error') or data.get('message') or 'API Error')

            return data.get('data', {})
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")

    # Authentication Methods

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login to view0x

        Args:
            email: User email
            password: User password

        Returns:
            dict: Token and user information
        """
        return self._request('POST', '/auth/login', json={
            'email': email,
            'password': password
        })

    def register(self, name: str, email: str, password: str, company: Optional[str] = None) -> Dict[str, Any]:
        """
        Register a new user

        Args:
            name: User's full name
            email: User email
            password: User password  
            company: Optional company name

        Returns:
            dict: Token and user information
        """
        data = {
            'name': name,
            'email': email,
            'password': password
        }
        if company:
            data['company'] = company

        return self._request('POST', '/auth/register', json=data)

    def get_current_user(self) -> Dict[str, Any]:
        """Get currently authenticated user"""
        return self._request('GET', '/auth/me')

    # Analysis Methods

    def create_analysis(self, contract_code: str, contract_name: Optional[str] = None,
                       options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new contract analysis

        Args:
            contract_code: Solidity contract code
            contract_name: Optional contract name
            options: Optional analysis options

        Returns:
            dict: Analysis object with ID and status
        """
        data = {'contractCode': contract_code}
        if contract_name:
            data['contractName'] = contract_name
        if options:
            data['options'] = options

        return self._request('POST', '/analysis', json=data)

    def get_analysis(self, analysis_id: str) -> Dict[str, Any]:
        """
        Get analysis by ID

        Args:
            analysis_id: Analysis ID

        Returns:
            dict: Complete analysis with results
        """
        return self._request('GET', f'/analysis/{analysis_id}')

    def get_analysis_history(self, page: int = 1, limit: int = 10,
                            search: Optional[str] = None,
                            sort_by: Optional[str] = None,
                            sort_order: str = 'DESC') -> Dict[str, Any]:
        """
        Get analysis history with pagination

        Args:
            page: Page number
            limit: Items per page
            search: Optional search query
            sort_by: Optional sort field
            sort_order: Sort order (ASC or DESC)

        Returns:
            dict: Paginated analysis history
        """
        params = {
            'page': page,
            'limit': limit,
            'sortOrder': sort_order
        }
        if search:
            params['search'] = search
        if sort_by:
            params['sortBy'] = sort_by

        return self._request('GET', '/analysis', params=params)

    def generate_report(self, analysis_id: str, format: str = 'pdf') -> bytes:
        """
        Generate analysis report

        Args:
            analysis_id: Analysis ID
            format: Report format (pdf or json)

        Returns:
            bytes: Report file content
        """
        response = self.session.post(
            f"{self.base_url}/analysis/{analysis_id}/report",
            json={'format': format},
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.content

    def share_analysis(self, analysis_id: str) -> Dict[str, str]:
        """
        Create public share link for analysis

        Args:
            analysis_id: Analysis ID

        Returns:
            dict: Share token and URL
        """
        return self._request('POST', f'/analysis/{analysis_id}/share')

    def revoke_share(self, analysis_id: str) -> None:
        """
        Revoke public share link

        Args:
            analysis_id: Analysis ID
        """
        self._request('DELETE', f'/analysis/{analysis_id}/share')

    # Repository Analysis Methods

    def analyze_github_repository(self, repository_url: str, branch: Optional[str] = None,
                                  token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze GitHub repository

        Args:
            repository_url: GitHub repository URL
            branch: Optional branch name
            token: Optional GitHub access token for private repos

        Returns:
            list: List of created analyses
        """
        data = {'repositoryUrl': repository_url}
        if branch:
            data['branch'] = branch
        if token:
            data['token'] = token

        result = self._request('POST', '/repository/github', json=data)
        return result.get('analyses', [])

    def analyze_gitlab_repository(self, repository_url: str, branch: Optional[str] = None,
                                  token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze GitLab repository

        Args:
            repository_url: GitLab repository URL
            branch: Optional branch name
            token: Optional GitLab access token for private repos

        Returns:
            list: List of created analyses
        """
        data = {'repositoryUrl': repository_url}
        if branch:
            data['branch'] = branch
        if token:
            data['token'] = token

        result = self._request('POST', '/repository/gitlab', json=data)
        return result.get('analyses', [])

    def analyze_repository(self, repository_url: str, branch: Optional[str] = None,
                          token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Analyze repository (auto-detect GitHub/GitLab)

        Args:
            repository_url: Repository URL
            branch: Optional branch name
            token: Optional access token for private repos

        Returns:
            list: List of created analyses
        """
        data = {'repositoryUrl': repository_url}
        if branch:
            data['branch'] = branch
        if token:
            data['token'] = token

        result = self._request('POST', '/repository/analyze', json=data)
        return result.get('analyses', [])

    # Webhook Methods

    def create_webhook(self, url: str, events: List[str], secret: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a webhook

        Args:
            url: Webhook URL
            events: List of events to subscribe to
            secret: Optional webhook secret

        Returns:
            dict: Created webhook object
        """
        data = {'url': url, 'events': events}
        if secret:
            data['secret'] = secret

        return self._request('POST', '/webhooks', json=data)

    def get_webhooks(self) -> List[Dict[str, Any]]:
        """Get all webhooks"""
        return self._request('GET', '/webhooks')

    def update_webhook(self, webhook_id: str, url: str, events: List[str],
                      secret: Optional[str] = None, is_active: Optional[bool] = None) -> Dict[str, Any]:
        """
        Update webhook

        Args:
            webhook_id: Webhook ID
            url: Webhook URL
            events: List of events
            secret: Optional webhook secret
            is_active: Optional active status

        Returns:
            dict: Updated webhook object
        """
        data = {'url': url, 'events': events}
        if secret:
            data['secret'] = secret
        if is_active is not None:
            data['isActive'] = is_active

        return self._request('PUT', f'/webhooks/{webhook_id}', json=data)

    def delete_webhook(self, webhook_id: str) -> None:
        """Delete webhook"""
        self._request('DELETE', f'/webhooks/{webhook_id}')

    def test_webhook(self, webhook_id: str) -> None:
        """Trigger test webhook"""
        self._request('POST', f'/webhooks/{webhook_id}/test')

    # Analytics Methods

    def get_analytics_dashboard(self, date_range: Optional[str] = None,
                               start_date: Optional[str] = None,
                               end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get analytics dashboard data

        Args:
            date_range: Optional date range (7d, 30d, 90d)
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)

        Returns:
            dict: Analytics dashboard data
        """
        params = {}
        if date_range:
            params['dateRange'] = date_range
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date

        return self._request('GET', '/analytics/dashboard', params=params)

    def get_endpoint_analytics(self, endpoint: str) -> Dict[str, Any]:
        """
        Get endpoint-specific analytics

        Args:
            endpoint: API endpoint path

        Returns:
            dict: Endpoint analytics data
        """
        return self._request('GET', '/analytics/endpoint', params={'endpoint': endpoint})

    def export_analytics(self, format: str = 'json') -> bytes:
        """
        Export analytics data

        Args:
            format: Export format (csv or json)

        Returns:
            bytes: Exported data
        """
        response = self.session.get(
            f"{self.base_url}/analytics/export",
            params={'format': format},
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.content

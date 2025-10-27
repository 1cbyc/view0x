"""
Mythril Analyzer

Mythril is a security analysis tool for EVM bytecode.
It performs symbolic execution to find security vulnerabilities.
"""

import json
import logging
import os
import subprocess
import tempfile
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class MythrilAnalyzer:
    """Wrapper for Mythril symbolic execution analyzer"""

    def __init__(self):
        self.tool = 'mythril'
        self.available = self._check_availability()

    def _check_availability(self) -> bool:
        """Check if Mythril is installed and available"""
        try:
            result = subprocess.run(
                ['myth', 'version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info(f"Mythril available: {version}")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Mythril not available: {e}")
        return False

    def is_available(self) -> bool:
        """Check if Mythril is available"""
        return self.available

    def analyze(self, contract_code: str, contract_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze contract code using Mythril
        
        Args:
            contract_code: Solidity source code
            contract_name: Optional contract name
            
        Returns:
            Dictionary containing analysis results
        """
        if not self.available:
            logger.warning("Mythril not available, skipping analysis")
            return self._empty_result()

        try:
            # Write contract to temporary file
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.sol',
                delete=False
            ) as temp_file:
                temp_file.write(contract_code)
                temp_path = temp_file.name

            try:
                # Run Mythril analysis
                result = self._run_mythril(temp_path)
                return self._parse_results(result)
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            logger.error(f"Mythril analysis failed: {e}")
            return self._empty_result()

    def _run_mythril(self, contract_path: str) -> str:
        """
        Run Mythril on the contract file
        
        Args:
            contract_path: Path to contract file
            
        Returns:
            JSON output from Mythril
        """
        try:
            # Run Mythril with JSON output
            cmd = [
                'myth',
                'analyze',
                contract_path,
                '--solv', '0.8.0',  # Solidity version
                '--format', 'json',
                '--execution-timeout', '60',  # 60 second timeout
                '--max-depth', '10'  # Limit recursion depth
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute overall timeout
            )
            
            logger.info(f"Mythril exit code: {result.returncode}")
            
            if result.returncode != 0:
                logger.warning(f"Mythril error: {result.stderr}")
                return result.stdout or "{}"
            
            return result.stdout

        except subprocess.TimeoutExpired:
            logger.error("Mythril analysis timed out")
            return "{}"
        except Exception as e:
            logger.error(f"Mythril execution failed: {e}")
            return "{}"

    def _parse_results(self, output: str) -> Dict[str, Any]:
        """
        Parse Mythril JSON output into standard format
        
        Args:
            output: JSON output from Mythril
            
        Returns:
            Standardized analysis results
        """
        vulnerabilities = []
        warnings = []
        
        try:
            if not output or output == "{}":
                return self._empty_result()
            
            data = json.loads(output)
            
            # Parse detected issues
            for issue in data.get('issues', []):
                vuln = {
                    'type': issue.get('title', 'Unknown'),
                    'severity': self._map_severity(issue.get('severity', 'Medium')),
                    'description': issue.get('description', ''),
                    'lineNumber': issue.get('lineno', 0),
                    'recommendation': issue.get('code', ''),
                    'confidence': self._calculate_confidence(issue),
                    'function': issue.get('function', ''),
                    'contract': issue.get('contract', ''),
                }
                
                if vuln['severity'] in ['HIGH', 'CRITICAL']:
                    vulnerabilities.append(vuln)
                else:
                    warnings.append(vuln)
            
            return {
                'vulnerabilities': vulnerabilities,
                'warnings': warnings,
                'engine': 'mythril',
                'timestamp': self._current_timestamp(),
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Mythril JSON: {e}")
            return self._empty_result()

    def _map_severity(self, mythril_severity: str) -> str:
        """Map Mythril severity to standard format"""
        mapping = {
            'high': 'HIGH',
            'medium': 'MEDIUM',
            'low': 'LOW',
            'informational': 'INFO',
        }
        return mapping.get(mythril_severity.lower(), 'MEDIUM')

    def _calculate_confidence(self, issue: Dict) -> float:
        """Calculate confidence score for an issue"""
        # Mythril typically has high confidence due to symbolic execution
        base_confidence = 0.8
        
        # Adjust based on vulnerability type
        title = issue.get('title', '').lower()
        if 'reentrancy' in title:
            return 0.9
        elif 'integer' in title or 'overflow' in title:
            return 0.95
        elif 'access' in title or 'permission' in title:
            return 0.85
        
        return base_confidence

    def _current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            'vulnerabilities': [],
            'warnings': [],
            'engine': 'mythril',
            'timestamp': self._current_timestamp(),
            'error': 'Mythril not available or failed'
        }


# Export singleton instance
mythril_analyzer = MythrilAnalyzer()

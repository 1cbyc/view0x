"""
Semgrep Analyzer

Semgrep is a fast, lightweight static analysis tool.
It uses pattern matching to detect security vulnerabilities.
"""

import json
import logging
import os
import subprocess
import tempfile
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class SemgrepAnalyzer:
    """Wrapper for Semgrep pattern-based analyzer"""

    def __init__(self):
        self.tool = 'semgrep'
        self.rules_dir = os.path.join(
            os.path.dirname(__file__),
            '../../semgrep_rules'
        )
        self.available = self._check_availability()
        self._setup_rules()

    def _check_availability(self) -> bool:
        """Check if Semgrep is installed and available"""
        try:
            result = subprocess.run(
                ['semgrep', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info(f"Semgrep available: {version}")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Semgrep not available: {e}")
        return False

    def _setup_rules(self):
        """Setup Semgrep rules directory"""
        try:
            os.makedirs(self.rules_dir, exist_ok=True)
            logger.info(f"Semgrep rules directory: {self.rules_dir}")
        except Exception as e:
            logger.warning(f"Failed to setup rules directory: {e}")

    def is_available(self) -> bool:
        """Check if Semgrep is available"""
        return self.available

    def analyze(self, contract_code: str, contract_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze contract code using Semgrep
        
        Args:
            contract_code: Solidity source code
            contract_name: Optional contract name
            
        Returns:
            Dictionary containing analysis results
        """
        if not self.available:
            logger.warning("Semgrep not available, skipping analysis")
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
                # Run Semgrep analysis
                result = self._run_semgrep(temp_path)
                return self._parse_results(result)
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            logger.error(f"Semgrep analysis failed: {e}")
            return self._empty_result()

    def _run_semgrep(self, contract_path: str) -> str:
        """
        Run Semgrep on the contract file
        
        Args:
            contract_path: Path to contract file
            
        Returns:
            JSON output from Semgrep
        """
        try:
            # Use solidity rules from semgrep-rules registry
            # Semgrep has built-in Solidity rules
            cmd = [
                'semgrep',
                '--config', 'p/solidity',  # Use community rules
                '--json',  # JSON output
                '--quiet',  # Less verbose
                contract_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30  # Semgrep is fast, 30s should be enough
            )
            
            logger.info(f"Semgrep exit code: {result.returncode}")
            
            if result.returncode not in [0, 1]:  # 0 or 1 are success
                logger.warning(f"Semgrep error: {result.stderr}")
                return "{}"
            
            return result.stdout

        except subprocess.TimeoutExpired:
            logger.error("Semgrep analysis timed out")
            return "{}"
        except Exception as e:
            logger.error(f"Semgrep execution failed: {e}")
            return "{}"

    def _parse_results(self, output: str) -> Dict[str, Any]:
        """
        Parse Semgrep JSON output into standard format
        
        Args:
            output: JSON output from Semgrep
            
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
            for result in data.get('results', []):
                vuln = {
                    'type': result.get('check_id', 'Unknown'),
                    'severity': self._map_severity(result.get('extra', {}).get('severity', 'INFO')),
                    'description': result.get('message', ''),
                    'lineNumber': result.get('start', {}).get('line', 0),
                    'recommendation': result.get('extra', {}).get('message', ''),
                    'confidence': 0.75,  # Semgrep confidence is generally high
                    'rule': result.get('check_id', ''),
                    'category': result.get('extra', {}).get('metadata', {}).get('category', ''),
                }
                
                # Classify as vulnerability or warning based on severity
                if vuln['severity'] in ['HIGH', 'CRITICAL', 'ERROR']:
                    vulnerabilities.append(vuln)
                else:
                    warnings.append(vuln)
            
            return {
                'vulnerabilities': vulnerabilities,
                'warnings': warnings,
                'engine': 'semgrep',
                'timestamp': self._current_timestamp(),
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Semgrep JSON: {e}")
            return self._empty_result()

    def _map_severity(self, semgrep_severity: str) -> str:
        """Map Semgrep severity to standard format"""
        mapping = {
            'error': 'HIGH',
            'warning': 'MEDIUM',
            'info': 'INFO',
            'debug': 'INFO',
        }
        return mapping.get(semgrep_severity.lower(), 'INFO')

    def _current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            'vulnerabilities': [],
            'warnings': [],
            'engine': 'semgrep',
            'timestamp': self._current_timestamp(),
            'error': 'Semgrep not available or failed'
        }


# Export singleton instance
semgrep_analyzer = SemgrepAnalyzer()

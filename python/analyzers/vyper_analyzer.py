#!/usr/bin/env python3
"""
Vyper Analyzer for view0x
Basic support for analyzing Vyper smart contracts.
"""

import re
import logging
import subprocess
import tempfile
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class VyperAnalyzer:
    """Analyzes Vyper smart contracts"""

    def __init__(self):
        self.vyper_available = self._check_vyper_available()

    def _check_vyper_available(self) -> bool:
        """Check if Vyper compiler is available"""
        try:
            result = subprocess.run(
                ['vyper', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def is_available(self) -> bool:
        """Check if Vyper analyzer is available"""
        return self.vyper_available

    def validate_vyper_code(self, code: str) -> Dict[str, Any]:
        """Validate Vyper code syntax"""
        if not self.vyper_available:
            return {
                "valid": False,
                "error": "Vyper compiler not available"
            }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.vy', delete=False) as f:
            f.write(code)
            temp_path = f.name
        
        try:
            result = subprocess.run(
                ['vyper', '-f', 'json', temp_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return {
                    "valid": True,
                    "bytecode": result.stdout
                }
            else:
                return {
                    "valid": False,
                    "error": result.stderr
                }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def analyze_vyper_contract(self, code: str) -> Dict[str, Any]:
        """Analyze Vyper contract for common patterns"""
        issues: List[Dict[str, Any]] = []
        
        # Check for unsafe operations
        if re.search(r'raw_call\s*\(', code):
            issues.append({
                "type": "unsafe_raw_call",
                "severity": "HIGH",
                "description": "Unsafe raw_call detected. Ensure proper validation.",
                "recommendation": "Validate all inputs to raw_call and handle failures."
            })
        
        # Check for reentrancy
        if re.search(r'@\s*external', code) and re.search(r'raw_call\s*\(', code):
            issues.append({
                "type": "potential_reentrancy",
                "severity": "HIGH",
                "description": "Potential reentrancy in external function with raw_call",
                "recommendation": "Use reentrancy guards or checks-effects-interactions pattern"
            })
        
        # Check for integer overflow (Vyper has built-in protection, but check for @view)
        # Vyper 0.3.0+ has overflow protection by default
        
        # Check for access control
        if re.search(r'@\s*external', code):
            if not re.search(r'assert\s+.*==\s*.*owner|assert\s+msg\.sender', code, re.IGNORECASE):
                issues.append({
                    "type": "missing_access_control",
                    "severity": "MEDIUM",
                    "description": "External function may lack access control",
                    "recommendation": "Add access control checks for sensitive operations"
                })
        
        return {
            "issues": issues,
            "summary": {
                "totalIssues": len(issues),
                "highSeverity": sum(1 for i in issues if i["severity"] == "HIGH"),
                "mediumSeverity": sum(1 for i in issues if i["severity"] == "MEDIUM"),
                "lowSeverity": sum(1 for i in issues if i["severity"] == "LOW")
            }
        }

    def analyze(self, code: str) -> Dict[str, Any]:
        """Main analysis method"""
        validation = self.validate_vyper_code(code)
        analysis = self.analyze_vyper_contract(code)
        
        return {
            "valid": validation["valid"],
            "validationError": validation.get("error"),
            "issues": analysis["issues"],
            "summary": analysis["summary"]
        }

#!/usr/bin/env python3
"""
Slither Analyzer Wrapper for view0x
Provides integration with Slither static analysis tool for smart contract vulnerability detection.
"""

import json
import os
import tempfile
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Severity(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

@dataclass
class Vulnerability:
    """Represents a vulnerability found by Slither"""
    id: str
    type: str
    severity: Severity
    title: str
    description: str
    location: Dict[str, Any]
    recommendation: str
    source: str = "slither"
    confidence: str = "HIGH"
    impact: str = "MEDIUM"
    cwe_id: Optional[int] = None
    function_name: Optional[str] = None
    contract_name: Optional[str] = None

class SlitherAnalyzer:
    """Wrapper for Slither static analysis tool"""

    def __init__(self, timeout: int = 300, solc_version: str = "0.8.19"):
        self.timeout = timeout
        self.solc_version = solc_version
        self.temp_dir = None

        # Severity mapping from Slither impact/confidence to our levels
        self.severity_mapping = {
            ("High", "High"): Severity.HIGH,
            ("High", "Medium"): Severity.HIGH,
            ("High", "Low"): Severity.MEDIUM,
            ("Medium", "High"): Severity.MEDIUM,
            ("Medium", "Medium"): Severity.MEDIUM,
            ("Medium", "Low"): Severity.LOW,
            ("Low", "High"): Severity.LOW,
            ("Low", "Medium"): Severity.LOW,
            ("Low", "Low"): Severity.LOW,
            ("Informational", "High"): Severity.INFO,
            ("Informational", "Medium"): Severity.INFO,
            ("Informational", "Low"): Severity.INFO,
        }

    def _create_temp_contract(self, contract_code: str) -> str:
        """Create a temporary Solidity file"""
        try:
            # Create temporary directory
            self.temp_dir = tempfile.mkdtemp(prefix="view0x_")
            contract_path = os.path.join(self.temp_dir, "contract.sol")

            # Write contract code to file
            with open(contract_path, 'w', encoding='utf-8') as f:
                f.write(contract_code)

            logger.info(f"Created temporary contract at: {contract_path}")
            return contract_path

        except Exception as e:
            logger.error(f"Failed to create temporary contract: {e}")
            raise

    def _cleanup_temp_files(self):
        """Clean up temporary files"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                import shutil
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temporary directory: {e}")

    def _run_slither(self, contract_path: str) -> Dict[str, Any]:
        """Run Slither analysis on the contract"""
        try:
            # Slither command with JSON output
            cmd = [
                "slither",
                contract_path,
                "--json", "-",
                "--disable-color",
                "--solc-remaps", "",
                "--exclude-dependencies",
                "--exclude-optimization",
                "--exclude-informational"
            ]

            logger.info(f"Running Slither command: {' '.join(cmd)}")

            # Run Slither with timeout
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=self.temp_dir
            )

            try:
                stdout, stderr = process.communicate(timeout=self.timeout)
                return_code = process.returncode

                logger.info(f"Slither completed with return code: {return_code}")

                # Parse JSON output
                if stdout:
                    try:
                        result = json.loads(stdout)
                        return {
                            "success": True,
                            "data": result,
                            "errors": stderr if stderr else None,
                            "return_code": return_code
                        }
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse Slither JSON output: {e}")
                        return {
                            "success": False,
                            "error": f"Invalid JSON output: {e}",
                            "stdout": stdout,
                            "stderr": stderr
                        }
                else:
                    return {
                        "success": False,
                        "error": "No output from Slither",
                        "stderr": stderr
                    }

            except subprocess.TimeoutExpired:
                process.kill()
                logger.error(f"Slither analysis timed out after {self.timeout} seconds")
                return {
                    "success": False,
                    "error": f"Analysis timed out after {self.timeout} seconds"
                }

        except Exception as e:
            logger.error(f"Failed to run Slither: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _parse_vulnerability(self, detector: Dict[str, Any]) -> Optional[Vulnerability]:
        """Parse a Slither detector result into our vulnerability format"""
        try:
            # Extract basic information
            detector_type = detector.get("check", "unknown")
            impact = detector.get("impact", "Medium")
            confidence = detector.get("confidence", "Medium")
            description = detector.get("description", "")

            # Map severity
            severity = self.severity_mapping.get((impact, confidence), Severity.MEDIUM)

            # Skip informational findings for now
            if severity == Severity.INFO:
                return None

            # Extract location information
            elements = detector.get("elements", [])
            location = {"start": 0, "end": 0, "line": 0, "column": 0}
            function_name = None
            contract_name = None

            if elements:
                first_element = elements[0]
                source_mapping = first_element.get("source_mapping", {})

                if source_mapping:
                    location = {
                        "start": source_mapping.get("start", 0),
                        "end": source_mapping.get("start", 0) + source_mapping.get("length", 0),
                        "line": source_mapping.get("lines", [0])[0] if source_mapping.get("lines") else 0,
                        "column": source_mapping.get("starting_column", 0)
                    }

                # Extract function and contract names
                if first_element.get("type") == "function":
                    function_name = first_element.get("name")
                    if "type_specific_fields" in first_element:
                        parent = first_element["type_specific_fields"].get("parent", {})
                        if parent.get("type") == "contract":
                            contract_name = parent.get("name")
                elif first_element.get("type") == "contract":
                    contract_name = first_element.get("name")

            # Generate title and recommendation based on detector type
            title, recommendation = self._get_detector_info(detector_type)

            return Vulnerability(
                id=f"slither_{detector_type}_{location['line']}_{location['column']}",
                type=detector_type,
                severity=severity,
                title=title,
                description=description.strip(),
                location=location,
                recommendation=recommendation,
                source="slither",
                confidence=confidence.upper(),
                impact=impact.upper(),
                function_name=function_name,
                contract_name=contract_name
            )

        except Exception as e:
            logger.error(f"Failed to parse vulnerability: {e}")
            return None

    def _get_detector_info(self, detector_type: str) -> Tuple[str, str]:
        """Get human-readable title and recommendation for detector type"""
        detector_info = {
            "reentrancy-eth": (
                "Reentrancy vulnerability with ETH transfer",
                "Use the checks-effects-interactions pattern. Update state before external calls. Consider using ReentrancyGuard."
            ),
            "reentrancy-no-eth": (
                "Reentrancy vulnerability without ETH transfer",
                "Update state before external calls to prevent reentrancy attacks."
            ),
            "unprotected-upgrade": (
                "Unprotected upgrade function",
                "Add proper access control to upgrade functions. Use OpenZeppelin's Ownable or AccessControl."
            ),
            "arbitrary-send": (
                "Arbitrary token send",
                "Validate recipient addresses and amounts. Use allowlist for authorized recipients."
            ),
            "controlled-delegatecall": (
                "Controlled delegatecall",
                "Avoid delegatecall with user-controlled data. If necessary, use a whitelist of approved contracts."
            ),
            "tx-origin": (
                "Dangerous use of tx.origin",
                "Use msg.sender instead of tx.origin for authentication. tx.origin can be manipulated in phishing attacks."
            ),
            "unchecked-lowlevel": (
                "Unchecked low-level call",
                "Check return value of low-level calls. Handle failures appropriately or use higher-level alternatives."
            ),
            "weak-prng": (
                "Weak pseudo-random number generation",
                "Use cryptographically secure randomness sources like Chainlink VRF instead of block properties."
            ),
            "block-timestamp": (
                "Dangerous use of block.timestamp",
                "Avoid using block.timestamp for critical logic. Consider using block numbers or external oracles."
            ),
            "pragma": (
                "Pragma directive issues",
                "Lock pragma to specific compiler version and avoid experimental features in production."
            ),
            "solc-version": (
                "Incorrect Solidity version",
                "Use a stable, recent Solidity version. Avoid pre-release versions in production code."
            ),
            "naming-convention": (
                "Naming convention violation",
                "Follow Solidity naming conventions: contracts in PascalCase, functions and variables in camelCase."
            ),
            "unused-state": (
                "Unused state variable",
                "Remove unused state variables to save gas and improve code clarity."
            ),
            "dead-code": (
                "Dead code detected",
                "Remove unreachable code to improve maintainability and reduce gas costs."
            ),
            "similar-names": (
                "Similar variable names",
                "Use distinct variable names to avoid confusion and potential bugs."
            ),
            "too-many-digits": (
                "Too many digits in number",
                "Use scientific notation or named constants for large numbers to improve readability."
            ),
            "costly-loop": (
                "Costly loop operation",
                "Optimize loops to reduce gas consumption. Consider pagination for large datasets."
            ),
            "missing-zero-check": (
                "Missing zero address check",
                "Add zero address checks for critical address parameters to prevent accidental misuse."
            )
        }

        return detector_info.get(detector_type, (
            f"Security issue: {detector_type}",
            "Review the flagged code and follow security best practices."
        ))

    def analyze(self, contract_code: str) -> Dict[str, Any]:
        """Analyze a Solidity contract for vulnerabilities"""
        start_time = time.time()

        try:
            logger.info("Starting Slither analysis...")

            # Validate input
            if not contract_code or not contract_code.strip():
                return {
                    "success": False,
                    "error": "Empty contract code provided"
                }

            # Create temporary contract file
            contract_path = self._create_temp_contract(contract_code)

            # Run Slither analysis
            slither_result = self._run_slither(contract_path)

            if not slither_result["success"]:
                return {
                    "success": False,
                    "error": slither_result.get("error", "Slither analysis failed"),
                    "details": slither_result
                }

            # Parse vulnerabilities
            vulnerabilities = []
            slither_data = slither_result["data"]

            if "results" in slither_data and "detectors" in slither_data["results"]:
                for detector in slither_data["results"]["detectors"]:
                    vuln = self._parse_vulnerability(detector)
                    if vuln:
                        vulnerabilities.append({
                            "id": vuln.id,
                            "type": vuln.type,
                            "severity": vuln.severity.value,
                            "title": vuln.title,
                            "description": vuln.description,
                            "location": vuln.location,
                            "recommendation": vuln.recommendation,
                            "source": vuln.source,
                            "confidence": vuln.confidence,
                            "impact": vuln.impact,
                            "cweId": vuln.cwe_id,
                            "functionName": vuln.function_name,
                            "contractName": vuln.contract_name
                        })

            # Calculate summary statistics
            severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for vuln in vulnerabilities:
                severity_counts[vuln["severity"]] += 1

            total_vulnerabilities = len(vulnerabilities)
            processing_time = int((time.time() - start_time) * 1000)  # milliseconds

            logger.info(f"Slither analysis completed in {processing_time}ms. Found {total_vulnerabilities} vulnerabilities.")

            return {
                "success": True,
                "vulnerabilities": vulnerabilities,
                "summary": {
                    "totalVulnerabilities": total_vulnerabilities,
                    "highSeverity": severity_counts["HIGH"],
                    "mediumSeverity": severity_counts["MEDIUM"],
                    "lowSeverity": severity_counts["LOW"],
                },
                "metadata": {
                    "tool": "slither",
                    "version": self._get_slither_version(),
                    "processingTime": processing_time,
                    "contractStats": {
                        "lines": len(contract_code.split('\n')),
                        "size": len(contract_code),
                    }
                }
            }

        except Exception as e:
            logger.error(f"Slither analysis failed: {e}")
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}"
            }

        finally:
            # Always cleanup temporary files
            self._cleanup_temp_files()

    def _get_slither_version(self) -> str:
        """Get Slither version"""
        try:
            result = subprocess.run(
                ["slither", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return result.stdout.strip()
            return "unknown"
        except Exception:
            return "unknown"

    def is_available(self) -> bool:
        """Check if Slither is available and working"""
        try:
            result = subprocess.run(
                ["slither", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False

def main():
    """Command line interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python slither_analyzer.py <contract_file>")
        sys.exit(1)

    contract_file = sys.argv[1]

    if not os.path.exists(contract_file):
        print(f"Contract file not found: {contract_file}")
        sys.exit(1)

    # Read contract code
    with open(contract_file, 'r', encoding='utf-8') as f:
        contract_code = f.read()

    # Run analysis
    analyzer = SlitherAnalyzer()

    if not analyzer.is_available():
        print("Error: Slither is not available. Please install it first:")
        print("pip install slither-analyzer")
        sys.exit(1)

    print(f"Analyzing contract: {contract_file}")
    result = analyzer.analyze(contract_code)

    # Print results
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()

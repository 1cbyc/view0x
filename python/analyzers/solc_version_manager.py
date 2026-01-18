#!/usr/bin/env python3
"""
Solc Version Manager for view0x
Manages multiple Solidity compiler versions for analysis.
"""

import re
import subprocess
import logging
import os
from typing import Optional, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class SolcVersionManager:
    """Manages Solidity compiler versions"""

    SUPPORTED_VERSIONS = [
        "0.8.24", "0.8.23", "0.8.22", "0.8.21", "0.8.20", "0.8.19", "0.8.18",
        "0.8.17", "0.8.16", "0.8.15", "0.8.14", "0.8.13", "0.8.12", "0.8.11",
        "0.8.10", "0.8.9", "0.8.8", "0.8.7", "0.8.6", "0.8.5", "0.8.4",
        "0.8.3", "0.8.2", "0.8.1", "0.8.0",
        "0.7.6", "0.7.5", "0.7.4", "0.7.3", "0.7.2", "0.7.1", "0.7.0",
        "0.6.12", "0.6.11", "0.6.10", "0.6.9", "0.6.8",
        "0.5.17", "0.5.16", "0.5.15", "0.5.14"
    ]

    def __init__(self):
        self.available_versions: List[str] = []
        self._check_available_versions()

    def _check_available_versions(self):
        """Check which Solc versions are available on the system"""
        try:
            result = subprocess.run(
                ['solc-select', 'versions'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                # Parse output to extract versions
                for line in result.stdout.split('\n'):
                    if re.match(r'\s+\d+\.\d+\.\d+', line):
                        version = line.strip()
                        self.available_versions.append(version)
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            logger.warning(f"Could not check solc-select versions: {e}")
            # Fallback: check if solc is available
            try:
                result = subprocess.run(
                    ['solc', '--version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    # Extract version from output
                    match = re.search(r'(\d+\.\d+\.\d+)', result.stdout)
                    if match:
                        self.available_versions.append(match.group(1))
            except Exception:
                pass

    def extract_pragma_version(self, contract_code: str) -> Optional[str]:
        """Extract Solidity version from pragma directive"""
        pragma_pattern = r'pragma\s+solidity\s+([^;]+);'
        match = re.search(pragma_pattern, contract_code, re.IGNORECASE)
        
        if not match:
            return None
        
        version_spec = match.group(1).strip()
        
        # Handle version ranges: ^0.8.0, >=0.8.0<0.9.0, 0.8.0, etc.
        # Extract base version
        version_match = re.search(r'(\d+\.\d+\.\d+)', version_spec)
        if version_match:
            base_version = version_match.group(1)
            
            # For caret (^) or >=, use the specified version
            if '^' in version_spec or '>=' in version_spec:
                return base_version
            
            # For exact version, return as-is
            if re.match(r'^\d+\.\d+\.\d+$', version_spec):
                return base_version
            
            # For range, extract upper bound if available
            range_match = re.search(r'<(\d+\.\d+\.\d+)', version_spec)
            if range_match:
                upper_version = range_match.group(1)
                # Use the highest compatible version
                return self._get_highest_compatible_version(base_version, upper_version)
            
            return base_version
        
        return None

    def _get_highest_compatible_version(self, min_version: str, max_version: str) -> str:
        """Get the highest compatible version within a range"""
        min_parts = tuple(map(int, min_version.split('.')))
        max_parts = tuple(map(int, max_version.split('.')))
        
        # Find the highest version that matches
        for version in reversed(self.SUPPORTED_VERSIONS):
            version_parts = tuple(map(int, version.split('.')))
            if min_parts <= version_parts < max_parts:
                return version
        
        return min_version

    def get_required_version(self, contract_code: str, default: str = "0.8.19") -> str:
        """Get the required Solidity version for a contract"""
        pragma_version = self.extract_pragma_version(contract_code)
        
        if pragma_version:
            # Check if the version is available
            if pragma_version in self.available_versions:
                return pragma_version
            
            # Find the closest available version
            required_parts = tuple(map(int, pragma_version.split('.')))
            
            for version in self.SUPPORTED_VERSIONS:
                if version in self.available_versions:
                    version_parts = tuple(map(int, version.split('.')))
                    # Match major.minor
                    if version_parts[:2] == required_parts[:2]:
                        return version
            
            # Fallback to default if no match
            logger.warning(f"Version {pragma_version} not available, using {default}")
            return default
        
        return default

    def set_version(self, version: str) -> bool:
        """Set the Solc version using solc-select"""
        try:
            if version not in self.available_versions:
                logger.warning(f"Version {version} not in available versions")
                return False
            
            result = subprocess.run(
                ['solc-select', 'install', version],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.warning(f"Failed to install version {version}: {result.stderr}")
            
            result = subprocess.run(
                ['solc-select', 'use', version],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"Could not set solc version: {e}")
            return False

    def is_version_available(self, version: str) -> bool:
        """Check if a specific version is available"""
        return version in self.available_versions

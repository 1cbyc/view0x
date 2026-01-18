#!/usr/bin/env python3
"""
Incremental Analyzer for view0x
Performs incremental analysis by only analyzing changed parts of contracts.
"""

import hashlib
import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

@dataclass
class ChangeSet:
    """Represents changes in contract code"""
    added_lines: Set[int]
    modified_lines: Set[int]
    removed_lines: Set[int]
    unchanged_regions: List[tuple[int, int]]  # (start_line, end_line)

class IncrementalAnalyzer:
    """Performs incremental analysis on contract changes"""

    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.line_cache: Dict[str, List[str]] = {}

    def compute_hash(self, contract_code: str) -> str:
        """Compute hash of contract code"""
        return hashlib.sha256(contract_code.encode('utf-8')).hexdigest()

    def get_cached_analysis(self, contract_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached analysis result"""
        return self.cache.get(contract_hash)

    def cache_analysis(self, contract_hash: str, analysis_result: Dict[str, Any]):
        """Cache analysis result"""
        self.cache[contract_hash] = analysis_result

    def compute_changeset(
        self,
        old_code: str,
        new_code: str
    ) -> ChangeSet:
        """Compute changeset between old and new code"""
        old_lines = old_code.split('\n')
        new_lines = new_code.split('\n')
        
        # Simple line-based diff
        added_lines: Set[int] = set()
        modified_lines: Set[int] = set()
        removed_lines: Set[int] = set()
        unchanged_regions: List[tuple[int, int]] = []
        
        # Use a simple longest common subsequence approach
        old_hashes = [hashlib.md5(line.encode()).hexdigest() for line in old_lines]
        new_hashes = [hashlib.md5(line.encode()).hexdigest() for line in new_lines]
        
        # Find common lines
        common_lines: Set[int] = set()
        for i, old_hash in enumerate(old_hashes):
            if old_hash in new_hashes:
                new_idx = new_hashes.index(old_hash)
                common_lines.add(i + 1)  # 1-indexed
        
        # Identify changes
        for i, new_line in enumerate(new_lines):
            line_num = i + 1
            if i < len(old_lines):
                old_hash = old_hashes[i]
                new_hash = new_hashes[i]
                
                if old_hash != new_hash:
                    if old_hash in new_hashes:
                        modified_lines.add(line_num)
                    else:
                        added_lines.add(line_num)
            else:
                added_lines.add(line_num)
        
        # Find removed lines
        for i, old_line in enumerate(old_lines):
            line_num = i + 1
            if i >= len(new_lines) or old_hashes[i] not in new_hashes:
                removed_lines.add(line_num)
        
        # Find unchanged regions
        i = 0
        while i < len(old_lines):
            if i + 1 not in removed_lines and (i >= len(new_lines) or new_hashes[i] == old_hashes[i]):
                start = i + 1
                end = i + 1
                while i + 1 < len(old_lines) and (i + 1 not in removed_lines and (i + 1 >= len(new_lines) or new_hashes[i + 1] == old_hashes[i + 1])):
                    i += 1
                    end = i + 1
                if start <= end:
                    unchanged_regions.append((start, end))
            i += 1
        
        return ChangeSet(
            added_lines=added_lines,
            modified_lines=modified_lines,
            removed_lines=removed_lines,
            unchanged_regions=unchanged_regions
        )

    def filter_affected_issues(
        self,
        issues: List[Dict[str, Any]],
        changeset: ChangeSet
    ) -> List[Dict[str, Any]]:
        """Filter issues to only include those affected by changes"""
        affected_issues: List[Dict[str, Any]] = []
        changed_lines = changeset.added_lines | changeset.modified_lines | changeset.removed_lines
        
        for issue in issues:
            issue_line = issue.get('location', {}).get('line') or issue.get('lineNumber')
            
            if issue_line:
                # Check if issue is in changed region
                if issue_line in changed_lines:
                    affected_issues.append(issue)
                else:
                    # Check if issue is in a function that was modified
                    # (Simplified: include if within 20 lines of change)
                    for changed_line in changed_lines:
                        if abs(issue_line - changed_line) <= 20:
                            affected_issues.append(issue)
                            break
            else:
                # If no line number, include it to be safe
                affected_issues.append(issue)
        
        return affected_issues

    def merge_analysis_results(
        self,
        cached_result: Dict[str, Any],
        new_result: Dict[str, Any],
        changeset: ChangeSet
    ) -> Dict[str, Any]:
        """Merge cached and new analysis results"""
        merged = {
            "summary": {},
            "vulnerabilities": [],
            "gasOptimizations": [],
            "codeQuality": []
        }
        
        # Keep unchanged issues from cache
        cached_vulns = self.filter_affected_issues(
            cached_result.get("vulnerabilities", []),
            changeset
        )
        
        cached_gas = self.filter_affected_issues(
            cached_result.get("gasOptimizations", []),
            changeset
        )
        
        cached_quality = self.filter_affected_issues(
            cached_result.get("codeQuality", []),
            changeset
        )
        
        # Add new issues
        merged["vulnerabilities"] = list(set(
            cached_vulns + new_result.get("vulnerabilities", [])
        ))
        
        merged["gasOptimizations"] = list(set(
            cached_gas + new_result.get("gasOptimizations", [])
        ))
        
        merged["codeQuality"] = list(set(
            cached_quality + new_result.get("codeQuality", [])
        ))
        
        # Update summary
        merged["summary"] = {
            "totalVulnerabilities": len(merged["vulnerabilities"]),
            "highSeverity": sum(1 for v in merged["vulnerabilities"] if v.get("severity") == "HIGH"),
            "mediumSeverity": sum(1 for v in merged["vulnerabilities"] if v.get("severity") == "MEDIUM"),
            "lowSeverity": sum(1 for v in merged["vulnerabilities"] if v.get("severity") == "LOW"),
            "gasOptimizations": len(merged["gasOptimizations"]),
            "codeQualityIssues": len(merged["codeQuality"])
        }
        
        merged["metadata"] = new_result.get("metadata", {})
        merged["metadata"]["incremental"] = True
        merged["metadata"]["changeset"] = {
            "added": len(changeset.added_lines),
            "modified": len(changeset.modified_lines),
            "removed": len(changeset.removed_lines)
        }
        
        return merged

    def should_analyze_incrementally(
        self,
        old_code: Optional[str],
        new_code: str
    ) -> bool:
        """Determine if incremental analysis should be performed"""
        if not old_code:
            return False
        
        # Only use incremental analysis if changes are < 50% of code
        changeset = self.compute_changeset(old_code, new_code)
        total_changes = len(changeset.added_lines) + len(changeset.modified_lines) + len(changeset.removed_lines)
        total_lines = max(len(old_code.split('\n')), len(new_code.split('\n')))
        
        change_ratio = total_changes / total_lines if total_lines > 0 else 1.0
        
        return change_ratio < 0.5  # Only if less than 50% changed

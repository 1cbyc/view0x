#!/usr/bin/env python3
"""
False Positive Handler for view0x
Manages false positive reporting and learning system.
"""

import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime
import json
from collections import defaultdict

logger = logging.getLogger(__name__)

@dataclass
class FalsePositiveReport:
    """Represents a false positive report"""
    issue_id: str
    issue_type: str
    contract_hash: str
    location: Dict[str, Any]
    reason: str
    reported_by: Optional[str] = None
    reported_at: Optional[str] = None
    verified: bool = False

class FalsePositiveHandler:
    """Handles false positive reporting and learning"""

    def __init__(self):
        self.false_positives: Dict[str, List[FalsePositiveReport]] = defaultdict(list)
        self.issue_patterns: Dict[str, Dict[str, Any]] = {}
        self.learning_data: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def report_false_positive(
        self,
        issue_id: str,
        issue_type: str,
        contract_hash: str,
        location: Dict[str, Any],
        reason: str,
        reported_by: Optional[str] = None
    ) -> bool:
        """Report a false positive"""
        report = FalsePositiveReport(
            issue_id=issue_id,
            issue_type=issue_type,
            contract_hash=contract_hash,
            location=location,
            reason=reason,
            reported_by=reported_by,
            reported_at=datetime.utcnow().isoformat()
        )
        
        key = f"{issue_type}:{contract_hash}"
        self.false_positives[key].append(report)
        
        # Update learning data
        self.learning_data[issue_type].append({
            "contract_hash": contract_hash,
            "location": location,
            "reason": reason,
            "reported_at": report.reported_at
        })
        
        logger.info(f"False positive reported: {issue_id} ({issue_type})")
        return True

    def is_false_positive(
        self,
        issue_type: str,
        contract_hash: str,
        location: Dict[str, Any]
    ) -> bool:
        """Check if an issue is a known false positive"""
        key = f"{issue_type}:{contract_hash}"
        
        if key not in self.false_positives:
            return False
        
        reports = self.false_positives[key]
        
        # Check if location matches
        for report in reports:
            if report.verified and self._location_matches(report.location, location):
                return True
        
        return False

    def _location_matches(self, loc1: Dict[str, Any], loc2: Dict[str, Any]) -> bool:
        """Check if two locations match"""
        line1 = loc1.get("line") or loc1.get("lineNumber")
        line2 = loc2.get("line") or loc2.get("lineNumber")
        
        # Exact line match
        if line1 and line2:
            return line1 == line2
        
        # Range match (within 5 lines)
        if line1 and line2:
            return abs(line1 - line2) <= 5
        
        return False

    def verify_false_positive(
        self,
        issue_type: str,
        contract_hash: str,
        location: Dict[str, Any]
    ) -> bool:
        """Verify a false positive report (admin action)"""
        key = f"{issue_type}:{contract_hash}"
        
        if key not in self.false_positives:
            return False
        
        for report in self.false_positives[key]:
            if self._location_matches(report.location, location):
                report.verified = True
                self._update_learning_pattern(report)
                logger.info(f"False positive verified: {report.issue_id}")
                return True
        
        return False

    def _update_learning_pattern(self, report: FalsePositiveReport):
        """Update learning patterns based on verified false positive"""
        if report.issue_type not in self.issue_patterns:
            self.issue_patterns[report.issue_type] = {
                "false_positive_count": 0,
                "patterns": []
            }
        
        self.issue_patterns[report.issue_type]["false_positive_count"] += 1
        
        # Extract patterns (simplified)
        pattern = {
            "reason": report.reason,
            "location_type": report.location.get("type"),
            "count": 1
        }
        
        # Check if pattern already exists
        existing_pattern = None
        for p in self.issue_patterns[report.issue_type]["patterns"]:
            if p.get("reason") == report.reason:
                existing_pattern = p
                break
        
        if existing_pattern:
            existing_pattern["count"] += 1
        else:
            self.issue_patterns[report.issue_type]["patterns"].append(pattern)

    def should_suppress_issue(
        self,
        issue_type: str,
        contract_hash: str,
        location: Dict[str, Any],
        confidence_threshold: float = 0.7
    ) -> bool:
        """Determine if an issue should be suppressed based on learning"""
        # Check if it's a known false positive
        if self.is_false_positive(issue_type, contract_hash, location):
            return True
        
        # Check learning patterns
        if issue_type in self.issue_patterns:
            pattern = self.issue_patterns[issue_type]
            
            # If we have enough false positive reports, suppress similar issues
            fp_count = pattern.get("false_positive_count", 0)
            if fp_count >= 3:
                # Check if location type matches common false positive pattern
                location_type = location.get("type")
                for p in pattern.get("patterns", []):
                    if p.get("location_type") == location_type:
                        confidence = min(1.0, p.get("count", 0) / fp_count)
                        if confidence >= confidence_threshold:
                            return True
        
        return False

    def filter_false_positives(
        self,
        issues: List[Dict[str, Any]],
        contract_hash: str
    ) -> List[Dict[str, Any]]:
        """Filter out known false positives from issue list"""
        filtered: List[Dict[str, Any]] = []
        
        for issue in issues:
            issue_type = issue.get("type") or issue.get("check")
            location = issue.get("location") or {
                "line": issue.get("lineNumber"),
                "type": "line"
            }
            
            if not self.should_suppress_issue(issue_type, contract_hash, location):
                filtered.append(issue)
            else:
                # Mark as suppressed
                issue["suppressed"] = True
                issue["suppression_reason"] = "Known false positive"
        
        return filtered

    def get_false_positive_statistics(self) -> Dict[str, Any]:
        """Get statistics about false positives"""
        total_reports = sum(len(reports) for reports in self.false_positives.values())
        verified_reports = sum(
            sum(1 for r in reports if r.verified)
            for reports in self.false_positives.values()
        )
        
        issue_type_counts: Dict[str, int] = defaultdict(int)
        for key, reports in self.false_positives.items():
            issue_type = key.split(":")[0]
            issue_type_counts[issue_type] += len(reports)
        
        return {
            "totalReports": total_reports,
            "verifiedReports": verified_reports,
            "issueTypeCounts": dict(issue_type_counts),
            "learningPatterns": dict(self.issue_patterns)
        }

    def export_false_positives(self) -> str:
        """Export false positives to JSON"""
        data = {
            "false_positives": {
                key: [asdict(r) for r in reports]
                for key, reports in self.false_positives.items()
            },
            "learning_patterns": self.issue_patterns,
            "exported_at": datetime.utcnow().isoformat()
        }
        return json.dumps(data, indent=2)

    def import_false_positives(self, json_data: str):
        """Import false positives from JSON"""
        try:
            data = json.loads(json_data)
            
            # Import false positives
            for key, reports_data in data.get("false_positives", {}).items():
                self.false_positives[key] = [
                    FalsePositiveReport(**r) for r in reports_data
                ]
            
            # Import learning patterns
            self.issue_patterns = data.get("learning_patterns", {})
            
            logger.info(f"Imported {len(self.false_positives)} false positive groups")
        except Exception as e:
            logger.error(f"Failed to import false positives: {e}")
            raise

#!/usr/bin/env python3
"""
Custom Rules Engine for view0x
Allows users to define custom security rules for contract analysis.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)

class RuleSeverity(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class RuleType(Enum):
    PATTERN = "PATTERN"
    AST = "AST"
    CUSTOM = "CUSTOM"

@dataclass
class CustomRule:
    """Represents a custom security rule"""
    id: str
    name: str
    description: str
    rule_type: RuleType
    pattern: Optional[str] = None
    ast_condition: Optional[str] = None
    custom_function: Optional[str] = None
    severity: RuleSeverity = RuleSeverity.MEDIUM
    enabled: bool = True

class CustomRulesEngine:
    """Engine for executing custom security rules"""

    def __init__(self):
        self.rules: Dict[str, CustomRule] = {}

    def add_rule(self, rule: CustomRule):
        """Add a custom rule"""
        self.rules[rule.id] = rule
        logger.info(f"Added custom rule: {rule.name} ({rule.id})")

    def remove_rule(self, rule_id: str):
        """Remove a custom rule"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"Removed custom rule: {rule_id}")

    def load_rules_from_json(self, rules_json: str):
        """Load rules from JSON string"""
        try:
            rules_data = json.loads(rules_json)
            for rule_data in rules_data:
                rule = CustomRule(
                    id=rule_data["id"],
                    name=rule_data["name"],
                    description=rule_data["description"],
                    rule_type=RuleType(rule_data["rule_type"]),
                    pattern=rule_data.get("pattern"),
                    ast_condition=rule_data.get("ast_condition"),
                    custom_function=rule_data.get("custom_function"),
                    severity=RuleSeverity(rule_data.get("severity", "MEDIUM")),
                    enabled=rule_data.get("enabled", True)
                )
                self.add_rule(rule)
        except Exception as e:
            logger.error(f"Failed to load rules from JSON: {e}")
            raise

    def execute_pattern_rule(self, rule: CustomRule, contract_code: str) -> List[Dict[str, Any]]:
        """Execute a pattern-based rule"""
        if not rule.pattern:
            return []
        
        findings: List[Dict[str, Any]] = []
        
        try:
            # Support both regex and simple string matching
            if rule.pattern.startswith('/') and rule.pattern.endswith('/'):
                # Regex pattern
                pattern = rule.pattern[1:-1]
                regex = re.compile(pattern, re.MULTILINE | re.IGNORECASE)
            else:
                # Simple string pattern
                regex = re.compile(re.escape(rule.pattern), re.IGNORECASE)
            
            matches = regex.finditer(contract_code)
            for match in matches:
                line = contract_code[:match.start()].count('\n') + 1
                findings.append({
                    "ruleId": rule.id,
                    "ruleName": rule.name,
                    "type": rule.description,
                    "severity": rule.severity.value,
                    "description": rule.description,
                    "location": {
                        "line": line,
                        "start": match.start(),
                        "end": match.end()
                    },
                    "matchedText": match.group(0)
                })
        except Exception as e:
            logger.error(f"Error executing pattern rule {rule.id}: {e}")
        
        return findings

    def execute_ast_rule(self, rule: CustomRule, ast: Any) -> List[Dict[str, Any]]:
        """Execute an AST-based rule (placeholder for future implementation)"""
        # This would require a more sophisticated AST evaluation system
        logger.warning(f"AST-based rules not yet fully implemented for rule {rule.id}")
        return []

    def execute_custom_function_rule(
        self,
        rule: CustomRule,
        contract_code: str,
        ast: Any
    ) -> List[Dict[str, Any]]:
        """Execute a custom function rule (placeholder for future implementation)"""
        # This would require sandboxed code execution
        logger.warning(f"Custom function rules not yet fully implemented for rule {rule.id}")
        return []

    def analyze_contract(
        self,
        contract_code: str,
        ast: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Analyze contract using all enabled custom rules"""
        all_findings: List[Dict[str, Any]] = []
        
        for rule_id, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            try:
                if rule.rule_type == RuleType.PATTERN:
                    findings = self.execute_pattern_rule(rule, contract_code)
                elif rule.rule_type == RuleType.AST:
                    findings = self.execute_ast_rule(rule, ast) if ast else []
                elif rule.rule_type == RuleType.CUSTOM:
                    findings = self.execute_custom_function_rule(rule, contract_code, ast)
                else:
                    findings = []
                
                all_findings.extend(findings)
            except Exception as e:
                logger.error(f"Error executing rule {rule_id}: {e}")
        
        return {
            "findings": all_findings,
            "summary": {
                "totalFindings": len(all_findings),
                "highSeverity": sum(1 for f in all_findings if f.get("severity") == "HIGH"),
                "mediumSeverity": sum(1 for f in all_findings if f.get("severity") == "MEDIUM"),
                "lowSeverity": sum(1 for f in all_findings if f.get("severity") == "LOW"),
                "rulesExecuted": len([r for r in self.rules.values() if r.enabled])
            }
        }

    def export_rules_to_json(self) -> str:
        """Export all rules to JSON"""
        rules_data = []
        for rule in self.rules.values():
            rules_data.append({
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "rule_type": rule.rule_type.value,
                "pattern": rule.pattern,
                "ast_condition": rule.ast_condition,
                "custom_function": rule.custom_function,
                "severity": rule.severity.value,
                "enabled": rule.enabled
            })
        return json.dumps(rules_data, indent=2)

#!/usr/bin/env python3
"""
Code Quality Analyzer for view0x
Detects code quality issues and best practices violations in Solidity contracts.
"""

import re
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class QualitySeverity(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

@dataclass
class CodeQualityIssue:
    """Represents a code quality issue"""
    id: str
    type: str
    title: str
    description: str
    location: Dict[str, Any]
    recommendation: str
    severity: QualitySeverity = QualitySeverity.LOW
    source: str = "code-quality"

class CodeQualityAnalyzer:
    """Analyzes Solidity contracts for code quality issues"""

    def __init__(self):
        self.issues: List[CodeQualityIssue] = []

    def analyze(self, contract_code: str) -> List[Dict[str, Any]]:
        """Analyze contract for code quality issues"""
        self.issues = []
        lines = contract_code.split('\n')

        # Documentation
        self._analyze_documentation(contract_code, lines)

        # Naming conventions
        self._analyze_naming_conventions(contract_code, lines)

        # Function complexity
        self._analyze_function_complexity(contract_code, lines)

        # Code duplication
        self._analyze_code_duplication(contract_code, lines)

        # Unused code
        self._analyze_unused_code(contract_code, lines)

        # Magic numbers
        self._analyze_magic_numbers(contract_code, lines)

        # Pragma version
        self._analyze_pragma_version(contract_code, lines)

        # License identifier
        self._analyze_license(contract_code, lines)

        # Visibility modifiers
        self._analyze_visibility_modifiers(contract_code, lines)

        # Function length
        self._analyze_function_length(contract_code, lines)

        # Comment quality
        self._analyze_comments(contract_code, lines)

        # Import organization
        self._analyze_imports(contract_code, lines)

        return [self._to_dict(issue) for issue in self.issues]

    def _analyze_documentation(self, contract_code: str, lines: List[str]):
        """Check for missing NatSpec documentation"""
        for i, line in enumerate(lines, 1):
            lower_line = line.lower()
            
            # Check for public/external functions without documentation
            if 'function' in lower_line and ('public' in lower_line or 'external' in lower_line):
                # Check if there's NatSpec comment above
                has_natspec = False
                for j in range(max(0, i-5), i):
                    if '///' in lines[j] or '/**' in lines[j]:
                        has_natspec = True
                        break
                
                if not has_natspec:
                    func_name_match = re.search(r'function\s+(\w+)', line)
                    func_name = func_name_match.group(1) if func_name_match else "unknown"
                    
                    self.issues.append(CodeQualityIssue(
                        id=f"quality_docs_{i}",
                        type="missing-documentation",
                        title="Missing NatSpec Documentation",
                        description=f"Function '{func_name}' is missing NatSpec documentation",
                        location={"line": i, "start": 0, "end": 0},
                        recommendation="Add NatSpec comments (///) for all public/external functions",
                        severity=QualitySeverity.MEDIUM,
                    ))

    def _analyze_naming_conventions(self, contract_code: str, lines: List[str]):
        """Check Solidity naming conventions"""
        for i, line in enumerate(lines, 1):
            # Contract names should be PascalCase
            contract_match = re.search(r'contract\s+([a-z][a-zA-Z0-9]*)', line)
            if contract_match:
                self.issues.append(CodeQualityIssue(
                    id=f"quality_naming_contract_{i}",
                    type="naming-convention",
                    title="Naming Convention Violation",
                    description=f"Contract names should be PascalCase: '{contract_match.group(1)}'",
                    location={"line": i, "start": 0, "end": 0},
                    recommendation="Use PascalCase for contract names (e.g., MyContract)",
                    severity=QualitySeverity.LOW,
                ))

            # Function/variable names should be camelCase
            func_match = re.search(r'function\s+([A-Z][a-zA-Z0-9]*)', line)
            if func_match:
                self.issues.append(CodeQualityIssue(
                    id=f"quality_naming_func_{i}",
                    type="naming-convention",
                    title="Naming Convention Violation",
                    description=f"Function names should be camelCase: '{func_match.group(1)}'",
                    location={"line": i, "start": 0, "end": 0},
                    recommendation="Use camelCase for function and variable names",
                    severity=QualitySeverity.LOW,
                ))

    def _analyze_function_complexity(self, contract_code: str, lines: List[str]):
        """Detect overly complex functions"""
        in_function = False
        function_start = 0
        brace_count = 0
        if_count = 0

        for i, line in enumerate(lines, 1):
            if 'function' in line.lower() and '{' in line:
                in_function = True
                function_start = i
                brace_count = line.count('{') - line.count('}')
                if_count = 0
            elif in_function:
                brace_count += line.count('{') - line.count('}')
                if 'if' in line.lower() or 'require' in line.lower():
                    if_count += 1
                
                if brace_count == 0 and in_function:
                    # Function ended
                    if if_count > 5:
                        self.issues.append(CodeQualityIssue(
                            id=f"quality_complexity_{function_start}",
                            type="high-complexity",
                            title="High Function Complexity",
                            description=f"Function starting at line {function_start} has high cyclomatic complexity",
                            location={"line": function_start, "start": 0, "end": 0},
                            recommendation="Break down complex functions into smaller, more manageable functions",
                            severity=QualitySeverity.MEDIUM,
                        ))
                    in_function = False

    def _analyze_code_duplication(self, contract_code: str, lines: List[str]):
        """Detect code duplication"""
        # Simple heuristic: check for repeated patterns
        patterns = {}
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if len(stripped) > 20 and 'function' not in stripped.lower():
                if stripped in patterns:
                    patterns[stripped].append(i)
                else:
                    patterns[stripped] = [i]

        # Report if pattern appears 3+ times
        for pattern, line_numbers in patterns.items():
            if len(line_numbers) >= 3:
                self.issues.append(CodeQualityIssue(
                    id=f"quality_duplication_{line_numbers[0]}",
                    type="code-duplication",
                    title="Code Duplication",
                    description=f"Similar code pattern found at lines {line_numbers[:3]}",
                    location={"line": line_numbers[0], "start": 0, "end": 0},
                    recommendation="Extract common code into reusable functions or modifiers",
                    severity=QualitySeverity.MEDIUM,
                ))

    def _analyze_unused_code(self, contract_code: str, lines: List[str]):
        """Detect unused variables and functions"""
        # Check for unused state variables (simple check)
        for i, line in enumerate(lines, 1):
            if re.search(r'\b(uint|string|bool|address|bytes)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;', line):
                var_match = re.search(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*;', line)
                if var_match:
                    var_name = var_match.group(1)
                    # Check if used elsewhere
                    occurrences = contract_code.count(var_name)
                    if occurrences == 1:  # Only declaration
                        self.issues.append(CodeQualityIssue(
                            id=f"quality_unused_{i}",
                            type="unused-variable",
                            title="Unused Variable",
                            description=f"Variable '{var_name}' is declared but never used",
                            location={"line": i, "start": 0, "end": 0},
                            recommendation="Remove unused variables to improve code clarity",
                            severity=QualitySeverity.LOW,
                        ))

    def _analyze_magic_numbers(self, contract_code: str, lines: List[str]):
        """Detect magic numbers that should be constants"""
        for i, line in enumerate(lines, 1):
            # Find numbers that aren't in comments or strings
            if '//' not in line and '"' not in line:
                matches = re.findall(r'\b([1-9]\d{2,})\b', line)  # Numbers > 99
                for num in matches:
                    # Check if it's already a constant
                    if 'constant' not in lines[max(0, i-5):i][-1].lower():
                        self.issues.append(CodeQualityIssue(
                            id=f"quality_magic_{i}_{num}",
                            type="magic-number",
                            title="Magic Number",
                            description=f"Magic number {num} should be a named constant",
                            location={"line": i, "start": 0, "end": 0},
                            recommendation=f"Define a constant: uint256 public constant MY_VALUE = {num};",
                            severity=QualitySeverity.LOW,
                        ))

    def _analyze_pragma_version(self, contract_code: str, lines: List[str]):
        """Check pragma version directive"""
        if 'pragma solidity' not in contract_code.lower():
            self.issues.append(CodeQualityIssue(
                id="quality_pragma_missing",
                type="missing-pragma",
                title="Missing Pragma Directive",
                description="No pragma solidity version directive found",
                location={"line": 1, "start": 0, "end": 0},
                recommendation="Add 'pragma solidity ^0.8.0;' at the top of the file",
                severity=QualitySeverity.HIGH,
            ))
        else:
            # Check if using caret (^)
            pragma_match = re.search(r'pragma\s+solidity\s+([^^0-9\.]+)', contract_code)
            if pragma_match:
                self.issues.append(CodeQualityIssue(
                    id="quality_pragma_version",
                    type="pragma-version",
                    title="Pragma Version Format",
                    description="Consider using caret (^) for pragma version",
                    location={"line": 1, "start": 0, "end": 0},
                    recommendation="Use 'pragma solidity ^0.8.0;' instead of exact version",
                    severity=QualitySeverity.LOW,
                ))

    def _analyze_license(self, contract_code: str, lines: List[str]):
        """Check for SPDX license identifier"""
        if 'spdx-license-identifier' not in contract_code.lower():
            self.issues.append(CodeQualityIssue(
                id="quality_license_missing",
                type="missing-license",
                title="Missing SPDX License Identifier",
                description="No SPDX license identifier found",
                location={"line": 1, "start": 0, "end": 0},
                recommendation="Add '// SPDX-License-Identifier: MIT' at the top of the file",
                severity=QualitySeverity.MEDIUM,
            ))

    def _analyze_visibility_modifiers(self, contract_code: str, lines: List[str]):
        """Check for missing visibility modifiers"""
        for i, line in enumerate(lines, 1):
            if 'function' in line.lower():
                if not any(mod in line.lower() for mod in ['public', 'external', 'internal', 'private']):
                    self.issues.append(CodeQualityIssue(
                        id=f"quality_visibility_{i}",
                        type="missing-visibility",
                        title="Missing Visibility Modifier",
                        description="Function is missing explicit visibility modifier",
                        location={"line": i, "start": 0, "end": 0},
                        recommendation="Always specify function visibility (public, external, internal, private)",
                        severity=QualitySeverity.MEDIUM,
                    ))

    def _analyze_function_length(self, contract_code: str, lines: List[str]):
        """Check for overly long functions"""
        in_function = False
        function_start = 0
        function_line_count = 0
        brace_count = 0

        for i, line in enumerate(lines, 1):
            if 'function' in line.lower() and '{' in line:
                in_function = True
                function_start = i
                function_line_count = 1
                brace_count = line.count('{') - line.count('}')
            elif in_function:
                function_line_count += 1
                brace_count += line.count('{') - line.count('}')
                
                if brace_count == 0:
                    if function_line_count > 50:
                        self.issues.append(CodeQualityIssue(
                            id=f"quality_length_{function_start}",
                            type="long-function",
                            title="Long Function",
                            description=f"Function starting at line {function_start} is {function_line_count} lines long",
                            location={"line": function_start, "start": 0, "end": 0},
                            recommendation="Break long functions into smaller, single-purpose functions",
                            severity=QualitySeverity.MEDIUM,
                        ))
                    in_function = False

    def _analyze_comments(self, contract_code: str, lines: List[str]):
        """Check comment quality"""
        for i, line in enumerate(lines, 1):
            if '//' in line:
                comment = line.split('//')[1].strip()
                # Check for TODO/FIXME without context
                if 'todo' in comment.lower() or 'fixme' in comment.lower():
                    if len(comment) < 20:
                        self.issues.append(CodeQualityIssue(
                            id=f"quality_comment_{i}",
                            type="incomplete-comment",
                            title="Incomplete Comment",
                            description="TODO/FIXME comment should include more context",
                            location={"line": i, "start": 0, "end": 0},
                            recommendation="Add more context to TODO/FIXME comments",
                            severity=QualitySeverity.INFO,
                        ))

    def _analyze_imports(self, contract_code: str, lines: List[str]):
        """Check import organization"""
        imports = []
        for i, line in enumerate(lines, 1):
            if line.strip().startswith('import'):
                imports.append((i, line))
        
        if len(imports) > 0:
            # Check if imports are at the top
            if imports[0][0] > 5:
                self.issues.append(CodeQualityIssue(
                    id="quality_imports_location",
                    type="import-organization",
                    title="Imports Not at Top",
                    description="Imports should be at the top of the file",
                    location={"line": imports[0][0], "start": 0, "end": 0},
                    recommendation="Move all imports to the top of the file after pragma and license",
                    severity=QualitySeverity.LOW,
                ))

    def _to_dict(self, issue: CodeQualityIssue) -> Dict[str, Any]:
        """Convert CodeQualityIssue to dictionary"""
        return {
            "id": issue.id,
            "type": issue.type,
            "title": issue.title,
            "description": issue.description,
            "location": issue.location,
            "recommendation": issue.recommendation,
            "severity": issue.severity.value,
            "source": issue.source,
        }

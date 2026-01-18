#!/usr/bin/env python3
"""
Gas Optimization Analyzer for view0x
Detects gas optimization opportunities in Solidity contracts.
"""

import re
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class OptimizationPriority(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

@dataclass
class GasOptimization:
    """Represents a gas optimization opportunity"""
    id: str
    type: str
    title: str
    description: str
    location: Dict[str, Any]
    potentialSavings: str
    recommendation: str
    estimatedGasSaved: Optional[int] = None
    priority: OptimizationPriority = OptimizationPriority.MEDIUM
    source: str = "gas-optimizer"

class GasOptimizer:
    """Analyzes Solidity contracts for gas optimization opportunities"""

    def __init__(self):
        self.optimizations: List[GasOptimization] = []

    def analyze(self, contract_code: str, slither_results: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Analyze contract for gas optimization opportunities"""
        self.optimizations = []
        lines = contract_code.split('\n')

        # State variable packing analysis
        self._analyze_state_variable_packing(contract_code, lines)

        # Loop optimization
        self._analyze_loops(contract_code, lines)

        # Storage vs memory
        self._analyze_storage_usage(contract_code, lines)

        # Unchecked arithmetic
        self._analyze_unchecked_arithmetic(contract_code, lines)

        # Events optimization
        self._analyze_events(contract_code, lines)

        # External function visibility
        self._analyze_function_visibility(contract_code, lines)

        # String concatenation
        self._analyze_string_operations(contract_code, lines)

        # Memory array operations
        self._analyze_memory_arrays(contract_code, lines)

        # Zero value checks
        self._analyze_zero_value_checks(contract_code, lines)

        # Custom errors vs require strings
        self._analyze_error_handling(contract_code, lines)

        # Return early pattern
        self._analyze_early_returns(contract_code, lines)

        return [self._to_dict(opt) for opt in self.optimizations]

    def _analyze_state_variable_packing(self, contract_code: str, lines: List[str]):
        """Detect state variable packing opportunities"""
        # Look for consecutive state variables that could be packed
        state_vars = []
        for i, line in enumerate(lines, 1):
            if re.search(r'\b(uint\d+|bytes\d+|bool|address)\s+', line) and 'state' in line.lower():
                state_vars.append((i, line.strip()))

        if len(state_vars) > 3:
            self.optimizations.append(GasOptimization(
                id=f"gas_packing_{state_vars[0][0]}",
                type="state-variable-packing",
                title="State Variable Packing",
                description="Multiple state variables can be packed into fewer storage slots",
                location={"line": state_vars[0][0], "start": 0, "end": 0},
                potentialSavings="20,000-40,000 gas per transaction",
                recommendation="Pack smaller state variables (uint128, bytes1-16, bool) together to reduce storage costs",
                estimatedGasSaved=30000,
                priority=OptimizationPriority.HIGH,
            ))

    def _analyze_loops(self, contract_code: str, lines: List[str]):
        """Detect loop optimization opportunities"""
        for i, line in enumerate(lines, 1):
            lower_line = line.lower()

            # Unchecked increment in loops
            if 'for' in lower_line and 'i++' in lower_line:
                if 'unchecked' not in lower_line:
                    self.optimizations.append(GasOptimization(
                        id=f"gas_loop_unchecked_{i}",
                        type="unchecked-increment",
                        title="Unchecked Loop Increment",
                        description="Loop counter increment can be unchecked for gas savings",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="30-40 gas per iteration",
                        recommendation="Use unchecked { i++; } when overflow is impossible",
                        estimatedGasSaved=35,
                        priority=OptimizationPriority.MEDIUM,
                    ))

            # Storage reads in loops
            if 'for' in lower_line:
                # Check if loop reads from storage
                for j in range(i, min(i + 20, len(lines))):
                    if re.search(r'\b(public|storage)\s+', lines[j].lower()):
                        self.optimizations.append(GasOptimization(
                            id=f"gas_loop_storage_{i}",
                            type="loop-storage-read",
                            title="Storage Reads in Loop",
                            description="Reading from storage in loops is expensive",
                            location={"line": i, "start": 0, "end": 0},
                            potentialSavings="2,100 gas per read",
                            recommendation="Cache storage variables in memory before loop",
                            estimatedGasSaved=2100,
                            priority=OptimizationPriority.HIGH,
                        ))
                        break

    def _analyze_storage_usage(self, contract_code: str, lines: List[str]):
        """Detect unnecessary storage operations"""
        for i, line in enumerate(lines, 1):
            # Local variables that could use memory
            if re.search(r'\b(mapping|struct)\s+.*=\s*', line) and 'memory' not in line.lower() and 'storage' not in line.lower():
                if 'function' in lines[max(0, i-5):i][-1].lower():
                    self.optimizations.append(GasOptimization(
                        id=f"gas_storage_memory_{i}",
                        type="storage-to-memory",
                        title="Use Memory Instead of Storage",
                        description="Local struct/mapping copies should use memory",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="15,000+ gas",
                        recommendation="Use 'memory' keyword for local struct/mapping copies",
                        estimatedGasSaved=15000,
                        priority=OptimizationPriority.MEDIUM,
                    ))

    def _analyze_unchecked_arithmetic(self, contract_code: str, lines: List[str]):
        """Detect arithmetic that can be unchecked"""
        for i, line in enumerate(lines, 1):
            # Safe arithmetic operations
            if re.search(r'[\+\-]\s*[0-9]+', line) or '++' in line or '--' in line:
                if 'unchecked' not in line.lower() and 'require' not in lines[max(0, i-3):i][-1].lower():
                    # Check if operation is safe
                    context = ' '.join(lines[max(0, i-3):i+1]).lower()
                    if 'overflow' not in context and 'underflow' not in context:
                        self.optimizations.append(GasOptimization(
                            id=f"gas_unchecked_arith_{i}",
                            type="unchecked-arithmetic",
                            title="Unchecked Arithmetic",
                            description="Arithmetic operations can be unchecked when safe",
                            location={"line": i, "start": 0, "end": 0},
                            potentialSavings="20-40 gas per operation",
                            recommendation="Use unchecked { } when overflow/underflow is impossible",
                            estimatedGasSaved=30,
                            priority=OptimizationPriority.LOW,
                        ))

    def _analyze_events(self, contract_code: str, lines: List[str]):
        """Detect missing events for important state changes"""
        has_events = 'event' in contract_code.lower()
        
        for i, line in enumerate(lines, 1):
            lower_line = line.lower()
            if ('transfer' in lower_line or 'mint' in lower_line or 'burn' in lower_line) and 'function' in lower_line:
                if not has_events or 'emit' not in ' '.join(lines[i:min(i+10, len(lines))]).lower():
                    self.optimizations.append(GasOptimization(
                        id=f"gas_events_{i}",
                        type="missing-events",
                        title="Missing Events",
                        description="Important state changes should emit events",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="375 gas per event",
                        recommendation="Emit events for important state changes (transfers, mints, burns)",
                        estimatedGasSaved=375,
                        priority=OptimizationPriority.LOW,
                    ))

    def _analyze_function_visibility(self, contract_code: str, lines: List[str]):
        """Detect public functions that could be external"""
        for i, line in enumerate(lines, 1):
            if 'function' in line.lower() and 'public' in line.lower():
                # Check if function is only called externally
                func_name_match = re.search(r'function\s+(\w+)', line)
                if func_name_match:
                    func_name = func_name_match.group(1)
                    # Check if called internally
                    if f'{func_name}(' not in contract_code.lower().replace(line.lower(), ''):
                        self.optimizations.append(GasOptimization(
                            id=f"gas_visibility_{i}",
                            type="function-visibility",
                            title="External vs Public",
                            description="Functions only called externally should be 'external'",
                            location={"line": i, "start": 0, "end": 0},
                            potentialSavings="~100 gas per call",
                            recommendation="Use 'external' instead of 'public' when function is not called internally",
                            estimatedGasSaved=100,
                            priority=OptimizationPriority.LOW,
                        ))

    def _analyze_string_operations(self, contract_code: str, lines: List[str]):
        """Detect expensive string operations"""
        for i, line in enumerate(lines, 1):
            if 'string' in line.lower() and ('+' in line or 'concat' in line.lower()):
                self.optimizations.append(GasOptimization(
                    id=f"gas_string_{i}",
                    type="string-concatenation",
                    title="Expensive String Operations",
                    description="String concatenation is expensive in Solidity",
                    location={"line": i, "start": 0, "end": 0},
                    potentialSavings="Varies",
                    recommendation="Use bytes32 for fixed-size strings or minimize string operations",
                    estimatedGasSaved=0,
                    priority=OptimizationPriority.MEDIUM,
                ))

    def _analyze_memory_arrays(self, contract_code: str, lines: List[str]):
        """Detect memory array optimization opportunities"""
        for i, line in enumerate(lines, 1):
            if '[]' in line and 'memory' in line.lower():
                # Check if array size is known
                if 'new' in line.lower() and 'length' not in line.lower():
                    self.optimizations.append(GasOptimization(
                        id=f"gas_memory_array_{i}",
                        type="memory-array",
                        title="Memory Array Optimization",
                        description="Memory arrays with known size should be fixed-size",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="Per-element gas cost",
                        recommendation="Use fixed-size arrays when size is known at compile time",
                        estimatedGasSaved=0,
                        priority=OptimizationPriority.LOW,
                    ))

    def _analyze_zero_value_checks(self, contract_code: str, lines: List[str]):
        """Detect missing zero value checks"""
        for i, line in enumerate(lines, 1):
            lower_line = line.lower()
            if ('address' in lower_line or 'uint' in lower_line) and 'parameter' in lower_line:
                # Check if zero check exists
                next_lines = ' '.join(lines[i:min(i+10, len(lines))]).lower()
                if '!= 0' not in next_lines and '!= address(0)' not in next_lines:
                    self.optimizations.append(GasOptimization(
                        id=f"gas_zero_check_{i}",
                        type="zero-value-check",
                        title="Missing Zero Value Check",
                        description="Zero value checks can prevent bugs and save gas",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="21,000 gas for failed transaction",
                        recommendation="Add zero value checks for critical parameters",
                        estimatedGasSaved=21000,
                        priority=OptimizationPriority.MEDIUM,
                    ))

    def _analyze_error_handling(self, contract_code: str, lines: List[str]):
        """Detect require statements that could use custom errors"""
        for i, line in enumerate(lines, 1):
            if 'require(' in line.lower() and '"' in line:
                self.optimizations.append(GasOptimization(
                    id=f"gas_custom_error_{i}",
                    type="custom-errors",
                    title="Use Custom Errors",
                    description="Custom errors save gas compared to require with string",
                    location={"line": i, "start": 0, "end": 0},
                    potentialSavings="~50 gas per revert",
                    recommendation="Use custom errors instead of require with error string",
                    estimatedGasSaved=50,
                    priority=OptimizationPriority.MEDIUM,
                ))

    def _analyze_early_returns(self, contract_code: str, lines: List[str]):
        """Detect functions that could use early return pattern"""
        for i, line in enumerate(lines, 1):
            if 'function' in line.lower():
                # Check function body for nested ifs
                func_lines = lines[i:min(i+30, len(lines))]
                if_count = sum(1 for l in func_lines if 'if' in l.lower())
                if if_count > 2:
                    self.optimizations.append(GasOptimization(
                        id=f"gas_early_return_{i}",
                        type="early-return",
                        title="Early Return Pattern",
                        description="Using early returns can reduce nesting and gas",
                        location={"line": i, "start": 0, "end": 0},
                        potentialSavings="Minimal gas, improves readability",
                        recommendation="Use early return pattern to reduce nesting",
                        estimatedGasSaved=0,
                        priority=OptimizationPriority.LOW,
                    ))

    def _to_dict(self, opt: GasOptimization) -> Dict[str, Any]:
        """Convert GasOptimization to dictionary"""
        return {
            "id": opt.id,
            "type": opt.type,
            "title": opt.title,
            "description": opt.description,
            "location": opt.location,
            "potentialSavings": opt.potentialSavings,
            "recommendation": opt.recommendation,
            "estimatedGasSaved": opt.estimatedGasSaved,
            "priority": opt.priority.value,
            "source": opt.source,
        }

#!/usr/bin/env python3
"""
Dependency Analyzer for view0x
Analyzes contract dependencies and inheritance relationships.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class DependencyAnalyzer:
    """Analyzes contract dependencies and relationships"""

    def __init__(self):
        self.inheritance_graph: Dict[str, List[str]] = defaultdict(list)
        self.import_graph: Dict[str, List[str]] = defaultdict(list)
        self.usage_graph: Dict[str, List[str]] = defaultdict(list)

    def extract_contract_definitions(self, contract_code: str) -> List[Dict[str, Any]]:
        """Extract contract, library, and interface definitions"""
        contracts: List[Dict[str, Any]] = []
        
        # Match contract/library/interface definitions with inheritance
        pattern = r'(contract|library|interface)\s+(\w+)(?:\s+is\s+([^{]+))?'
        matches = re.finditer(pattern, contract_code, re.MULTILINE)
        
        for match in matches:
            contract_type = match.group(1)
            contract_name = match.group(2)
            inheritance = match.group(3)
            
            line = contract_code[:match.start()].count('\n') + 1
            
            parent_contracts: List[str] = []
            if inheritance:
                # Split by comma and clean up
                parent_contracts = [
                    p.strip() for p in inheritance.split(',') if p.strip()
                ]
            
            contracts.append({
                "type": contract_type,
                "name": contract_name,
                "parents": parent_contracts,
                "line": line
            })
        
        return contracts

    def build_inheritance_graph(self, contracts: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Build inheritance relationship graph"""
        graph: Dict[str, List[str]] = defaultdict(list)
        
        for contract in contracts:
            contract_name = contract["name"]
            for parent in contract["parents"]:
                graph[contract_name].append(parent)
        
        return dict(graph)

    def find_inheritance_chain(self, contract_name: str, graph: Dict[str, List[str]]) -> List[str]:
        """Find complete inheritance chain for a contract"""
        chain: List[str] = []
        visited: Set[str] = set()
        
        def dfs(node: str):
            if node in visited:
                return
            visited.add(node)
            chain.append(node)
            
            for parent in graph.get(node, []):
                dfs(parent)
        
        dfs(contract_name)
        return chain

    def detect_circular_inheritance(self, graph: Dict[str, List[str]]) -> List[List[str]]:
        """Detect circular inheritance dependencies"""
        cycles: List[List[str]] = []
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        path: List[str] = []
        
        def dfs(node: str):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])
            
            rec_stack.remove(node)
            path.pop()
        
        for node in graph:
            if node not in visited:
                dfs(node)
        
        return cycles

    def find_function_overrides(self, contract_code: str, contract_name: str) -> List[Dict[str, Any]]:
        """Find functions that override parent functions"""
        overrides: List[Dict[str, Any]] = []
        
        # Match function definitions with override keyword
        pattern = r'function\s+(\w+)[^{]*override'
        matches = re.finditer(pattern, contract_code, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            func_name = match.group(1)
            line = contract_code[:match.start()].count('\n') + 1
            
            overrides.append({
                "contract": contract_name,
                "function": func_name,
                "line": line
            })
        
        return overrides

    def analyze_external_dependencies(self, contract_code: str) -> List[Dict[str, Any]]:
        """Analyze external contract dependencies"""
        dependencies: List[Dict[str, Any]] = []
        
        # Find external contract references
        # Pattern: IContractName, contractName.function(), etc.
        external_pattern = r'\b([A-Z][a-zA-Z0-9_]*)\s*\.'
        matches = re.finditer(external_pattern, contract_code)
        
        for match in matches:
            contract_ref = match.group(1)
            line = contract_code[:match.start()].count('\n') + 1
            
            dependencies.append({
                "type": "external_call",
                "contract": contract_ref,
                "line": line
            })
        
        return dependencies

    def analyze_library_usage(self, contract_code: str) -> List[Dict[str, Any]]:
        """Analyze library usage in contract"""
        libraries: List[Dict[str, Any]] = []
        
        # Find library function calls: LibraryName.function()
        library_pattern = r'\b([A-Z][a-zA-Z0-9_]*)\s*\.\s*(\w+)\s*\('
        matches = re.finditer(library_pattern, contract_code)
        
        for match in matches:
            library_name = match.group(1)
            func_name = match.group(2)
            line = contract_code[:match.start()].count('\n') + 1
            
            libraries.append({
                "library": library_name,
                "function": func_name,
                "line": line
            })
        
        return libraries

    def analyze_interface_implementations(
        self,
        contracts: List[Dict[str, Any]],
        contract_code: str
    ) -> List[Dict[str, Any]]:
        """Check if contracts properly implement interfaces"""
        implementations: List[Dict[str, Any]] = []
        
        # Find interfaces in inheritance
        for contract in contracts:
            for parent in contract["parents"]:
                # Check if parent is an interface (simplified check)
                if any(c["name"] == parent and c["type"] == "interface" for c in contracts):
                    # Check if required functions are implemented
                    # (Simplified: just note the interface)
                    implementations.append({
                        "contract": contract["name"],
                        "interface": parent,
                        "status": "implemented"  # Would need deeper analysis
                    })
        
        return implementations

    def generate_dependency_report(
        self,
        contract_code: str
    ) -> Dict[str, Any]:
        """Generate comprehensive dependency report"""
        contracts = self.extract_contract_definitions(contract_code)
        inheritance_graph = self.build_inheritance_graph(contracts)
        
        # Analyze each contract
        contract_analyses: Dict[str, Dict[str, Any]] = {}
        
        for contract in contracts:
            contract_name = contract["name"]
            inheritance_chain = self.find_inheritance_chain(contract_name, inheritance_graph)
            overrides = self.find_function_overrides(contract_code, contract_name)
            external_deps = self.analyze_external_dependencies(contract_code)
            library_usage = self.analyze_library_usage(contract_code)
            
            contract_analyses[contract_name] = {
                "type": contract["type"],
                "inheritanceChain": inheritance_chain,
                "parents": contract["parents"],
                "functionOverrides": overrides,
                "externalDependencies": external_deps,
                "libraryUsage": library_usage
            }
        
        # Detect issues
        circular_inheritance = self.detect_circular_inheritance(inheritance_graph)
        interface_implementations = self.analyze_interface_implementations(contracts, contract_code)
        
        return {
            "contracts": contracts,
            "inheritanceGraph": dict(inheritance_graph),
            "contractAnalyses": contract_analyses,
            "circularInheritance": circular_inheritance,
            "interfaceImplementations": interface_implementations,
            "issues": self._detect_dependency_issues(contracts, inheritance_graph, circular_inheritance)
        }

    def _detect_dependency_issues(
        self,
        contracts: List[Dict[str, Any]],
        inheritance_graph: Dict[str, List[str]],
        circular_inheritance: List[List[str]]
    ) -> List[Dict[str, Any]]:
        """Detect issues in dependency structure"""
        issues: List[Dict[str, Any]] = []
        
        # Check for circular inheritance
        if circular_inheritance:
            for cycle in circular_inheritance:
                issues.append({
                    "type": "circular_inheritance",
                    "severity": "HIGH",
                    "description": f"Circular inheritance detected: {' -> '.join(cycle)}",
                    "contracts": cycle
                })
        
        # Check for deep inheritance chains
        for contract in contracts:
            chain = self.find_inheritance_chain(contract["name"], inheritance_graph)
            if len(chain) > 5:
                issues.append({
                    "type": "deep_inheritance",
                    "severity": "MEDIUM",
                    "description": f"Contract {contract['name']} has deep inheritance chain ({len(chain)} levels)",
                    "contract": contract["name"],
                    "chainLength": len(chain)
                })
        
        # Check for missing parent contracts
        all_parents: Set[str] = set()
        all_contracts: Set[str] = {c["name"] for c in contracts}
        
        for contract in contracts:
            all_parents.update(contract["parents"])
        
        missing_parents = all_parents - all_contracts
        if missing_parents:
            issues.append({
                "type": "missing_parent_contract",
                "severity": "HIGH",
                "description": f"Referenced parent contracts not found: {', '.join(missing_parents)}",
                "missingContracts": list(missing_parents)
            })
        
        return issues

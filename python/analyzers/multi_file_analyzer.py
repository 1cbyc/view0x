#!/usr/bin/env python3
"""
Multi-File Analyzer for view0x
Supports analysis of contracts with multiple files and imports.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Set
from pathlib import Path
from collections import defaultdict

logger = logging.getLogger(__name__)

class MultiFileAnalyzer:
    """Analyzes multi-file Solidity contracts"""

    def __init__(self):
        self.import_cache: Dict[str, str] = {}
        self.file_map: Dict[str, str] = {}  # filename -> content

    def extract_imports(self, contract_code: str) -> List[Dict[str, Any]]:
        """Extract import statements from contract code"""
        imports: List[Dict[str, Any]] = []
        
        # Match import statements
        import_pattern = r'import\s+(?:"([^"]+)"|\'([^\']+)\')\s*(?:as\s+(\w+))?;'
        matches = re.finditer(import_pattern, contract_code, re.MULTILINE)
        
        for match in matches:
            import_path = match.group(1) or match.group(2)
            alias = match.group(3)
            
            imports.append({
                "path": import_path,
                "alias": alias,
                "line": contract_code[:match.start()].count('\n') + 1,
                "statement": match.group(0)
            })
        
        return imports

    def resolve_import_path(self, import_path: str, base_path: Optional[str] = None) -> Optional[str]:
        """Resolve import path to actual file content"""
        # Check cache first
        if import_path in self.import_cache:
            return self.import_cache[import_path]
        
        # Check file_map
        if import_path in self.file_map:
            return self.file_map[import_path]
        
        # Try to resolve from base path
        if base_path:
            resolved_path = Path(base_path).parent / import_path
            if resolved_path.exists():
                try:
                    with open(resolved_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        self.import_cache[import_path] = content
                        return content
                except Exception as e:
                    logger.warning(f"Failed to read import file {resolved_path}: {e}")
        
        return None

    def build_dependency_graph(
        self,
        files: Dict[str, str]
    ) -> Dict[str, List[str]]:
        """Build dependency graph of files"""
        self.file_map = files
        graph: Dict[str, List[str]] = defaultdict(list)
        
        for filename, content in files.items():
            imports = self.extract_imports(content)
            for imp in imports:
                import_path = imp["path"]
                # Normalize path
                if import_path not in graph[filename]:
                    graph[filename].append(import_path)
        
        return graph

    def topological_sort(self, graph: Dict[str, List[str]]) -> List[str]:
        """Topologically sort files by dependencies"""
        # Build reverse graph for Kahn's algorithm
        in_degree: Dict[str, int] = defaultdict(int)
        for node in graph:
            in_degree[node] = 0
        
        for node in graph:
            for neighbor in graph[node]:
                in_degree[neighbor] = in_degree.get(neighbor, 0) + 1
        
        # Find all nodes with no incoming edges
        queue: List[str] = [node for node in graph if in_degree[node] == 0]
        result: List[str] = []
        
        while queue:
            node = queue.pop(0)
            result.append(node)
            
            # Remove edges from this node
            for neighbor in graph.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Add remaining nodes (circular dependencies)
        for node in graph:
            if node not in result:
                result.append(node)
        
        return result

    def merge_files(self, files: Dict[str, str], main_file: str) -> str:
        """Merge multiple files into a single file for analysis"""
        sorted_files = self.topological_sort(self.build_dependency_graph(files))
        merged_content: List[str] = []
        processed_imports: Set[str] = set()
        
        # Add main file first
        if main_file in files:
            content = files[main_file]
            imports = self.extract_imports(content)
            
            # Remove import statements and replace with file content
            for imp in reversed(imports):
                import_path = imp["path"]
                if import_path not in processed_imports and import_path in files:
                    import_content = files[import_path]
                    # Remove imports from imported file
                    import_imports = self.extract_imports(import_content)
                    for sub_imp in import_imports:
                        sub_path = sub_imp["path"]
                        if sub_path in files and sub_path not in processed_imports:
                            processed_imports.add(sub_path)
                            # Insert at beginning
                            merged_content.insert(0, f"\n// Imported from {sub_path}\n{files[sub_path]}\n")
                    processed_imports.add(import_path)
                    merged_content.insert(0, f"\n// Imported from {import_path}\n{import_content}\n")
            
            # Remove import statements from main file
            for imp in reversed(imports):
                content = content.replace(imp["statement"], "", 1)
            
            merged_content.append(f"\n// Main file: {main_file}\n{content}")
        else:
            # If main file not specified, use first file
            for filename in sorted_files:
                if filename in files:
                    merged_content.append(f"\n// File: {filename}\n{files[filename]}\n")
        
        return "\n".join(merged_content)

    def extract_contract_definitions(self, content: str) -> List[Dict[str, Any]]:
        """Extract contract definitions from merged content"""
        contracts: List[Dict[str, Any]] = []
        
        # Match contract definitions
        contract_pattern = r'(contract|library|interface)\s+(\w+)'
        matches = re.finditer(contract_pattern, content, re.MULTILINE)
        
        for match in matches:
            contract_type = match.group(1)
            contract_name = match.group(2)
            line = content[:match.start()].count('\n') + 1
            
            contracts.append({
                "type": contract_type,
                "name": contract_name,
                "line": line
            })
        
        return contracts

    def analyze_multi_file(
        self,
        files: Dict[str, str],
        main_file: str
    ) -> Dict[str, Any]:
        """Analyze multi-file contract project"""
        dependency_graph = self.build_dependency_graph(files)
        sorted_files = self.topological_sort(dependency_graph)
        merged_content = self.merge_files(files, main_file)
        
        return {
            "files": list(files.keys()),
            "mainFile": main_file,
            "dependencyGraph": dict(dependency_graph),
            "sortedOrder": sorted_files,
            "mergedContent": merged_content,
            "contracts": self.extract_contract_definitions(merged_content),
            "imports": {
                filename: self.extract_imports(content)
                for filename, content in files.items()
            }
        }

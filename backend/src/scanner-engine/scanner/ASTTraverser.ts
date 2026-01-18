/**
 * Enhanced AST Traversal Utility for view0x Scanner
 * Provides efficient and context-aware traversal of Solidity AST nodes
 */

export interface ASTNode {
  type: string;
  children?: ASTNode[];
  parent?: ASTNode;
  loc?: {
    start?: { line: number; column: number; offset: number };
    end?: { line: number; column: number; offset: number };
  };
  [key: string]: any;
}

export interface TraversalContext {
  node: ASTNode;
  parent?: ASTNode;
  ancestors: ASTNode[];
  depth: number;
  path: string[];
}

export type NodeVisitor = (context: TraversalContext) => void | boolean;

export class ASTTraverser {
  private nodeCache: Map<ASTNode, Map<string, any>> = new Map();
  private parentMap: WeakMap<ASTNode, ASTNode> = new WeakMap();
  private nodeTypeIndex: Map<string, ASTNode[]> = new Map();

  constructor(private root: ASTNode) {
    this.buildParentMap(root);
    this.buildTypeIndex(root);
  }

  /**
   * Build parent-child relationship map
   */
  private buildParentMap(node: ASTNode, parent?: ASTNode): void {
    if (parent) {
      this.parentMap.set(node, parent);
    }

    // Traverse children
    const children = this.getChildren(node);
    children.forEach(child => {
      this.buildParentMap(child, node);
    });
  }

  /**
   * Build index of nodes by type for fast lookups
   */
  private buildTypeIndex(node: ASTNode): void {
    const type = node.type;
    if (!this.nodeTypeIndex.has(type)) {
      this.nodeTypeIndex.set(type, []);
    }
    this.nodeTypeIndex.get(type)!.push(node);

    const children = this.getChildren(node);
    children.forEach(child => this.buildTypeIndex(child));
  }

  /**
   * Get all child nodes from a node
   */
  private getChildren(node: ASTNode): ASTNode[] {
    const children: ASTNode[] = [];

    // Common AST structures
    if (Array.isArray(node.children)) {
      children.push(...node.children);
    }

    // Function definitions
    if (node.type === 'FunctionDefinition' && node.body?.statements) {
      children.push(...node.body.statements);
    }

    // Contract/Library/Interface definitions
    if ((node.type === 'ContractDefinition' || node.type === 'LibraryDefinition' || node.type === 'InterfaceDefinition') && node.subNodes) {
      children.push(...node.subNodes);
    }

    // Block statements
    if (node.type === 'Block' && node.statements) {
      children.push(...node.statements);
    }

    // Expression statements
    if (node.type === 'ExpressionStatement' && node.expression) {
      children.push(node.expression);
    }

    // Binary operations
    if (node.type === 'BinaryOperation') {
      if (node.left) children.push(node.left);
      if (node.right) children.push(node.right);
    }

    // Unary operations
    if (node.type === 'UnaryOperation' && node.subExpression) {
      children.push(node.subExpression);
    }

    // Function calls
    if (node.type === 'FunctionCall') {
      if (node.expression) children.push(node.expression);
      if (node.arguments) {
        children.push(...node.arguments);
      }
    }

    // Member access
    if (node.type === 'MemberAccess' && node.expression) {
      children.push(node.expression);
    }

    // Conditional statements
    if (node.type === 'IfStatement') {
      if (node.condition) children.push(node.trueBody);
      if (node.trueBody) children.push(node.trueBody);
      if (node.falseBody) children.push(node.falseBody);
    }

    // While loops
    if (node.type === 'WhileStatement') {
      if (node.condition) children.push(node.condition);
      if (node.body) children.push(node.body);
    }

    // For loops
    if (node.type === 'ForStatement') {
      if (node.initExpression) children.push(node.initExpression);
      if (node.conditionExpression) children.push(node.conditionExpression);
      if (node.loopExpression) children.push(node.loopExpression);
      if (node.body) children.push(node.body);
    }

    // Return statements
    if (node.type === 'ReturnStatement' && node.expression) {
      children.push(node.expression);
    }

    // Variable declarations
    if (node.type === 'VariableDeclaration' && node.value) {
      children.push(node.value);
    }

    // Assignments
    if (node.type === 'Assignment') {
      if (node.leftHandSide) children.push(node.leftHandSide);
      if (node.rightHandSide) children.push(node.rightHandSide);
    }

    // Modifier invocations
    if (node.type === 'ModifierInvocation' && node.arguments) {
      children.push(...node.arguments);
    }

    return children;
  }

  /**
   * Traverse AST with visitor pattern
   */
  traverse(visitor: NodeVisitor, options: { skipRoot?: boolean } = {}): void {
    const context: TraversalContext = {
      node: this.root,
      ancestors: [],
      depth: 0,
      path: []
    };

    if (!options.skipRoot) {
      const shouldContinue = visitor(context);
      if (shouldContinue === false) return;
    }

    this.traverseNode(this.root, visitor, [], 0, []);
  }

  private traverseNode(
    node: ASTNode,
    visitor: NodeVisitor,
    ancestors: ASTNode[],
    depth: number,
    path: string[]
  ): void {
    const children = this.getChildren(node);
    const newAncestors = [...ancestors, node];

    children.forEach((child, index) => {
      const childPath = [...path, `${node.type}[${index}]`];
      const context: TraversalContext = {
        node: child,
        parent: node,
        ancestors: newAncestors,
        depth: depth + 1,
        path: childPath
      };

      const shouldContinue = visitor(context);
      if (shouldContinue !== false) {
        this.traverseNode(child, visitor, newAncestors, depth + 1, childPath);
      }
    });
  }

  /**
   * Find all nodes of a specific type
   */
  findAllNodesOfType(type: string): ASTNode[] {
    return this.nodeTypeIndex.get(type) || [];
  }

  /**
   * Find first node of a specific type
   */
  findFirstNodeOfType(type: string): ASTNode | null {
    const nodes = this.findAllNodesOfType(type);
    return nodes.length > 0 ? nodes[0] : null;
  }

  /**
   * Find nodes matching a predicate
   */
  findNodes(predicate: (node: ASTNode, context: TraversalContext) => boolean): ASTNode[] {
    const results: ASTNode[] = [];

    this.traverse((context) => {
      if (predicate(context.node, context)) {
        results.push(context.node);
      }
    });

    return results;
  }

  /**
   * Get parent node
   */
  getParent(node: ASTNode): ASTNode | undefined {
    return this.parentMap.get(node);
  }

  /**
   * Get all ancestors of a node
   */
  getAncestors(node: ASTNode): ASTNode[] {
    const ancestors: ASTNode[] = [];
    let current: ASTNode | undefined = this.parentMap.get(node);

    while (current) {
      ancestors.push(current);
      current = this.parentMap.get(current);
    }

    return ancestors;
  }

  /**
   * Check if a node is a descendant of another node
   */
  isDescendantOf(node: ASTNode, ancestor: ASTNode): boolean {
    const ancestors = this.getAncestors(node);
    return ancestors.includes(ancestor);
  }

  /**
   * Find the nearest ancestor of a specific type
   */
  findNearestAncestor(node: ASTNode, type: string): ASTNode | null {
    const ancestors = this.getAncestors(node);
    return ancestors.find(a => a.type === type) || null;
  }

  /**
   * Get siblings of a node
   */
  getSiblings(node: ASTNode): ASTNode[] {
    const parent = this.getParent(node);
    if (!parent) return [];

    const children = this.getChildren(parent);
    return children.filter(child => child !== node);
  }

  /**
   * Get the line number for a node
   */
  getLineNumber(node: ASTNode): number {
    return node.loc?.start?.line || 0;
  }

  /**
   * Get node location information
   */
  getLocation(node: ASTNode): { line: number; column: number; offset: number } | null {
    if (!node.loc?.start) return null;

    return {
      line: node.loc.start.line,
      column: node.loc.start.column,
      offset: node.loc.start.offset || 0
    };
  }

  /**
   * Check if a node is inside a specific function
   */
  isInsideFunction(node: ASTNode, functionName?: string): boolean {
    const func = this.findNearestAncestor(node, 'FunctionDefinition');
    if (!func) return false;

    if (functionName) {
      return func.name === functionName;
    }

    return true;
  }

  /**
   * Check if a node is inside a specific contract
   */
  isInsideContract(node: ASTNode, contractName?: string): boolean {
    const contract = this.findNearestAncestor(node, 'ContractDefinition');
    if (!contract) return false;

    if (contractName) {
      return contract.name === contractName;
    }

    return true;
  }

  /**
   * Find all function definitions
   */
  findAllFunctions(): ASTNode[] {
    return this.findAllNodesOfType('FunctionDefinition');
  }

  /**
   * Find function by name
   */
  findFunction(name: string): ASTNode | null {
    const functions = this.findAllFunctions();
    return functions.find(f => f.name === name) || null;
  }

  /**
   * Find all contract definitions
   */
  findAllContracts(): ASTNode[] {
    return this.findAllNodesOfType('ContractDefinition');
  }

  /**
   * Clear caches (useful for memory management)
   */
  clearCache(): void {
    this.nodeCache.clear();
    this.nodeTypeIndex.clear();
  }
}

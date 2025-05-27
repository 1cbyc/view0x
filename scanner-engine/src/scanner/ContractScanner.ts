import { parse } from '@solidity-parser/parser';
import * as solc from 'solc';

export interface ScanResult {
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  codeQuality: CodeQualityIssue[];
  overallScore: number;
}

export interface Vulnerability {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  lineNumber: number;
  recommendation: string;
}

export interface GasOptimization {
  type: string;
  potentialSavings: string;
  description: string;
  lineNumber: number;
  recommendation: string;
}

export interface CodeQualityIssue {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  lineNumber: number;
  recommendation: string;
}

export class ContractScanner {
  private contractCode: string;
  private ast: any;
  private lineMap: Map<number, number>;

  constructor(contractCode: string) {
    this.contractCode = contractCode;
    this.ast = parse(contractCode);
    this.lineMap = this.createLineMap();
  }

  private createLineMap(): Map<number, number> {
    const lines = this.contractCode.split('\n');
    const map = new Map<number, number>();
    let currentPosition = 0;

    lines.forEach((line, index) => {
      map.set(currentPosition, index + 1);
      currentPosition += line.length + 1; // +1 for newline
    });

    return map;
  }

  private getLineNumber(position: number): number {
    const positions = Array.from(this.lineMap.keys()).sort((a, b) => a - b);
    let lineNumber = 1;

    for (const pos of positions) {
      if (position >= pos) {
        lineNumber = this.lineMap.get(pos) || 1;
      } else {
        break;
      }
    }

    return lineNumber;
  }

  public async scan(): Promise<ScanResult> {
    const vulnerabilities = await this.detectVulnerabilities();
    const gasOptimizations = this.analyzeGasOptimizations();
    const codeQuality = this.assessCodeQuality();

    const overallScore = this.calculateOverallScore(vulnerabilities, gasOptimizations, codeQuality);

    return {
      vulnerabilities,
      gasOptimizations,
      codeQuality,
      overallScore
    };
  }

  private async detectVulnerabilities(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    // Check for reentrancy vulnerabilities
    this.checkReentrancy(vulnerabilities);
    
    // Check for integer overflow/underflow
    this.checkIntegerOverflow(vulnerabilities);
    
    // Check for unprotected selfdestruct
    this.checkUnprotectedSelfdestruct(vulnerabilities);
    
    // Check for tx.origin usage
    this.checkTxOriginUsage(vulnerabilities);
    
    // Check for unchecked external calls
    this.checkUncheckedExternalCalls(vulnerabilities);
    
    // Check for weak randomness
    this.checkWeakRandomness(vulnerabilities);
    
    // Check for missing access control
    this.checkMissingAccessControl(vulnerabilities);
    
    // Check for dangerous delegatecall
    this.checkDangerousDelegatecall(vulnerabilities);

    return vulnerabilities;
  }

  private checkReentrancy(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    
    functions.forEach(func => {
      const stateChanges = this.findStateChanges(func);
      const externalCalls = this.findExternalCalls(func);
      
      // Check if there are external calls followed by state changes
      externalCalls.forEach(call => {
        const callPosition = call.loc?.start?.offset || 0;
        const callLine = this.getLineNumber(callPosition);
        
        // Find state changes that occur after the external call
        const subsequentStateChanges = stateChanges.filter(change => {
          const changePosition = change.loc?.start?.offset || 0;
          return changePosition > callPosition;
        });

        if (subsequentStateChanges.length > 0) {
          vulnerabilities.push({
            type: 'reentrancy',
            severity: 'HIGH',
            description: 'Potential reentrancy vulnerability: State changes after external call',
            lineNumber: callLine,
            recommendation: 'Consider using the checks-effects-interactions pattern. Update state variables before making external calls.'
          });
        }
      });
    });
  }

  private findFunctions(node: any): any[] {
    const functions: any[] = [];
    
    if (node.type === 'FunctionDefinition') {
      functions.push(node);
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        functions.push(...this.findFunctions(child));
      });
    }
    
    return functions;
  }

  private findStateChanges(node: any): any[] {
    const stateChanges: any[] = [];
    
    if (node.type === 'Assignment' || 
        node.type === 'VariableDeclaration' ||
        node.type === 'ExpressionStatement' && 
        node.expression.type === 'Assignment') {
      stateChanges.push(node);
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        stateChanges.push(...this.findStateChanges(child));
      });
    }
    
    return stateChanges;
  }

  private findExternalCalls(node: any): any[] {
    const externalCalls: any[] = [];
    
    if (node.type === 'FunctionCall' && 
        (node.expression.type === 'MemberAccess' || 
         node.expression.type === 'Identifier')) {
      const callName = node.expression.name || 
                      (node.expression.memberName || '');
      
      if (['call', 'send', 'transfer', 'delegatecall'].includes(callName)) {
        externalCalls.push(node);
      }
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        externalCalls.push(...this.findExternalCalls(child));
      });
    }
    
    return externalCalls;
  }

  private checkIntegerOverflow(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    
    functions.forEach(func => {
      const arithmeticOps = this.findArithmeticOperations(func);
      
      arithmeticOps.forEach(op => {
        const opPosition = op.loc?.start?.offset || 0;
        const opLine = this.getLineNumber(opPosition);
        
        // Check if the operation is protected by SafeMath or similar
        const isProtected = this.isOperationProtected(op);
        
        if (!isProtected) {
          vulnerabilities.push({
            type: 'integer-overflow',
            severity: 'HIGH',
            description: 'Potential integer overflow/underflow in arithmetic operation',
            lineNumber: opLine,
            recommendation: 'Use SafeMath library or Solidity 0.8.0+ for automatic overflow checks. Consider adding explicit checks for overflow/underflow conditions.'
          });
        }
      });
    });
  }

  private findArithmeticOperations(node: any): any[] {
    const operations: any[] = [];
    
    if (node.type === 'BinaryOperation' && 
        ['+', '-', '*', '/', '%'].includes(node.operator)) {
      operations.push(node);
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        operations.push(...this.findArithmeticOperations(child));
      });
    }
    
    return operations;
  }

  private isOperationProtected(node: any): boolean {
    // Check if the operation is wrapped in a SafeMath call
    let parent = node.parent;
    while (parent) {
      if (parent.type === 'FunctionCall' && 
          parent.expression.type === 'MemberAccess' &&
          ['add', 'sub', 'mul', 'div', 'mod'].includes(parent.expression.memberName)) {
        return true;
      }
      parent = parent.parent;
    }
    
    // Check if the contract is using Solidity 0.8.0 or higher
    const pragmaDirective = this.findPragmaDirective(this.ast);
    if (pragmaDirective) {
      const version = pragmaDirective.value;
      return version.startsWith('^0.8.') || version.startsWith('>=0.8.');
    }
    
    return false;
  }

  private findPragmaDirective(node: any): any {
    if (node.type === 'PragmaDirective') {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const pragma = this.findPragmaDirective(child);
        if (pragma) return pragma;
      }
    }
    
    return null;
  }

  private checkUnprotectedSelfdestruct(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    
    functions.forEach(func => {
      const selfdestructCalls = this.findSelfdestructCalls(func);
      
      selfdestructCalls.forEach(call => {
        const callPosition = call.loc?.start?.offset || 0;
        const callLine = this.getLineNumber(callPosition);
        
        // Check if the function has proper access control
        const hasAccessControl = this.hasAccessControl(func);
        
        if (!hasAccessControl) {
          vulnerabilities.push({
            type: 'unprotected-selfdestruct',
            severity: 'HIGH',
            description: 'Unprotected selfdestruct call: Function lacks proper access control',
            lineNumber: callLine,
            recommendation: 'Add access control modifiers (e.g., onlyOwner) to functions containing selfdestruct calls. Consider implementing a timelock mechanism for critical operations.'
          });
        }
      });
    });
  }

  private findSelfdestructCalls(node: any): any[] {
    const calls: any[] = [];
    
    if (node.type === 'FunctionCall' && 
        node.expression.type === 'Identifier' &&
        node.expression.name === 'selfdestruct') {
      calls.push(node);
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        calls.push(...this.findSelfdestructCalls(child));
      });
    }
    
    return calls;
  }

  private hasAccessControl(node: any): boolean {
    // Check for common access control modifiers
    const accessControlModifiers = [
      'onlyOwner',
      'onlyAdmin',
      'onlyAuthorized',
      'onlyRole',
      'requireAuth'
    ];
    
    if (node.modifiers) {
      return node.modifiers.some((mod: any) => 
        accessControlModifiers.includes(mod.name)
      );
    }
    
    // Check for require statements with owner checks
    const requireStatements = this.findRequireStatements(node);
    return requireStatements.some((stmt: any) => {
      const condition = stmt.condition;
      return (
        (condition.type === 'BinaryOperation' && 
         condition.operator === '==' &&
         (this.isOwnerCheck(condition.left) || this.isOwnerCheck(condition.right))) ||
        (condition.type === 'FunctionCall' &&
         condition.expression.type === 'Identifier' &&
         accessControlModifiers.includes(condition.expression.name))
      );
    });
  }

  private findRequireStatements(node: any): any[] {
    const statements: any[] = [];
    
    if (node.type === 'FunctionCall' && 
        node.expression.type === 'Identifier' &&
        node.expression.name === 'require') {
      statements.push(node);
    }
    
    if (node.children) {
      node.children.forEach((child: any) => {
        statements.push(...this.findRequireStatements(child));
      });
    }
    
    return statements;
  }

  private isOwnerCheck(node: any): boolean {
    if (node.type === 'MemberAccess') {
      return node.memberName === 'owner' || 
             (node.expression.type === 'Identifier' && 
              node.expression.name === 'msg' && 
              node.memberName === 'sender');
    }
    return false;
  }

  private checkTxOriginUsage(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    functions.forEach(func => {
      const txOriginUsages = this.findTxOriginUsages(func);
      txOriginUsages.forEach(usage => {
        const usagePosition = usage.loc?.start?.offset || 0;
        const usageLine = this.getLineNumber(usagePosition);
        vulnerabilities.push({
          type: 'tx-origin-usage',
          severity: 'HIGH',
          description: 'Dangerous use of tx.origin for authorization. This can be exploited in phishing attacks.',
          lineNumber: usageLine,
          recommendation: 'Use msg.sender for authorization instead of tx.origin.'
        });
      });
    });
  }

  private findTxOriginUsages(node: any): any[] {
    const usages: any[] = [];
    if (node.type === 'MemberAccess' && node.expression.type === 'Identifier' && node.expression.name === 'tx' && node.memberName === 'origin') {
      usages.push(node);
    }
    if (node.children) {
      node.children.forEach((child: any) => {
        usages.push(...this.findTxOriginUsages(child));
      });
    }
    return usages;
  }

  private checkUncheckedExternalCalls(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    functions.forEach(func => {
      const externalCalls = this.findExternalCalls(func);
      externalCalls.forEach(call => {
        // Check if the return value is used (i.e., checked)
        if (!this.isExternalCallChecked(call, func)) {
          const callPosition = call.loc?.start?.offset || 0;
          const callLine = this.getLineNumber(callPosition);
          vulnerabilities.push({
            type: 'unchecked-external-call',
            severity: 'MEDIUM',
            description: 'Unchecked external call. The return value of an external call should be checked to ensure it succeeded.',
            lineNumber: callLine,
            recommendation: 'Check the return value of external calls and handle failures appropriately.'
          });
        }
      });
    });
  }

  private isExternalCallChecked(call: any, func: any): boolean {
    // Naive check: see if the parent is a require/assert or if/while condition
    let parent = call.parent;
    while (parent) {
      if (parent.type === 'FunctionCall' && parent.expression.type === 'Identifier' && ['require', 'assert'].includes(parent.expression.name)) {
        return true;
      }
      if (parent.type === 'IfStatement' || parent.type === 'WhileStatement') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  private checkWeakRandomness(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    functions.forEach(func => {
      const weakRandomness = this.findWeakRandomness(func);
      weakRandomness.forEach(expr => {
        const exprPosition = expr.loc?.start?.offset || 0;
        const exprLine = this.getLineNumber(exprPosition);
        vulnerabilities.push({
          type: 'weak-randomness',
          severity: 'MEDIUM',
          description: 'Weak randomness source detected. Using block variables for randomness is insecure.',
          lineNumber: exprLine,
          recommendation: 'Use a secure randomness source such as Chainlink VRF.'
        });
      });
    });
  }

  private findWeakRandomness(node: any): any[] {
    const weak: any[] = [];
    // Look for keccak256(...block.timestamp...) or ...block.difficulty...
    if (node.type === 'FunctionCall' && node.expression.type === 'Identifier' && node.expression.name === 'keccak256') {
      if (JSON.stringify(node).includes('block.timestamp') || JSON.stringify(node).includes('block.difficulty')) {
        weak.push(node);
      }
    }
    if (node.type === 'MemberAccess' && node.expression.type === 'Identifier' && node.expression.name === 'block' && ['timestamp', 'difficulty', 'number', 'hash'].includes(node.memberName)) {
      weak.push(node);
    }
    if (node.children) {
      node.children.forEach((child: any) => {
        weak.push(...this.findWeakRandomness(child));
      });
    }
    return weak;
  }

  private checkMissingAccessControl(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    functions.forEach(func => {
      // Only check public/external functions
      if (func.visibility === 'public' || func.visibility === 'external') {
        if (!this.hasAccessControl(func)) {
          const funcPosition = func.loc?.start?.offset || 0;
          const funcLine = this.getLineNumber(funcPosition);
          vulnerabilities.push({
            type: 'missing-access-control',
            severity: 'HIGH',
            description: 'Function is public or external and lacks access control. This may allow unauthorized access.',
            lineNumber: funcLine,
            recommendation: 'Add access control modifiers (e.g., onlyOwner) or require statements to restrict access.'
          });
        }
      }
    });
  }

  private checkDangerousDelegatecall(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);
    functions.forEach(func => {
      const delegatecalls = this.findDelegatecalls(func);
      delegatecalls.forEach(call => {
        const callPosition = call.loc?.start?.offset || 0;
        const callLine = this.getLineNumber(callPosition);
        vulnerabilities.push({
          type: 'dangerous-delegatecall',
          severity: 'HIGH',
          description: 'Dangerous use of delegatecall. This can lead to code execution vulnerabilities.',
          lineNumber: callLine,
          recommendation: 'Avoid using delegatecall unless absolutely necessary. If used, ensure strict input validation and access control.'
        });
      });
    });
  }

  private findDelegatecalls(node: any): any[] {
    const calls: any[] = [];
    if (node.type === 'FunctionCall' && node.expression.type === 'MemberAccess' && node.expression.memberName === 'delegatecall') {
      calls.push(node);
    }
    if (node.children) {
      node.children.forEach((child: any) => {
        calls.push(...this.findDelegatecalls(child));
      });
    }
    return calls;
  }

  private analyzeGasOptimizations(): GasOptimization[] {
    // Placeholder: Always return a sample optimization
    return [{
      type: 'state-variable-packing',
      potentialSavings: 'Moderate',
      description: 'Consider packing state variables of the same type together to reduce storage costs.',
      lineNumber: 1,
      recommendation: 'Group smaller state variables together to optimize storage.'
    }];
  }

  private assessCodeQuality(): CodeQualityIssue[] {
    // Placeholder: Always return a sample code quality issue
    return [{
      type: 'missing-documentation',
      severity: 'LOW',
      description: 'Some functions are missing documentation comments.',
      lineNumber: 1,
      recommendation: 'Add NatSpec comments to all public and external functions.'
    }];
  }

  private calculateOverallScore(
    vulnerabilities: Vulnerability[],
    gasOptimizations: GasOptimization[],
    codeQuality: CodeQualityIssue[]
  ): number {
    // Implementation for overall score calculation
    // This will calculate a comprehensive security score based on all findings
    return 0; // Placeholder
  }
} 
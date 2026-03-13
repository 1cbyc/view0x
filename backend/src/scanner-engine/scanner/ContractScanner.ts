import { parse } from "@solidity-parser/parser";
import { ASTNode, ASTTraverser } from "./ASTTraverser";

export interface ScanResult {
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  codeQuality: CodeQualityIssue[];
  overallScore: number;
}

export interface Vulnerability {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
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
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  lineNumber: number;
  recommendation: string;
}

export class ContractScanner {
  private contractCode: string;
  private ast: ASTNode;
  private lineMap: Map<number, number>;
  private traverser: ASTTraverser;

  constructor(contractCode: string) {
    this.contractCode = contractCode;
    this.ast = parse(contractCode, { loc: true }) as ASTNode;
    this.lineMap = this.createLineMap();
    this.traverser = new ASTTraverser(this.ast);
  }

  private createLineMap(): Map<number, number> {
    const lines = this.contractCode.split("\n");
    const map = new Map<number, number>();
    let currentPosition = 0;

    lines.forEach((line, index) => {
      map.set(currentPosition, index + 1);
      currentPosition += line.length + 1;
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

  private getNodeLineNumber(node: ASTNode): number {
    return node.loc?.start?.line || this.getLineNumber(node.loc?.start?.offset || 0);
  }

  private findNodesInSubtree(
    root: ASTNode,
    predicate: (node: ASTNode) => boolean,
  ): ASTNode[] {
    return this.traverser.findNodes((node) => {
      if (node === root) {
        return predicate(node);
      }

      return this.traverser.isDescendantOf(node, root) && predicate(node);
    });
  }

  public async scan(): Promise<ScanResult> {
    const vulnerabilities = await this.detectVulnerabilities();
    const gasOptimizations = this.analyzeGasOptimizations();
    const codeQuality = this.assessCodeQuality();
    const overallScore = this.calculateOverallScore(
      vulnerabilities,
      gasOptimizations,
      codeQuality,
    );

    return {
      vulnerabilities,
      gasOptimizations,
      codeQuality,
      overallScore,
    };
  }

  private async detectVulnerabilities(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    this.checkReentrancy(vulnerabilities);
    this.checkIntegerOverflow(vulnerabilities);
    this.checkUnprotectedSelfdestruct(vulnerabilities);
    this.checkTxOriginUsage(vulnerabilities);
    this.checkUncheckedExternalCalls(vulnerabilities);
    this.checkWeakRandomness(vulnerabilities);
    this.checkMissingAccessControl(vulnerabilities);
    this.checkDangerousDelegatecall(vulnerabilities);

    return vulnerabilities;
  }

  private checkReentrancy(vulnerabilities: Vulnerability[]): void {
    const functions = this.traverser.findAllFunctions();

    functions.forEach((func) => {
      const stateChanges = this.findStateChanges(func);
      const externalCalls = this.findExternalCalls(func).filter(
        (call) => !this.isExternalCallChecked(call, func),
      );

      externalCalls.forEach((call) => {
        const callLine = this.getNodeLineNumber(call);
        const hasStateChangeAfterCall = stateChanges.some(
          (change) => this.getNodeLineNumber(change) > callLine,
        );

        if (hasStateChangeAfterCall) {
          vulnerabilities.push({
            type: "reentrancy",
            severity: "HIGH",
            description:
              "Potential reentrancy vulnerability: state changes happen after an external call.",
            lineNumber: callLine,
            recommendation:
              "Follow the checks-effects-interactions pattern and update state before external calls.",
          });
        }
      });
    });
  }

  private findFunctions(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) => candidate.type === "FunctionDefinition",
    );
  }

  private findStateChanges(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(node, (candidate) => {
      if (candidate.type === "Assignment") {
        return true;
      }

      if (
        candidate.type === "BinaryOperation" &&
        ["=", "+=", "-=", "*=", "/=", "%="].includes(candidate.operator)
      ) {
        return true;
      }

      return (
        candidate.type === "UnaryOperation" &&
        ["++", "--", "delete"].includes(candidate.operator)
      );
    });
  }

  private findExternalCalls(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(node, (candidate) => {
      if (candidate.type !== "FunctionCall") {
        return false;
      }

      let expression = candidate.expression;
      if (expression?.type === "NameValueExpression") {
        expression = expression.expression;
      }

      if (expression?.type === "MemberAccess") {
        return ["call", "send", "transfer", "delegatecall"].includes(
          expression.memberName,
        );
      }

      if (expression?.type === "Identifier") {
        return ["call", "send", "transfer", "delegatecall"].includes(
          expression.name,
        );
      }

      return false;
    });
  }

  private checkIntegerOverflow(vulnerabilities: Vulnerability[]): void {
    const functions = this.findFunctions(this.ast);

    functions.forEach((func) => {
      const arithmeticOps = this.findArithmeticOperations(func);

      arithmeticOps.forEach((op) => {
        if (!this.isOperationProtected(op)) {
          vulnerabilities.push({
            type: "integer-overflow",
            severity: "HIGH",
            description:
              "Potential integer overflow or underflow in arithmetic operation.",
            lineNumber: this.getNodeLineNumber(op),
            recommendation:
              "Use Solidity 0.8.x checked arithmetic or explicit overflow guards around sensitive math.",
          });
        }
      });
    });
  }

  private findArithmeticOperations(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) =>
        candidate.type === "BinaryOperation" &&
        ["+", "-", "*", "/", "%"].includes(candidate.operator),
    );
  }

  private isOperationProtected(node: ASTNode): boolean {
    for (const ancestor of this.traverser.getAncestors(node)) {
      if (ancestor.type === "UncheckedStatement") {
        return true;
      }

      if (
        ancestor.type === "FunctionCall" &&
        ancestor.expression?.type === "MemberAccess" &&
        ["add", "sub", "mul", "div", "mod"].includes(
          ancestor.expression.memberName,
        )
      ) {
        return true;
      }
    }

    const pragmaDirective = this.findPragmaDirective();
    if (!pragmaDirective) {
      return false;
    }

    const version = pragmaDirective.value || "";
    return (
      version.startsWith("^0.8.") ||
      version.startsWith(">=0.8.") ||
      version.includes("0.8.")
    );
  }

  private findPragmaDirective(): ASTNode | null {
    return this.traverser.findFirstNodeOfType("PragmaDirective");
  }

  private checkUnprotectedSelfdestruct(vulnerabilities: Vulnerability[]): void {
    const functions = this.traverser.findAllFunctions();

    functions.forEach((func) => {
      const selfdestructCalls = this.findSelfdestructCalls(func);
      if (selfdestructCalls.length === 0 || this.hasAccessControl(func)) {
        return;
      }

      selfdestructCalls.forEach((call) => {
        vulnerabilities.push({
          type: "unprotected-selfdestruct",
          severity: "HIGH",
          description:
            "Unprotected selfdestruct call found in a function without access control.",
          lineNumber: this.getNodeLineNumber(call),
          recommendation:
            "Protect selfdestruct behind a trusted modifier or remove it entirely.",
        });
      });
    });
  }

  private findSelfdestructCalls(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) =>
        candidate.type === "FunctionCall" &&
        candidate.expression?.type === "Identifier" &&
        candidate.expression.name === "selfdestruct",
    );
  }

  private hasAccessControl(node: ASTNode): boolean {
    const accessControlModifiers = [
      "onlyOwner",
      "onlyAdmin",
      "onlyAuthorized",
      "onlyRole",
      "requireAuth",
    ];

    if (
      Array.isArray(node.modifiers) &&
      node.modifiers.some(
        (modifier: ASTNode) =>
          accessControlModifiers.includes(modifier.name) ||
          accessControlModifiers.includes(modifier.modifierName?.name),
      )
    ) {
      return true;
    }

    return this.findRequireStatements(node).some((statement) => {
      const condition = statement.arguments?.[0];
      if (!condition) {
        return false;
      }

      return (
        (condition.type === "BinaryOperation" &&
          condition.operator === "==" &&
          (this.isOwnerCheck(condition.left) || this.isOwnerCheck(condition.right))) ||
        (condition.type === "FunctionCall" &&
          condition.expression?.type === "Identifier" &&
          accessControlModifiers.includes(condition.expression.name))
      );
    });
  }

  private findRequireStatements(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) =>
        candidate.type === "FunctionCall" &&
        candidate.expression?.type === "Identifier" &&
        candidate.expression.name === "require",
    );
  }

  private isOwnerCheck(node: ASTNode | undefined): boolean {
    if (!node) {
      return false;
    }

    if (node.type === "Identifier") {
      return ["owner", "admin"].includes(node.name);
    }

    if (node.type === "MemberAccess") {
      return (
        node.memberName === "owner" ||
        (node.expression?.type === "Identifier" &&
          node.expression.name === "msg" &&
          node.memberName === "sender")
      );
    }

    return false;
  }

  private checkTxOriginUsage(vulnerabilities: Vulnerability[]): void {
    this.traverser.findAllFunctions().forEach((func) => {
      this.findTxOriginUsages(func).forEach((usage) => {
        vulnerabilities.push({
          type: "tx-origin-usage",
          severity: "HIGH",
          description:
            "Dangerous use of tx.origin for authorization. This is vulnerable to phishing-style attacks.",
          lineNumber: this.getNodeLineNumber(usage),
          recommendation:
            "Use msg.sender for authorization and permission checks instead of tx.origin.",
        });
      });
    });
  }

  private findTxOriginUsages(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) =>
        candidate.type === "MemberAccess" &&
        candidate.expression?.type === "Identifier" &&
        candidate.expression.name === "tx" &&
        candidate.memberName === "origin",
    );
  }

  private checkUncheckedExternalCalls(vulnerabilities: Vulnerability[]): void {
    this.traverser.findAllFunctions().forEach((func) => {
      this.findExternalCalls(func).forEach((call) => {
        if (this.isExternalCallChecked(call, func)) {
          return;
        }

        vulnerabilities.push({
          type: "unchecked-external-call",
          severity: "MEDIUM",
          description:
            "Unchecked external call found. The return value should be validated before continuing.",
          lineNumber: this.getNodeLineNumber(call),
          recommendation:
            "Capture the return value of low-level calls and enforce success with require/assert.",
        });
      });
    });
  }

  private isExternalCallChecked(call: ASTNode, func: ASTNode): boolean {
    for (const ancestor of this.traverser.getAncestors(call)) {
      if (ancestor === func) {
        break;
      }

      if (
        ancestor.type === "FunctionCall" &&
        ancestor.expression?.type === "Identifier" &&
        ["require", "assert"].includes(ancestor.expression.name)
      ) {
        return true;
      }

      if (ancestor.type === "IfStatement" || ancestor.type === "WhileStatement") {
        return true;
      }
    }

    return false;
  }

  private checkWeakRandomness(vulnerabilities: Vulnerability[]): void {
    this.traverser.findAllFunctions().forEach((func) => {
      this.findWeakRandomness(func).forEach((expr) => {
        vulnerabilities.push({
          type: "weak-randomness",
          severity: "MEDIUM",
          description:
            "Weak randomness source detected. Block properties can be influenced and should not drive randomness.",
          lineNumber: this.getNodeLineNumber(expr),
          recommendation:
            "Use a verifiable randomness source such as Chainlink VRF instead of block data.",
        });
      });
    });
  }

  private findWeakRandomness(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(node, (candidate) => {
      if (
        candidate.type === "FunctionCall" &&
        candidate.expression?.type === "Identifier" &&
        candidate.expression.name === "keccak256"
      ) {
        const serialized = JSON.stringify(candidate);
        return (
          serialized.includes('"memberName":"timestamp"') ||
          serialized.includes('"memberName":"difficulty"') ||
          serialized.includes('"memberName":"number"')
        );
      }

      return (
        candidate.type === "MemberAccess" &&
        candidate.expression?.type === "Identifier" &&
        candidate.expression.name === "block" &&
        ["timestamp", "difficulty", "number", "hash"].includes(
          candidate.memberName,
        )
      );
    });
  }

  private checkMissingAccessControl(vulnerabilities: Vulnerability[]): void {
    const sensitiveNames = [
      "setowner",
      "destroy",
      "withdraw",
      "transfer",
      "mint",
      "delegatecall",
      "safecall",
      "unsafecall",
    ];

    this.traverser.findAllFunctions().forEach((func) => {
      if (func.visibility !== "public" && func.visibility !== "external") {
        return;
      }

      const name = (func.name || "").toLowerCase();
      const seemsSensitive =
        sensitiveNames.some((keyword) => name.includes(keyword)) ||
        this.findSelfdestructCalls(func).length > 0 ||
        this.findExternalCalls(func).length > 0;

      if (!seemsSensitive || this.hasAccessControl(func)) {
        return;
      }

      vulnerabilities.push({
        type: "missing-access-control",
        severity: "HIGH",
        description:
          "Sensitive public or external function appears to lack access control.",
        lineNumber: this.getNodeLineNumber(func),
        recommendation:
          "Restrict this function with an access control modifier or explicit authorization check.",
      });
    });
  }

  private checkDangerousDelegatecall(vulnerabilities: Vulnerability[]): void {
    this.traverser.findAllFunctions().forEach((func) => {
      this.findDelegatecalls(func).forEach((call) => {
        vulnerabilities.push({
          type: "dangerous-delegatecall",
          severity: "HIGH",
          description:
            "Dangerous use of delegatecall detected. This can allow untrusted code execution in the caller context.",
          lineNumber: this.getNodeLineNumber(call),
          recommendation:
            "Avoid delegatecall unless absolutely necessary and protect it with strict input validation and access control.",
        });
      });
    });
  }

  private findDelegatecalls(node: ASTNode): ASTNode[] {
    return this.findNodesInSubtree(
      node,
      (candidate) =>
        candidate.type === "FunctionCall" &&
        candidate.expression?.type === "MemberAccess" &&
        candidate.expression.memberName === "delegatecall",
    );
  }

  private analyzeGasOptimizations(): GasOptimization[] {
    const optimizations: GasOptimization[] = [];
    const lines = this.contractCode.split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;

      if (
        trimmed.includes("for(") ||
        trimmed.includes("for (")
      ) {
        optimizations.push({
          type: "loop-optimization",
          potentialSavings: "Moderate",
          description:
            "Loop detected. Review whether caching array length or using unchecked increments is safe.",
          lineNumber,
          recommendation:
            "Cache repeated storage reads inside loops and use unchecked increments when overflow is impossible.",
        });
      }

      if (trimmed.includes('require(') && trimmed.includes('"')) {
        optimizations.push({
          type: "custom-errors",
          potentialSavings: "Low",
          description:
            "String-based revert reason detected. Custom errors are often cheaper.",
          lineNumber,
          recommendation:
            "Replace repeated require strings with custom errors for lower deployment and revert costs.",
        });
      }
    });

    return optimizations;
  }

  private assessCodeQuality(): CodeQualityIssue[] {
    const issues: CodeQualityIssue[] = [];

    this.traverser.findAllFunctions().forEach((func) => {
      if (func.visibility !== "public" && func.visibility !== "external") {
        return;
      }

      const startLine = this.getNodeLineNumber(func);
      const hasNatSpec = this.contractCode
        .split("\n")
        .slice(Math.max(0, startLine - 4), startLine - 1)
        .some((line) => line.trim().startsWith("///") || line.trim().startsWith("/**"));

      if (!hasNatSpec) {
        issues.push({
          type: "missing-documentation",
          severity: "LOW",
          description:
            "Public or external function is missing NatSpec or documentation comments.",
          lineNumber: startLine,
          recommendation:
            "Add concise NatSpec comments to improve maintainability and auditability.",
        });
      }
    });

    return issues;
  }

  private calculateOverallScore(
    vulnerabilities: Vulnerability[],
    gasOptimizations: GasOptimization[],
    codeQuality: CodeQualityIssue[],
  ): number {
    const vulnerabilityPenalty = vulnerabilities.reduce((total, vulnerability) => {
      if (vulnerability.severity === "HIGH") {
        return total + 22;
      }
      if (vulnerability.severity === "MEDIUM") {
        return total + 10;
      }
      return total + 4;
    }, 0);

    const qualityPenalty = codeQuality.reduce((total, issue) => {
      if (issue.severity === "HIGH") {
        return total + 10;
      }
      if (issue.severity === "MEDIUM") {
        return total + 5;
      }
      return total + 2;
    }, 0);

    const gasPenalty = Math.min(gasOptimizations.length * 2, 10);

    return Math.max(0, 100 - vulnerabilityPenalty - qualityPenalty - gasPenalty);
  }
}

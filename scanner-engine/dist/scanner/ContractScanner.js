"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractScanner = void 0;
const parser_1 = require("@solidity-parser/parser");
class ContractScanner {
    constructor(contractCode) {
        this.contractCode = contractCode;
        this.ast = (0, parser_1.parse)(contractCode);
        this.lineMap = this.createLineMap();
    }
    createLineMap() {
        const lines = this.contractCode.split('\n');
        const map = new Map();
        let currentPosition = 0;
        lines.forEach((line, index) => {
            map.set(currentPosition, index + 1);
            currentPosition += line.length + 1; // +1 for newline
        });
        return map;
    }
    getLineNumber(position) {
        const positions = Array.from(this.lineMap.keys()).sort((a, b) => a - b);
        let lineNumber = 1;
        for (const pos of positions) {
            if (position >= pos) {
                lineNumber = this.lineMap.get(pos) || 1;
            }
            else {
                break;
            }
        }
        return lineNumber;
    }
    async scan() {
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
    async detectVulnerabilities() {
        const vulnerabilities = [];
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
    checkReentrancy(vulnerabilities) {
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
    findFunctions(node) {
        const functions = [];
        if (node.type === 'FunctionDefinition') {
            functions.push(node);
        }
        if (node.children) {
            node.children.forEach((child) => {
                functions.push(...this.findFunctions(child));
            });
        }
        return functions;
    }
    findStateChanges(node) {
        const stateChanges = [];
        if (node.type === 'Assignment' ||
            node.type === 'VariableDeclaration' ||
            node.type === 'ExpressionStatement' &&
                node.expression.type === 'Assignment') {
            stateChanges.push(node);
        }
        if (node.children) {
            node.children.forEach((child) => {
                stateChanges.push(...this.findStateChanges(child));
            });
        }
        return stateChanges;
    }
    findExternalCalls(node) {
        const externalCalls = [];
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
            node.children.forEach((child) => {
                externalCalls.push(...this.findExternalCalls(child));
            });
        }
        return externalCalls;
    }
    checkIntegerOverflow(vulnerabilities) {
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
    findArithmeticOperations(node) {
        const operations = [];
        if (node.type === 'BinaryOperation' &&
            ['+', '-', '*', '/', '%'].includes(node.operator)) {
            operations.push(node);
        }
        if (node.children) {
            node.children.forEach((child) => {
                operations.push(...this.findArithmeticOperations(child));
            });
        }
        return operations;
    }
    isOperationProtected(node) {
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
    findPragmaDirective(node) {
        if (node.type === 'PragmaDirective') {
            return node;
        }
        if (node.children) {
            for (const child of node.children) {
                const pragma = this.findPragmaDirective(child);
                if (pragma)
                    return pragma;
            }
        }
        return null;
    }
    checkUnprotectedSelfdestruct(vulnerabilities) {
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
    findSelfdestructCalls(node) {
        const calls = [];
        if (node.type === 'FunctionCall' &&
            node.expression.type === 'Identifier' &&
            node.expression.name === 'selfdestruct') {
            calls.push(node);
        }
        if (node.children) {
            node.children.forEach((child) => {
                calls.push(...this.findSelfdestructCalls(child));
            });
        }
        return calls;
    }
    hasAccessControl(node) {
        // Check for common access control modifiers
        const accessControlModifiers = [
            'onlyOwner',
            'onlyAdmin',
            'onlyAuthorized',
            'onlyRole',
            'requireAuth'
        ];
        if (node.modifiers) {
            return node.modifiers.some((mod) => accessControlModifiers.includes(mod.name));
        }
        // Check for require statements with owner checks
        const requireStatements = this.findRequireStatements(node);
        return requireStatements.some((stmt) => {
            const condition = stmt.condition;
            return ((condition.type === 'BinaryOperation' &&
                condition.operator === '==' &&
                (this.isOwnerCheck(condition.left) || this.isOwnerCheck(condition.right))) ||
                (condition.type === 'FunctionCall' &&
                    condition.expression.type === 'Identifier' &&
                    accessControlModifiers.includes(condition.expression.name)));
        });
    }
    findRequireStatements(node) {
        const statements = [];
        if (node.type === 'FunctionCall' &&
            node.expression.type === 'Identifier' &&
            node.expression.name === 'require') {
            statements.push(node);
        }
        if (node.children) {
            node.children.forEach((child) => {
                statements.push(...this.findRequireStatements(child));
            });
        }
        return statements;
    }
    isOwnerCheck(node) {
        if (node.type === 'MemberAccess') {
            return node.memberName === 'owner' ||
                (node.expression.type === 'Identifier' &&
                    node.expression.name === 'msg' &&
                    node.memberName === 'sender');
        }
        return false;
    }
    checkTxOriginUsage(vulnerabilities) {
        // Implementation for tx.origin usage detection
        // This will identify potentially dangerous uses of tx.origin
    }
    checkUncheckedExternalCalls(vulnerabilities) {
        // Implementation for unchecked external calls detection
        // This will identify external calls that aren't properly checked
    }
    checkWeakRandomness(vulnerabilities) {
        // Implementation for weak randomness detection
        // This will identify potentially weak sources of randomness
    }
    checkMissingAccessControl(vulnerabilities) {
        // Implementation for missing access control detection
        // This will identify functions that lack proper access control
    }
    checkDangerousDelegatecall(vulnerabilities) {
        // Implementation for dangerous delegatecall detection
        // This will identify potentially dangerous uses of delegatecall
    }
    analyzeGasOptimizations() {
        const optimizations = [];
        // Analyze state variable packing
        this.analyzeStateVariablePacking(optimizations);
        // Analyze memory vs storage usage
        this.analyzeMemoryStorageUsage(optimizations);
        // Analyze loop optimizations
        this.analyzeLoopOptimizations(optimizations);
        return optimizations;
    }
    analyzeStateVariablePacking(optimizations) {
        // Implementation for state variable packing analysis
        // This will identify opportunities for better state variable packing
    }
    analyzeMemoryStorageUsage(optimizations) {
        // Implementation for memory vs storage analysis
        // This will identify opportunities to optimize memory/storage usage
    }
    analyzeLoopOptimizations(optimizations) {
        // Implementation for loop optimization analysis
        // This will identify opportunities to optimize loops
    }
    assessCodeQuality() {
        const issues = [];
        // Check for missing documentation
        this.checkMissingDocumentation(issues);
        // Check for magic numbers
        this.checkMagicNumbers(issues);
        // Check function complexity
        this.checkFunctionComplexity(issues);
        // Check best practices compliance
        this.checkBestPractices(issues);
        return issues;
    }
    checkMissingDocumentation(issues) {
        // Implementation for missing documentation detection
        // This will identify functions and contracts lacking proper documentation
    }
    checkMagicNumbers(issues) {
        // Implementation for magic number detection
        // This will identify hardcoded numbers that should be constants
    }
    checkFunctionComplexity(issues) {
        // Implementation for function complexity analysis
        // This will identify overly complex functions
    }
    checkBestPractices(issues) {
        // Implementation for best practices compliance
        // This will check for adherence to Solidity best practices
    }
    calculateOverallScore(vulnerabilities, gasOptimizations, codeQuality) {
        // Implementation for overall score calculation
        // This will calculate a comprehensive security score based on all findings
        return 0; // Placeholder
    }
}
exports.ContractScanner = ContractScanner;

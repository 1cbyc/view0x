export interface Vulnerability {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  lineNumber?: number;
  recommendation: string;
}

export interface Warning {
  type: string;
  description: string;
  lineNumber?: number;
  recommendation: string;
}

export interface Suggestion {
  type: string;
  description: string;
  lineNumber?: number;
  recommendation: string;
}

export interface GasOptimization {
  type: string;
  description: string;
  lineNumber?: number;
  recommendation: string;
  potentialSavings?: string;
}

export interface CodeQualityIssue {
  type: string;
  description: string;
  lineNumber?: number;
  recommendation: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface VulnerabilityReport {
  vulnerabilities: Vulnerability[];
  warnings: Warning[];
  suggestions: Suggestion[];
  gasOptimizations?: GasOptimization[];
  codeQuality?: CodeQualityIssue[];
}

export class SimpleScanner {
  async analyzeContract(contractCode: string): Promise<VulnerabilityReport> {
    const vulnerabilities: Vulnerability[] = [];
    const warnings: Warning[] = [];
    const suggestions: Suggestion[] = [];
    const gasOptimizations: GasOptimization[] = [];
    const codeQuality: CodeQualityIssue[] = [];

    const lines = contractCode.split('\n');

    // Check for common vulnerabilities using regex patterns
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lowerLine = line.toLowerCase();

      // Check for reentrancy patterns
      if (lowerLine.includes('call(') || lowerLine.includes('send(') || lowerLine.includes('transfer(')) {
        if (lowerLine.includes('call(') && !lowerLine.includes('require(') && !lowerLine.includes('revert(')) {
          vulnerabilities.push({
            type: 'Unchecked External Call',
            severity: 'HIGH',
            description: 'External call without proper error handling',
            lineNumber,
            recommendation: 'Always check the return value of external calls and handle failures appropriately'
          });
        }
      }

      // Check for tx.origin usage
      if (lowerLine.includes('tx.origin')) {
        vulnerabilities.push({
          type: 'tx.origin Usage',
          severity: 'HIGH',
          description: 'tx.origin is used for authorization',
          lineNumber,
          recommendation: 'Use msg.sender instead of tx.origin for authorization checks'
        });
      }

      // Check for selfdestruct
      if (lowerLine.includes('selfdestruct(')) {
        vulnerabilities.push({
          type: 'Selfdestruct',
          severity: 'MEDIUM',
          description: 'Selfdestruct function found',
          lineNumber,
          recommendation: 'Ensure selfdestruct is properly protected with access controls'
        });
      }

      // Check for delegatecall
      if (lowerLine.includes('delegatecall(')) {
        vulnerabilities.push({
          type: 'Delegatecall',
          severity: 'HIGH',
          description: 'Delegatecall found - can be dangerous',
          lineNumber,
          recommendation: 'Ensure delegatecall is used carefully and the target contract is trusted'
        });
      }

      // Check for weak randomness
      if (lowerLine.includes('block.timestamp') || lowerLine.includes('block.number')) {
        if (lowerLine.includes('random') || lowerLine.includes('rand')) {
          vulnerabilities.push({
            type: 'Weak Randomness',
            severity: 'MEDIUM',
            description: 'Using block variables for randomness',
            lineNumber,
            recommendation: 'Use a more secure randomness source like Chainlink VRF'
          });
        }
      }

      // Check for missing access control
      if (lowerLine.includes('function') && (lowerLine.includes('external') || lowerLine.includes('public'))) {
        if (lowerLine.includes('transfer') || lowerLine.includes('withdraw') || lowerLine.includes('mint')) {
          if (!lowerLine.includes('onlyowner') && !lowerLine.includes('modifier')) {
            warnings.push({
              type: 'Missing Access Control',
              description: 'Sensitive function may need access control',
              lineNumber,
              recommendation: 'Consider adding access control modifiers to sensitive functions'
            });
          }
        }
      }

      // Gas optimization checks
      if (lowerLine.includes('for (') && lowerLine.includes('i++')) {
        if (!lowerLine.includes('unchecked')) {
          gasOptimizations.push({
            type: 'unchecked-increment',
            description: 'Loop counter increment can be unchecked for gas savings',
            lineNumber,
            recommendation: 'Use unchecked { i++; } when overflow is impossible',
            potentialSavings: '30-40 gas per iteration'
          });
        }
      }

      // State variable packing
      if (lowerLine.match(/\b(uint\d+|bytes\d+|bool|address)\s+\w+/) && lowerLine.includes('public')) {
        gasOptimizations.push({
          type: 'state-variable-packing',
          description: 'Consider packing smaller state variables together',
          lineNumber,
          recommendation: 'Pack smaller types (uint128, bool, bytes1-16) together in storage slots',
          potentialSavings: '20,000-40,000 gas'
        });
      }

      // Custom errors vs require strings
      if (lowerLine.includes('require(') && line.includes('"')) {
        gasOptimizations.push({
          type: 'custom-errors',
          description: 'Use custom errors instead of require with string',
          lineNumber,
          recommendation: 'Define custom errors and use them instead of require("message")',
          potentialSavings: '~50 gas per revert'
        });
      }

      // Code quality checks
      // Missing NatSpec documentation
      if (lowerLine.includes('function') && (lowerLine.includes('public') || lowerLine.includes('external'))) {
        let hasDocs = false;
        for (let j = Math.max(0, index - 5); j < index; j++) {
          if (lines[j].includes('///') || lines[j].includes('/**')) {
            hasDocs = true;
            break;
          }
        }
        if (!hasDocs) {
          codeQuality.push({
            type: 'missing-documentation',
            description: 'Function is missing NatSpec documentation',
            lineNumber,
            recommendation: 'Add NatSpec comments (///) for all public/external functions',
            severity: 'MEDIUM'
          });
        }
      }

      // Check for missing events
      if (lowerLine.includes('function') && (lowerLine.includes('transfer') || lowerLine.includes('mint'))) {
        if (!contractCode.toLowerCase().includes('event') || !contractCode.toLowerCase().includes('emit')) {
          suggestions.push({
            type: 'Missing Events',
            description: 'Consider adding events for important state changes',
            lineNumber,
            recommendation: 'Add events for important functions to improve transparency'
          });
        }
      }
    });

    // Check for pragma version (add to code quality)
    if (!contractCode.toLowerCase().includes('pragma solidity')) {
      codeQuality.push({
        type: 'missing-pragma',
        description: 'No pragma solidity version directive found',
        lineNumber: 1,
        recommendation: "Add 'pragma solidity ^0.8.0;' at the top of the file",
        severity: 'HIGH'
      });
      warnings.push({
        type: 'Missing Pragma',
        description: 'No pragma directive found',
        recommendation: 'Add a pragma directive to specify the Solidity version'
      });
    }

    // Check for license (add to code quality)
    if (!contractCode.toLowerCase().includes('spdx-license-identifier')) {
      codeQuality.push({
        type: 'missing-license',
        description: 'No SPDX license identifier found',
        lineNumber: 1,
        recommendation: "Add '// SPDX-License-Identifier: MIT' at the top of the file",
        severity: 'MEDIUM'
      });
      suggestions.push({
        type: 'Missing License',
        description: 'No license identifier found',
        recommendation: 'Add an SPDX license identifier to your contract'
      });
    }

    return {
      vulnerabilities,
      warnings,
      suggestions,
      gasOptimizations,
      codeQuality
    };
  }
} 
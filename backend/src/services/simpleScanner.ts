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

export interface VulnerabilityReport {
  vulnerabilities: Vulnerability[];
  warnings: Warning[];
  suggestions: Suggestion[];
}

export class SimpleScanner {
  async analyzeContract(contractCode: string): Promise<VulnerabilityReport> {
    const vulnerabilities: Vulnerability[] = [];
    const warnings: Warning[] = [];
    const suggestions: Suggestion[] = [];

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

      // Check for gas optimizations
      if (lowerLine.includes('for (') && lowerLine.includes('i++')) {
        suggestions.push({
          type: 'Gas Optimization',
          description: 'Consider using unchecked increment for gas savings',
          lineNumber,
          recommendation: 'Use unchecked { i++; } for better gas efficiency in loops'
        });
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

    // Check for pragma version
    if (!contractCode.toLowerCase().includes('pragma solidity')) {
      warnings.push({
        type: 'Missing Pragma',
        description: 'No pragma directive found',
        recommendation: 'Add a pragma directive to specify the Solidity version'
      });
    }

    // Check for license
    if (!contractCode.toLowerCase().includes('spdx-license-identifier')) {
      suggestions.push({
        type: 'Missing License',
        description: 'No license identifier found',
        recommendation: 'Add an SPDX license identifier to your contract'
      });
    }

    return {
      vulnerabilities,
      warnings,
      suggestions
    };
  }
} 
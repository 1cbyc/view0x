// const parser = require('solidity-parser-antlr');

// function scanContract(code) {
//   const issues = [];

//   try {
//     const ast = parser.parse(code, { loc: true });

//     parser.visit(ast, {
//       MemberAccess(node) {
//         if (node.expression.name === 'tx' && node.memberName === 'origin') {
//           issues.push({
//             type: 'dangerous-pattern',
//             message: 'Avoid using tx.origin for authentication.',
//             location: node.loc
//           });
//         }
//       },
//       FunctionDefinition(node) {
//         if (!node.body) {
//           issues.push({
//             type: 'missing-implementation',
//             message: `Function "${node.name}" has no implementation.`,
//             location: node.loc
//           });
//         }
//       }
//     });
//   } catch (err) {
//     return {
//       success: false,
//       error: 'Failed to parse Solidity code',
//       details: err.message
//     };
//   }

//   return {
//     success: true,
//     issues
//   };
// }

// module.exports = {
//   scanContract
// };
const VulnerabilityAnalyzer = require('./analyzers/VulnerabilityAnalyzer');
const GasAnalyzer = require('./analyzers/GasAnalyzer');
const QualityAnalyzer = require('./analyzers/QualityAnalyzer');
const SecurityRules = require('./rules/SecurityRules');

class SmartContractScanner {
  constructor() {
    this.vulnerabilityAnalyzer = new VulnerabilityAnalyzer();
    this.gasAnalyzer = new GasAnalyzer();
    this.qualityAnalyzer = new QualityAnalyzer();
    this.securityRules = new SecurityRules();
  }

  /**
   * Main scanning function
   * @param {string} contractCode - Solidity contract code
   * @param {Object} options - Scanning options
   * @returns {Object} - Comprehensive scan results
   */
  async scanContract(contractCode, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!contractCode || typeof contractCode !== 'string') {
        throw new Error('Invalid contract code provided');
      }

      // Initialize results object
      const results = {
        scanId: this.generateScanId(),
        timestamp: new Date().toISOString(),
        contractHash: this.generateHash(contractCode),
        vulnerabilities: [],
        gasOptimizations: [],
        qualityIssues: [],
        summary: {},
        metadata: {
          linesOfCode: contractCode.split('\n').length,
          contractSize: contractCode.length,
          scanDuration: 0
        }
      };

      // Run parallel analysis
      const [vulnerabilities, gasOptimizations, qualityIssues] = await Promise.all([
        this.vulnerabilityAnalyzer.analyze(contractCode, options),
        this.gasAnalyzer.analyze(contractCode, options),
        this.qualityAnalyzer.analyze(contractCode, options)
      ]);

      results.vulnerabilities = vulnerabilities;
      results.gasOptimizations = gasOptimizations;
      results.qualityIssues = qualityIssues;

      // Generate summary
      results.summary = this.generateSummary(results);
      results.metadata.scanDuration = Date.now() - startTime;

      return results;
    } catch (error) {
      throw new Error(`Scanning failed: ${error.message}`);
    }
  }

  /**
   * Generate scan summary with risk scoring
   */
  generateSummary(results) {
    const highSeverity = results.vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumSeverity = results.vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowSeverity = results.vulnerabilities.filter(v => v.severity === 'low').length;
    
    // Calculate risk score (0-100)
    const riskScore = Math.min(100, 
      (highSeverity * 35) + 
      (mediumSeverity * 20) + 
      (lowSeverity * 10) + 
      (results.qualityIssues.length * 3)
    );

    return {
      totalVulnerabilities: results.vulnerabilities.length,
      severityBreakdown: {
        high: highSeverity,
        medium: mediumSeverity,
        low: lowSeverity
      },
      gasOptimizations: results.gasOptimizations.length,
      qualityIssues: results.qualityIssues.length,
      riskScore: riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Generate top recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    // High priority vulnerabilities
    const highVulns = results.vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        message: `Address ${highVulns.length} critical security vulnerabilities immediately`,
        actions: highVulns.slice(0, 3).map(v => v.recommendation).filter(Boolean)
      });
    }

    // Gas optimizations
    if (results.gasOptimizations.length > 0) {
      const totalSavings = results.gasOptimizations.reduce((sum, opt) => {
        const savings = parseInt(opt.estimatedSavings?.replace(/[^\d]/g, '') || '0');
        return sum + savings;
      }, 0);
      
      if (totalSavings > 10000) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Optimization',
          message: `Potential gas savings of ${totalSavings.toLocaleString()} gas units`,
          actions: results.gasOptimizations.slice(0, 3).map(opt => opt.description)
        });
      }
    }

    // Code quality
    if (results.qualityIssues.length > 5) {
      recommendations.push({
        priority: 'LOW',
        category: 'Quality',
        message: `Improve code quality with ${results.qualityIssues.length} suggested improvements`,
        actions: ['Add comprehensive documentation', 'Follow naming conventions', 'Reduce function complexity']
      });
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Generate unique scan ID
   */
  generateScanId() {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate contract hash for caching/comparison
   */
  generateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get scanner version and capabilities
   */
  getInfo() {
    return {
      version: '1.0.0',
      capabilities: {
        vulnerabilityDetection: true,
        gasOptimization: true,
        qualityAnalysis: true,
        solidityVersions: ['0.6.x', '0.7.x', '0.8.x'],
        supportedStandards: ['ERC20', 'ERC721', 'ERC1155', 'ERC1967']
      },
      rules: {
        vulnerabilities: this.vulnerabilityAnalyzer.getSupportedRules(),
        gasOptimizations: this.gasAnalyzer.getSupportedRules(),
        qualityChecks: this.qualityAnalyzer.getSupportedRules()
      }
    };
  }
}

module.exports = SmartContractScanner;
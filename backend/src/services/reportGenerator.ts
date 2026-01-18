/**
 * Report Generator Service for view0x
 * Generates analysis reports in multiple formats (JSON, Markdown, PDF)
 */

import { Analysis } from "../models/Analysis";
import { logger } from "../utils/logger";

export interface ReportOptions {
  format: "json" | "markdown" | "pdf";
  includeCode?: boolean;
  includeRecommendations?: boolean;
  includeMetadata?: boolean;
}

export class ReportGenerator {
  /**
   * Generate a JSON report
   */
  static generateJSON(analysis: Analysis): string {
    const report = {
      id: analysis.id,
      contractName: analysis.contractName,
      status: analysis.status,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      processingTimeMs: analysis.processingTimeMs,
      result: analysis.result,
      ...(analysis.options && { options: analysis.options }),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate a Markdown report
   */
  static generateMarkdown(analysis: Analysis, options: ReportOptions = { format: "markdown" }): string {
    const { includeCode = false, includeRecommendations = true, includeMetadata = true } = options;

    let md = `# Analysis Report\n\n`;

    // Header section
    md += `## Contract Information\n\n`;
    md += `- **Contract Name:** ${analysis.contractName || "Unknown"}\n`;
    md += `- **Status:** ${analysis.status}\n`;
    md += `- **Analysis ID:** ${analysis.id}\n`;
    
    if (includeMetadata) {
      md += `- **Created:** ${analysis.createdAt?.toISOString() || "N/A"}\n`;
      md += `- **Completed:** ${analysis.completedAt?.toISOString() || "N/A"}\n`;
      if (analysis.processingTimeMs) {
        md += `- **Processing Time:** ${(analysis.processingTimeMs / 1000).toFixed(2)}s\n`;
      }
    }
    md += `\n`;

    if (!analysis.result) {
      md += `## Status: ${analysis.status}\n\n`;
      if (analysis.errorMessage) {
        md += `**Error:** ${analysis.errorMessage}\n`;
      }
      return md;
    }

    const result = analysis.result as any;

    // Summary section
    if (result.summary) {
      md += `## Summary\n\n`;
      const summary = result.summary;
      
      md += `| Metric | Count |\n`;
      md += `|--------|-------|\n`;
      md += `| Total Vulnerabilities | ${summary.totalVulnerabilities || 0} |\n`;
      md += `| High Severity | ${summary.highSeverity || 0} |\n`;
      md += `| Medium Severity | ${summary.mediumSeverity || 0} |\n`;
      md += `| Low Severity | ${summary.lowSeverity || 0} |\n`;
      
      if (summary.gasOptimizations !== undefined) {
        md += `| Gas Optimizations | ${summary.gasOptimizations} |\n`;
      }
      if (summary.codeQualityIssues !== undefined) {
        md += `| Code Quality Issues | ${summary.codeQualityIssues} |\n`;
      }
      if (summary.overallScore !== undefined) {
        md += `| Overall Score | ${summary.overallScore}/100 |\n`;
      }
      if (summary.riskLevel) {
        md += `| Risk Level | ${summary.riskLevel} |\n`;
      }
      md += `\n`;
    }

    // Vulnerabilities section
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      md += `## Vulnerabilities\n\n`;
      
      result.vulnerabilities.forEach((vuln: any, index: number) => {
        md += `### ${index + 1}. ${vuln.check || vuln.type || "Vulnerability"}\n\n`;
        md += `- **Severity:** ${vuln.severity || vuln.impact || "Unknown"}\n`;
        md += `- **Confidence:** ${vuln.confidence || "Medium"}\n`;
        
        if (vuln.location?.line || vuln.lineNumber) {
          md += `- **Location:** Line ${vuln.location?.line || vuln.lineNumber}\n`;
        }
        
        md += `\n${vuln.description || ""}\n\n`;
        
        if (includeRecommendations && vuln.recommendation) {
          md += `**Recommendation:** ${vuln.recommendation}\n\n`;
        }
      });
    }

    // Gas Optimizations section
    if (result.gasOptimizations && result.gasOptimizations.length > 0) {
      md += `## Gas Optimizations\n\n`;
      
      result.gasOptimizations.forEach((opt: any, index: number) => {
        md += `### ${index + 1}. ${opt.type || opt.title || "Gas Optimization"}\n\n`;
        md += `${opt.description || ""}\n\n`;
        
        if (opt.potentialSavings) {
          md += `- **Potential Savings:** ${opt.potentialSavings}\n`;
        }
        if (opt.location?.line || opt.lineNumber) {
          md += `- **Location:** Line ${opt.location?.line || opt.lineNumber}\n`;
        }
        
        if (includeRecommendations && opt.recommendation) {
          md += `\n**Recommendation:** ${opt.recommendation}\n\n`;
        }
      });
    }

    // Code Quality section
    if (result.codeQuality && result.codeQuality.length > 0) {
      md += `## Code Quality Issues\n\n`;
      
      result.codeQuality.forEach((issue: any, index: number) => {
        md += `### ${index + 1}. ${issue.type || issue.title || "Code Quality Issue"}\n\n`;
        md += `- **Severity:** ${issue.severity || "Medium"}\n`;
        
        if (issue.location?.line || issue.lineNumber) {
          md += `- **Location:** Line ${issue.location?.line || issue.lineNumber}\n`;
        }
        
        md += `\n${issue.description || ""}\n\n`;
        
        if (includeRecommendations && issue.recommendation) {
          md += `**Recommendation:** ${issue.recommendation}\n\n`;
        }
      });
    }

    // Contract code section (optional)
    if (includeCode && analysis.contractCode) {
      md += `## Contract Code\n\n`;
      md += `\`\`\`solidity\n`;
      md += analysis.contractCode;
      md += `\n\`\`\`\n`;
    }

    // Footer
    md += `\n---\n`;
    md += `*Generated by view0x on ${new Date().toISOString()}*\n`;

    return md;
  }

  /**
   * Generate a PDF report (placeholder - would need a PDF library like pdfkit or puppeteer)
   */
  static async generatePDF(analysis: Analysis, options: ReportOptions = { format: "pdf" }): Promise<Buffer> {
    // For now, convert markdown to PDF would require additional libraries
    // This is a placeholder implementation
    const markdown = this.generateMarkdown(analysis, { ...options, format: "markdown" });
    
    // In a real implementation, you would use a library like:
    // - puppeteer to render HTML to PDF
    // - pdfkit to build PDF from scratch
    // - marked + puppeteer to convert markdown -> HTML -> PDF
    
    logger.warn("PDF generation is not fully implemented. Returning markdown as text.");
    
    // For now, return markdown as buffer (client can convert)
    return Buffer.from(markdown, "utf-8");
  }

  /**
   * Generate report in specified format
   */
  static async generate(analysis: Analysis, options: ReportOptions): Promise<string | Buffer> {
    switch (options.format) {
      case "json":
        return this.generateJSON(analysis);
      
      case "markdown":
        return this.generateMarkdown(analysis, options);
      
      case "pdf":
        return this.generatePDF(analysis, options);
      
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }
}

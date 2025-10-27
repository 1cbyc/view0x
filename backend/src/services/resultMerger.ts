import { logger } from "../utils/logger";

interface Vulnerability {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
  description: string;
  lineNumber?: number;
  recommendation?: string;
  confidence?: number;
  source?: string;
  [key: string]: any;
}

interface EngineResult {
  vulnerabilities?: Vulnerability[];
  warnings?: Vulnerability[];
  engine: string;
}

interface MergedResult {
  vulnerabilities: Vulnerability[];
  warnings: Vulnerability[];
  engines: string[];
  timestamp: string;
  statistics: {
    totalVulnerabilities: number;
    bySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      INFO: number;
    };
    byEngine: { [key: string]: number };
  };
}

/**
 * ResultMerger - Intelligently combines results from multiple analysis engines
 */
export class ResultMerger {
  /**
   * Merge results from multiple engines
   */
  static merge(engineResults: EngineResult[]): MergedResult {
    logger.info(`[MERGER] Merging results from ${engineResults.length} engines`);

    const allVulnerabilities: Vulnerability[] = [];
    const allWarnings: Vulnerability[] = [];
    const engines = engineResults.map(r => r.engine);

    // Collect all vulnerabilities and warnings
    engineResults.forEach(result => {
      if (result.vulnerabilities) {
        allVulnerabilities.push(...result.vulnerabilities);
      }
      
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    });

    // Deduplicate vulnerabilities
    const deduplicatedVulns = this.deduplicate(allVulnerabilities);
    const deduplicatedWarnings = this.deduplicate(allWarnings);

    // Calculate statistics
    const statistics = this.calculateStatistics(deduplicatedVulns, engines);

    // Sort by severity and confidence
    const sortedVulns = this.sortBySeverityAndConfidence(deduplicatedVulns);
    const sortedWarnings = this.sortBySeverityAndConfidence(deduplicatedWarnings);

    logger.info(`[MERGER] Merged ${sortedVulns.length} vulnerabilities and ${sortedWarnings.length} warnings`);

    return {
      vulnerabilities: sortedVulns,
      warnings: sortedWarnings,
      engines,
      timestamp: new Date().toISOString(),
      statistics
    };
  }

  /**
   * Deduplicate vulnerabilities based on type and location
   */
  private static deduplicate(vulnerabilities: Vulnerability[]): Vulnerability[] {
    const seen = new Set<string>();
    const merged: Vulnerability[] = [];

    vulnerabilities.forEach(vuln => {
      const key = this.getDeduplicationKey(vuln);
      
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(vuln);
      } else {
        // Update confidence based on multiple detections (multiple engines agreed)
        const existing = merged.find(v => this.getDeduplicationKey(v) === key);
        if (existing) {
          existing.confidence = Math.min(0.95, (existing.confidence || 0.7) + 0.1);
        }
      }
    });

    return merged;
  }

  /**
   * Generate a deduplication key for a vulnerability
   */
  private static getDeduplicationKey(vuln: Vulnerability): string {
    const type = vuln.type.toLowerCase().trim();
    const line = vuln.lineNumber || 0;
    // Same type within 5 lines is considered duplicate
    const lineRange = Math.floor(line / 5);
    return `${type}:${lineRange}`;
  }

  /**
   * Sort vulnerabilities by severity and confidence
   */
  private static sortBySeverityAndConfidence(vulnerabilities: Vulnerability[]): Vulnerability[] {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

    return vulnerabilities.sort((a, b) => {
      const severityDiff = (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
      if (severityDiff !== 0) return severityDiff;

      const confidenceA = a.confidence || 0.5;
      const confidenceB = b.confidence || 0.5;
      return confidenceB - confidenceA;
    });
  }

  /**
   * Calculate statistics from merged results
   */
  private static calculateStatistics(vulnerabilities: Vulnerability[], engines: string[]) {
    const bySeverity = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    // Note: We no longer track byEngine as we don't expose engine names to clients

    vulnerabilities.forEach(vuln => {
      bySeverity[vuln.severity]++;
    });

    return {
      totalVulnerabilities: vulnerabilities.length,
      bySeverity
    };
  }

  /**
   * Check if vulnerabilities are duplicates
   */
  static isDuplicate(v1: Vulnerability, v2: Vulnerability): boolean {
    return this.getDeduplicationKey(v1) === this.getDeduplicationKey(v2);
  }
}

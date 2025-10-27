import { ScannerEngine, VulnerabilityReport } from "../../types/scanner-engine.d";
import { logger } from "../utils/logger";

/**
 * Scanner Engine Service
 * Provides an alternative analysis engine using the scanner-engine package
 */
class ScannerEngineService {
  private engine: ScannerEngine | null = null;

  constructor() {
    try {
      // Try to load the scanner-engine module
      const ScannerEngineModule = require('scanner-engine');
      this.engine = new ScannerEngineModule.ScannerEngine();
      logger.info('[SCANNER-ENGINE] Scanner engine initialized successfully');
    } catch (error) {
      logger.warn('[SCANNER-ENGINE] Failed to load scanner-engine:', error);
      this.engine = null;
    }
  }

  /**
   * Check if scanner-engine is available
   */
  isAvailable(): boolean {
    return this.engine !== null;
  }

  /**
   * Analyze contract code using scanner-engine
   */
  async analyzeContract(
    contractCode: string,
    options?: any
  ): Promise<VulnerabilityReport> {
    if (!this.engine) {
      throw new Error('Scanner engine is not available');
    }

    try {
      logger.info('[SCANNER-ENGINE] Starting contract analysis');
      const result = await this.engine.analyzeContract(contractCode, options);
      logger.info('[SCANNER-ENGINE] Analysis completed successfully');
      return result;
    } catch (error) {
      logger.error('[SCANNER-ENGINE] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Format scanner-engine results to match the expected format
   */
  formatResults(report: VulnerabilityReport) {
    return {
      vulnerabilities: report.vulnerabilities.map(v => ({
        type: v.title,
        severity: v.severity,
        description: v.description,
        lineNumber: v.location.start,
        recommendation: v.recommendation,
      })),
      warnings: report.warnings.map(w => ({
        type: w.title,
        severity: 'LOW' as const,
        description: w.description,
        lineNumber: w.location.start,
        recommendation: w.recommendation,
      })),
      suggestions: report.suggestions.map(s => ({
        type: s.title,
        severity: 'INFO' as const,
        description: s.description,
        lineNumber: s.location.start,
        recommendation: s.recommendation,
      })),
      engine: 'scanner-engine',
      timestamp: new Date().toISOString(),
    };
  }
}

export const scannerEngineService = new ScannerEngineService();
export default scannerEngineService;

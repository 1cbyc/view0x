"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerEngine = void 0;
const ContractScanner_1 = require("./scanner/ContractScanner");
const ScannerEngine_1 = require("./ScannerEngine");
Object.defineProperty(exports, "ScannerEngine", { enumerable: true, get: function () { return ScannerEngine_1.ScannerEngine; } });
const fs = __importStar(require("fs"));
async function main() {
    // Check if a file path was provided
    if (process.argv.length < 3) {
        console.error('Please provide a path to a Solidity contract file');
        process.exit(1);
    }
    const filePath = process.argv[2];
    try {
        // Read the contract file
        const contractCode = fs.readFileSync(filePath, 'utf8');
        // Create scanner instance
        const scanner = new ContractScanner_1.ContractScanner(contractCode);
        // Run the scan
        console.log('Scanning contract for vulnerabilities...\n');
        const result = await scanner.scan();
        // Print results
        console.log('=== Scan Results ===\n');
        // Print vulnerabilities
        if (result.vulnerabilities.length > 0) {
            console.log('Vulnerabilities Found:');
            result.vulnerabilities.forEach(vuln => {
                console.log(`\n[${vuln.severity}] ${vuln.type}`);
                console.log(`Line ${vuln.lineNumber}: ${vuln.description}`);
                console.log(`Recommendation: ${vuln.recommendation}`);
            });
        }
        else {
            console.log('No vulnerabilities found.');
        }
        // Print gas optimizations
        if (result.gasOptimizations.length > 0) {
            console.log('\nGas Optimization Opportunities:');
            result.gasOptimizations.forEach(opt => {
                console.log(`\n[${opt.type}]`);
                console.log(`Line ${opt.lineNumber}: ${opt.description}`);
                console.log(`Potential Savings: ${opt.potentialSavings}`);
                console.log(`Recommendation: ${opt.recommendation}`);
            });
        }
        else {
            console.log('\nNo gas optimization opportunities found.');
        }
        // Print code quality issues
        if (result.codeQuality.length > 0) {
            console.log('\nCode Quality Issues:');
            result.codeQuality.forEach(issue => {
                console.log(`\n[${issue.severity}] ${issue.type}`);
                console.log(`Line ${issue.lineNumber}: ${issue.description}`);
                console.log(`Recommendation: ${issue.recommendation}`);
            });
        }
        else {
            console.log('\nNo code quality issues found.');
        }
        // Print overall score
        console.log(`\nOverall Security Score: ${result.overallScore}/100`);
    }
    catch (error) {
        console.error('Error scanning contract:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}

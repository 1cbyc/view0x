import { ContractScanner } from './scanner/ContractScanner';
import * as fs from 'fs';
import * as path from 'path';

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
    const scanner = new ContractScanner(contractCode);
    
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
    } else {
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
    } else {
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
    } else {
      console.log('\nNo code quality issues found.');
    }
    
    // Print overall score
    console.log(`\nOverall Security Score: ${result.overallScore}/100`);
    
  } catch (error) {
    console.error('Error scanning contract:', error);
    process.exit(1);
  }
}

main().catch(console.error); 
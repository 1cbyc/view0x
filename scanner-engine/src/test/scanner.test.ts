import { ContractScanner } from '../scanner/ContractScanner';
import * as fs from 'fs';
import * as path from 'path';

describe('ContractScanner', () => {
  let scanner: ContractScanner;
  let contractCode: string;

  beforeAll(() => {
    // Read the sample vulnerable contract
    const contractPath = path.join(__dirname, 'sample-vulnerable-contract.sol');
    contractCode = fs.readFileSync(contractPath, 'utf8');
    scanner = new ContractScanner(contractCode);
  });

  it('should detect reentrancy vulnerabilities', async () => {
    const result = await scanner.scan();
    const reentrancyVulns = result.vulnerabilities.filter(v => v.type === 'reentrancy');
    expect(reentrancyVulns.length).toBeGreaterThan(0);
    expect(reentrancyVulns[0].severity).toBe('HIGH');
  });

  it('should detect integer overflow vulnerabilities', async () => {
    const result = await scanner.scan();
    const overflowVulns = result.vulnerabilities.filter(v => v.type === 'integer-overflow');
    expect(overflowVulns.length).toBeGreaterThan(0);
  });

  it('should detect unprotected selfdestruct', async () => {
    const result = await scanner.scan();
    const selfdestructVulns = result.vulnerabilities.filter(v => v.type === 'unprotected-selfdestruct');
    expect(selfdestructVulns.length).toBeGreaterThan(0);
  });

  it('should detect tx.origin usage', async () => {
    const result = await scanner.scan();
    const txOriginVulns = result.vulnerabilities.filter(v => v.type === 'tx-origin-usage');
    expect(txOriginVulns.length).toBeGreaterThan(0);
  });

  it('should detect unchecked external calls', async () => {
    const result = await scanner.scan();
    const uncheckedCallVulns = result.vulnerabilities.filter(v => v.type === 'unchecked-external-call');
    expect(uncheckedCallVulns.length).toBeGreaterThan(0);
  });

  it('should detect weak randomness', async () => {
    const result = await scanner.scan();
    const randomnessVulns = result.vulnerabilities.filter(v => v.type === 'weak-randomness');
    expect(randomnessVulns.length).toBeGreaterThan(0);
  });

  it('should detect missing access control', async () => {
    const result = await scanner.scan();
    const accessControlVulns = result.vulnerabilities.filter(v => v.type === 'missing-access-control');
    expect(accessControlVulns.length).toBeGreaterThan(0);
  });

  it('should detect dangerous delegatecall', async () => {
    const result = await scanner.scan();
    const delegatecallVulns = result.vulnerabilities.filter(v => v.type === 'dangerous-delegatecall');
    expect(delegatecallVulns.length).toBeGreaterThan(0);
  });

  it('should identify gas optimization opportunities', async () => {
    const result = await scanner.scan();
    expect(result.gasOptimizations.length).toBeGreaterThan(0);
  });

  it('should identify code quality issues', async () => {
    const result = await scanner.scan();
    expect(result.codeQuality.length).toBeGreaterThan(0);
  });

  it('should calculate an overall security score', async () => {
    const result = await scanner.scan();
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
}); 
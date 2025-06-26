import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  Code, 
  Loader2, 
  Copy, 
  Download,
  Shield,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react';

interface Vulnerability {
  type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  lineNumber: number;
    recommendation: string;
}

interface GasOptimization {
  type: string;
  potentialSavings: string;
    description: string;
  lineNumber: number;
    recommendation: string;
}

interface CodeQualityIssue {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  lineNumber: number;
    recommendation: string;
}

interface AnalysisResult {
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  codeQuality: CodeQualityIssue[];
  overallScore: number;
}

const ContractAnalyzer: React.FC = () => {
  const [contractCode, setContractCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

  const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public constant WITHDRAWAL_LIMIT = 1 ether;
    
    // Missing access control modifier
    function setOwner(address newOwner) public {
        owner = newOwner;
    }
    
    // Reentrancy vulnerability
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Vulnerable to reentrancy
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
    
    // Integer overflow vulnerability (before Solidity 0.8.0)
    function unsafeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b; // Could overflow in older Solidity versions
    }
    
    // Dangerous tx.origin usage
    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }
    
    // Unchecked external call
    function unsafeCall(address target, bytes memory data) public {
        target.call(data);
    }
    
    // Weak randomness
    function getRandomNumber() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
    }
}`;

  const loadSampleContract = () => {
    setContractCode(sampleContract);
    setError(null);
  };

  const clearContract = () => {
    setContractCode('');
    setAnalysisResult(null);
    setError(null);
    setActiveTab('input');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractCode);
  };

  const analyzeContract = async () => {
    if (!contractCode.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setActiveTab('results');

    try {
      const response = await fetch('http://localhost:3001/api/analysis/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractCode }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setAnalysisResult(data.results);
      } else {
        throw new Error(data.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Smart Contract Security Scanner
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Analyze your Solidity smart contracts for vulnerabilities, gas optimizations, and code quality issues with our comprehensive security scanner.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Contract Code</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadSampleContract}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Load Sample
                </button>
                <button
                  onClick={clearContract}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Clear
                </button>
                {contractCode && (
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>
            
            <textarea
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              placeholder="// Paste your Solidity contract code here...
// Or click 'Load Sample' to see the scanner in action"
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {contractCode.length} characters
              </div>
              <button
                onClick={analyzeContract}
                disabled={!contractCode.trim() || isAnalyzing}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  !contractCode.trim() || isAnalyzing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Analyze Contract</span>
                  </>
                )}
              </button>
            </div>
            </div>
          </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {isAnalyzing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Contract</h3>
              <p className="text-gray-600">Scanning for vulnerabilities, gas optimizations, and code quality issues...</p>
            </div>
          )}

          {error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Analysis Error</h3>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
                  <div className={`text-3xl font-bold ${getScoreColor(analysisResult.overallScore)}`}>
                    {analysisResult.overallScore}/100
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      analysisResult.overallScore >= 80 ? 'bg-green-500' :
                      analysisResult.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysisResult.overallScore}%` }}
                  />
                </div>
              </div>

              {/* Vulnerabilities */}
              {analysisResult.vulnerabilities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Vulnerabilities</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {analysisResult.vulnerabilities.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.vulnerabilities.map((vuln, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{vuln.type}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{vuln.description}</p>
                        <div className="text-xs text-gray-500 mb-2">Line {vuln.lineNumber}</div>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{vuln.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gas Optimizations */}
              {analysisResult.gasOptimizations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Gas Optimizations</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      {analysisResult.gasOptimizations.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.gasOptimizations.map((opt, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{opt.type}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {opt.potentialSavings}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{opt.description}</p>
                        <div className="text-xs text-gray-500 mb-2">Line {opt.lineNumber}</div>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex items-start space-x-2">
                            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-800">{opt.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Quality */}
              {analysisResult.codeQuality.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Code className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Code Quality</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {analysisResult.codeQuality.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.codeQuality.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{issue.type}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                        <div className="text-xs text-gray-500 mb-2">Line {issue.lineNumber}</div>
                        <div className="bg-purple-50 border border-purple-200 rounded p-3">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-purple-800">{issue.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {analysisResult.vulnerabilities.length === 0 && 
               analysisResult.gasOptimizations.length === 0 && 
               analysisResult.codeQuality.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found!</h3>
                  <p className="text-gray-600">Your contract appears to be secure and well-optimized.</p>
                </div>
              )}
            </div>
          )}

          {/* Initial State */}
          {!analysisResult && !isAnalyzing && !error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
              <p className="text-gray-600">Paste your Solidity contract code and click "Analyze Contract" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractAnalyzer; 
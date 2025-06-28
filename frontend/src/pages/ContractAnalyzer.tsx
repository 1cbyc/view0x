import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Copy, 
  Shield,
  Info
} from 'lucide-react';
import { contractApi } from '../services/api';

interface Vulnerability {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
  location: {
    start: number;
    end: number;
  };
    recommendation: string;
}

interface Warning {
    title: string;
    description: string;
  location: {
    start: number;
    end: number;
  };
    recommendation: string;
}

interface Suggestion {
    title: string;
    description: string;
  location: {
    start: number;
    end: number;
  };
    recommendation: string;
}

interface AnalysisResult {
  vulnerabilities: Vulnerability[];
  warnings: Warning[];
  suggestions: Suggestion[];
}

const ContractAnalyzer: React.FC = () => {
  const [contractCode, setContractCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractCode);
  };

  const analyzeContract = async () => {
    if (!contractCode.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await contractApi.analyzeContract({ 
        contractCode, 
        options: {} 
      });
      
      if (response.data.status === 'success') {
        setAnalysisResult(response.data.results);
      } else {
        throw new Error(response.data.message || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError(error.message || 'Analysis failed');
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

  // Helper to format location
  const formatLocation = (location: any) => {
    if (!location) return '';
    const start = location.start;
    const end = location.end;
    // If start/end are objects with line/column
    if (start && typeof start === 'object' && 'line' in start && 'column' in start && end && typeof end === 'object' && 'line' in end && 'column' in end) {
      return `Line ${start.line}:${start.column} - ${end.line}:${end.column}`;
    }
    // If start/end are numbers
    if (typeof start === 'number' && typeof end === 'number') {
      return `Line ${start}-${end}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Smart Contract Vuln Scanner
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
                          <h4 className="font-medium text-gray-900">{vuln.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{vuln.description}</p>
                        <div className="text-xs text-gray-500 mb-2">
                          {formatLocation(vuln.location)}
                        </div>
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

              {/* Warnings */}
              {analysisResult.warnings.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Warnings</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      {analysisResult.warnings.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.warnings.map((warning, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{warning.title}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            {warning.description}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{warning.recommendation}</p>
                        <div className="text-xs text-gray-500 mb-2">
                          {formatLocation(warning.location)}
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">{warning.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysisResult.suggestions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Suggestions</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {analysisResult.suggestions.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {suggestion.description}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.recommendation}</p>
                        <div className="text-xs text-gray-500 mb-2">
                          {formatLocation(suggestion.location)}
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-800">{suggestion.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {analysisResult.vulnerabilities.length === 0 && 
               analysisResult.warnings.length === 0 && 
               analysisResult.suggestions.length === 0 && (
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
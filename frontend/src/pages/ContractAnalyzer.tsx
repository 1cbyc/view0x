import React, { useState, useEffect } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  Shield,
  Info,
  BarChart2,
} from "lucide-react";
import { contractApi } from "../services/api";
import {
  socketService,
  AnalysisUpdatePayload,
} from "../services/socketService";

// --- Type Definitions ---

interface VulnerabilityElement {
  type: string;
  name: string;
  source_mapping: {
    lines: number[];
  };
}

interface Vulnerability {
  check: string;
  description: string;
  impact: "High" | "Medium" | "Low" | "Informational" | "Optimization";
  confidence: "High" | "Medium" | "Low";
  elements: VulnerabilityElement[];
}

interface AnalysisResult {
  summary: {
    totalVulnerabilities: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    overallScore: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
  };
  vulnerabilities: Vulnerability[];
}

// --- Helper & Sub-components ---

const getSeverityClass = (
  severity:
    | Vulnerability["impact"]
    | Vulnerability["confidence"]
    | AnalysisResult["summary"]["riskLevel"],
) => {
  switch (severity) {
    case "High":
    case "HIGH":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        icon: "text-red-600",
      };
    case "Medium":
    case "MEDIUM":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        icon: "text-yellow-600",
      };
    case "Low":
    case "LOW":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-300",
        icon: "text-blue-600",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-300",
        icon: "text-gray-500",
      };
  }
};

const AnalysisSummary: React.FC<{ summary: AnalysisResult["summary"] }> = ({
  summary,
}) => {
  const riskClasses = getSeverityClass(summary.riskLevel);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart2 className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">
          Analysis Summary
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div
          className={`p-4 rounded-lg ${riskClasses.bg} border ${riskClasses.border}`}
        >
          <div className="text-sm font-medium text-gray-600">Risk Level</div>
          <div className={`text-2xl font-bold ${riskClasses.text}`}>
            {summary.riskLevel}
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-600">
            Security Score
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {summary.overallScore}/100
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-2 grid grid-cols-3 gap-2">
          <div>
            <div className="text-sm font-medium text-gray-600">High</div>
            <div className="text-xl font-bold text-red-600">
              {summary.highSeverity}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Medium</div>
            <div className="text-xl font-bold text-yellow-600">
              {summary.mediumSeverity}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Low</div>
            <div className="text-xl font-bold text-blue-600">
              {summary.lowSeverity}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const ContractAnalyzer: React.FC = () => {
  const [contractCode, setContractCode] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // New state for real-time updates
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
    null,
  );

  const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Missing access control
    function setOwner(address newOwner) public {
        owner = newOwner;
    }

    // Reentrancy vulnerability
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount;
    }

    // Dangerous tx.origin usage
    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }
}`;

  useEffect(() => {
    socketService.connect();

    // The main listener function
    const handleUpdate = (payload: AnalysisUpdatePayload) => {
      // Only process updates for the current analysis
      if (payload.analysisId !== currentAnalysisId) return;

      setProgress(payload.progress);
      setProgressMessage(payload.message || "");

      if (payload.status === "completed") {
        setAnalysisResult(payload.result);
        setIsAnalyzing(false);
        setCurrentAnalysisId(null); // Stop listening
      } else if (payload.status === "failed") {
        setError(payload.error || "An unknown error occurred during analysis.");
        setIsAnalyzing(false);
        setCurrentAnalysisId(null); // Stop listening
      }
    };

    if (currentAnalysisId) {
      socketService.subscribeToAnalysis(currentAnalysisId, handleUpdate);
    }

    return () => {
      // Cleanup: Unsubscribe when the component unmounts or the analysisId changes
      if (currentAnalysisId) {
        socketService.unsubscribeFromAnalysis(currentAnalysisId);
      }
    };
  }, [currentAnalysisId]);

  // Effect for disconnecting socket on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  const resetState = () => {
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    if (currentAnalysisId) {
      socketService.unsubscribeFromAnalysis(currentAnalysisId);
      setCurrentAnalysisId(null);
    }
  };

  const loadSampleContract = () => {
    resetState();
    setContractCode(sampleContract);
  };

  const clearContract = () => {
    resetState();
    setContractCode("");
  };

  const analyzeContract = async () => {
    if (!contractCode.trim()) return;

    resetState();
    setIsAnalyzing(true);
    setProgressMessage("Submitting for analysis...");

    try {
      // The initial API call starts the job and returns the analysis ID
      const response = await contractApi.analyzeContract({ contractCode });
      const initialAnalysis = response.data;

      if (initialAnalysis && initialAnalysis.id) {
        // Set the analysis ID to trigger the useEffect hook to subscribe
        setCurrentAnalysisId(initialAnalysis.id);
      } else {
        throw new Error("Failed to start analysis: No analysis ID received.");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to submit analysis. Please check the backend connection.";
      setError(errorMessage);
      setIsAnalyzing(false);
    }
  };

  const formatLines = (lines: number[]) => {
    if (!lines || lines.length === 0) return "";
    if (lines.length === 1) return `L${lines[0]}`;
    return `L${lines[0]}-${lines[lines.length - 1]}`;
  };

  const renderVulnerability = (vuln: Vulnerability, index: number) => {
    const impactClasses = getSeverityClass(vuln.impact);
    const confidenceClasses = getSeverityClass(vuln.confidence);

    return (
      <div
        key={index}
        className="border border-gray-200 rounded-lg overflow-hidden"
      >
        <div
          className={`px-4 py-3 ${impactClasses.bg} border-b ${impactClasses.border} flex justify-between items-center`}
        >
          <h4 className={`font-semibold ${impactClasses.text}`}>
            {vuln.check}
          </h4>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${impactClasses.border} ${impactClasses.bg} ${impactClasses.text}`}
            >
              {vuln.impact} Impact
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${confidenceClasses.border} ${confidenceClasses.bg} ${confidenceClasses.text}`}
            >
              {vuln.confidence} Confidence
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-700">{vuln.description}</p>
          <div className="text-xs text-gray-500">
            {vuln.elements
              .map(
                (el) =>
                  `${el.type} "${el.name}" (${formatLines(el.source_mapping.lines)})`,
              )
              .join(", ")}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Smart Contract Security Scanner
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Analyze Solidity contracts for vulnerabilities using industry-leading
          tools like Slither.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="w-5 h-5" /> <span>Contract Code</span>
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
              </div>
            </div>
            <textarea
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              placeholder="// Paste your Solidity contract code here..."
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {contractCode.length} characters
              </div>
              <button
                onClick={analyzeContract}
                disabled={!contractCode.trim() || isAnalyzing}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${!contractCode.trim() || isAnalyzing ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"}`}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {progressMessage || "Analyzing Contract..."}
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
            </div>
          )}

          {error && !isAnalyzing && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Analysis Error
                </h3>
              </div>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              <AnalysisSummary summary={analysisResult.summary} />
              {analysisResult.vulnerabilities.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Analysis Results
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {analysisResult.vulnerabilities.length} issues found
                    </span>
                  </div>
                  <div className="space-y-4">
                    {analysisResult.vulnerabilities.map(renderVulnerability)}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Issues Found!
                  </h3>
                  <p className="text-gray-600">
                    The scanner did not find any vulnerabilities.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isAnalyzing && !error && !analysisResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-gray-600">
                Paste your contract code to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractAnalyzer;

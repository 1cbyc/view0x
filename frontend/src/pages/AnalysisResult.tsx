import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, FileText, ArrowLeft, ShieldCheck } from 'lucide-react';

// --- Type Definitions ---
// These should match the types from the backend and other components

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
  impact: 'High' | 'Medium' | 'Low' | 'Informational' | 'Optimization';
  confidence: 'High' | 'Medium' | 'Low';
  elements: VulnerabilityElement[];
}

interface AnalysisDetail {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  contractInfo: {
    name: string | null;
    lineCount: number;
    size: number;
  };
  result: {
    summary: {
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
      overallScore: number;
      riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    };
    vulnerabilities: Vulnerability[];
  } | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

// --- Helper & Sub-components ---

const getSeverityClass = (severity: 'High' | 'Medium' | 'Low' | 'HIGH' | 'MEDIUM' | 'LOW') => {
  switch (severity) {
    case 'High': case 'HIGH':
      return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
    case 'Medium': case 'MEDIUM':
      return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" };
    case 'Low': case 'LOW':
      return { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  }
};

const VulnerabilityCard: React.FC<{ vuln: Vulnerability }> = ({ vuln }) => {
  const impactClasses = getSeverityClass(vuln.impact);
  const confidenceClasses = getSeverityClass(vuln.confidence);
  const formatLines = (lines: number[]) => lines.length === 1 ? `L${lines[0]}` : `L${lines[0]}-${lines[lines.length - 1]}`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-3 ${impactClasses.bg} border-b ${impactClasses.border} flex justify-between items-center`}>
        <h4 className={`font-semibold ${impactClasses.text}`}>{vuln.check}</h4>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${impactClasses.border} ${impactClasses.bg} ${impactClasses.text}`}>
            {vuln.impact} Impact
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${confidenceClasses.border} ${confidenceClasses.bg} ${confidenceClasses.text}`}>
            {vuln.confidence} Confidence
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">{vuln.description}</p>
        <div className="text-xs text-gray-500 font-mono">
          {vuln.elements.map((el, i) => (
            <div key={i}>{`${el.type} "${el.name}" (${formatLines(el.source_mapping.lines)})`}</div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---

const AnalysisResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No analysis ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await analysisApi.getAnalysis(id);
        setAnalysis(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || `Failed to fetch analysis details for ID ${id}.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading analysis results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800">An Error Occurred</h3>
        <p className="text-red-700">{error}</p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return null; // Should be handled by loading/error states
  }

  const { contractInfo, result, status, createdAt, completedAt } = analysis;
  const riskClasses = result ? getSeverityClass(result.summary.riskLevel) : getSeverityClass('Low');

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{contractInfo.name || 'Analysis Details'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analyzed on {format(new Date(createdAt), 'MMM dd, yyyy HH:mm')}
        </p>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {result ? (
             <>
              <div className={`p-4 rounded-lg text-center ${riskClasses.bg} border ${riskClasses.border}`}>
                <div className="text-sm font-medium text-gray-600">Overall Risk</div>
                <div className={`text-3xl font-bold ${riskClasses.text}`}>{result.summary.riskLevel}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
                <div className="text-sm font-medium text-gray-600">Security Score</div>
                <div className="text-3xl font-bold text-gray-800">{result.summary.overallScore}/100</div>
              </div>
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-medium text-gray-600">High</div>
                  <div className="text-xl font-bold text-red-600">{result.summary.highSeverity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Medium</div>
                  <div className="text-xl font-bold text-yellow-600">{result.summary.mediumSeverity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Low</div>
                  <div className="text-xl font-bold text-blue-600">{result.summary.lowSeverity}</div>
                </div>
              </div>
            </>
          ) : (
             <div className="md:col-span-3 text-center p-6 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">{status === 'failed' ? 'Analysis Failed' : 'Analysis Incomplete'}</h3>
                <p className="text-sm text-gray-600">{analysis.error || 'The analysis did not produce a result.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Vulnerabilities Section */}
      {result && result.vulnerabilities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vulnerabilities Found ({result.vulnerabilities.length})</h2>
          <div className="space-y-4">
            {result.vulnerabilities.map((vuln, index) => (
              <VulnerabilityCard key={index} vuln={vuln} />
            ))}
          </div>
        </div>
      )}

      {result && result.vulnerabilities.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
           <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No Vulnerabilities Found</h3>
          <p className="mt-2 text-gray-600">Our scanner did not find any vulnerabilities in this contract.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisResultPage;

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AnalysisResult {
  vulnerabilities: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    recommendation: string;
  }>;
  warnings: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
  suggestions: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
}

const ContractAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceCode, setSourceCode] = useState('');

  const analyzeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: code }),
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json() as Promise<AnalysisResult>;
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSourceCode(e.target?.result as string);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleAnalyze = () => {
    if (sourceCode) {
      analyzeMutation.mutate(sourceCode);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Smart Contract Analyzer</h1>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Choose Solidity File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".sol"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {file ? file.name : 'or drag and drop your .sol file here'}
              </p>
            </div>
          </div>

          {/* Source Code Editor */}
          {sourceCode && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Source Code</h2>
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm"
                placeholder="Paste your Solidity code here..."
              />
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!sourceCode || analyzeMutation.isPending}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {analyzeMutation.isPending ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" />
                Analyzing...
              </span>
            ) : (
              'Analyze Contract'
            )}
          </button>

          {/* Analysis Results */}
          {analyzeMutation.isSuccess && (
            <div className="space-y-6">
              {/* Vulnerabilities */}
              {analyzeMutation.data.vulnerabilities.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Vulnerabilities</h2>
                  <div className="space-y-4">
                    {analyzeMutation.data.vulnerabilities.map((vuln, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-md p-4"
                      >
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">{vuln.title}</h3>
                            <p className="mt-1 text-sm text-red-700">{vuln.description}</p>
                            <p className="mt-2 text-sm text-red-600">
                              <strong>Recommendation:</strong> {vuln.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {analyzeMutation.data.warnings.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Warnings</h2>
                  <div className="space-y-4">
                    {analyzeMutation.data.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="bg-yellow-50 border border-yellow-200 rounded-md p-4"
                      >
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">{warning.title}</h3>
                            <p className="mt-1 text-sm text-yellow-700">{warning.description}</p>
                            <p className="mt-2 text-sm text-yellow-600">
                              <strong>Recommendation:</strong> {warning.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analyzeMutation.data.suggestions.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Suggestions</h2>
                  <div className="space-y-4">
                    {analyzeMutation.data.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="bg-green-50 border border-green-200 rounded-md p-4"
                      >
                        <div className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">{suggestion.title}</h3>
                            <p className="mt-1 text-sm text-green-700">{suggestion.description}</p>
                            <p className="mt-2 text-sm text-green-600">
                              <strong>Recommendation:</strong> {suggestion.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {analyzeMutation.data.vulnerabilities.length === 0 &&
               analyzeMutation.data.warnings.length === 0 &&
               analyzeMutation.data.suggestions.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="ml-3 text-sm font-medium text-green-800">
                      No issues found in the contract. It appears to be secure!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {analyzeMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="ml-3 text-sm font-medium text-red-800">
                  An error occurred during analysis. Please try again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractAnalyzer; 
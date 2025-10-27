import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analysisApi } from '../services/api';
import { Loader2, AlertTriangle, CheckCircle, Clock, ShieldAlert, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

// This type should match the summary object from the backend Analysis model
interface AnalysisSummary {
  id: string;
  contractName: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
  duration: number | null;
  summary: {
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  } | null;
}

const Dashboard: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await analysisApi.getHistory();
        setAnalyses(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to fetch analysis history. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusIndicator = (status: AnalysisSummary['status']) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</span>;
      case 'processing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</span>;
      case 'queued':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" /> Queued</span>;
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your analysis history...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800">An Error Occurred</h3>
          <p className="text-red-700">{error}</p>
        </div>
      );
    }

    if (analyses.length === 0) {
      return (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No Analyses Found</h3>
          <p className="mt-2 text-gray-600">You haven't analyzed any contracts yet.</p>
          <Link
            to="/analyze"
            className="mt-6 inline-block px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Start Your First Analysis
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vulnerabilities</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analyses.map((analysis) => (
              <tr key={analysis.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{analysis.contractName || 'Untitled Contract'}</div>
                  <div className="text-xs text-gray-500">ID: {analysis.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusIndicator(analysis.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {analysis.status === 'completed' && analysis.summary ? (
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="text-red-600 font-bold">{analysis.summary.highSeverity} High</span>
                      <span className="text-yellow-600 font-bold">{analysis.summary.mediumSeverity} Med</span>
                      <span className="text-blue-600 font-bold">{analysis.summary.lowSeverity} Low</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(analysis.createdAt), 'MMM dd, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/analysis/${analysis.id}`} className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Analysis History</h1>
        <Link
          to="/analyze"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>New Analysis</span>
        </Link>
      </div>
      {renderContent()}
    </div>
  );
};

export default Dashboard;

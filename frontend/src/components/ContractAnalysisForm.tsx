import React, { useState } from 'react';
import { analyzeContract } from '../store/slices/analysisSlice';
import { useAppDispatch, useAppSelector } from '../store';

const ContractAnalysisForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.analysis);
  const [contractAddress, setContractAddress] = useState('');
  const [contractCode, setContractCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contractAddress) {
      dispatch(analyzeContract(contractAddress));
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analyze Smart Contract</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="contractAddress" className="block text-sm font-medium text-gray-700">
            Contract Address
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="contractAddress"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0x..."
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Enter the Ethereum contract address to analyze
          </p>
        </div>

        <div>
          <label htmlFor="contractCode" className="block text-sm font-medium text-gray-700">
            Contract Source Code (Optional)
          </label>
          <div className="mt-1">
            <textarea
              id="contractCode"
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              rows={10}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
              placeholder="// Paste your Solidity contract code here..."
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            If you have the contract source code, paste it here for more detailed analysis
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
              ${loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              'Analyze Contract'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractAnalysisForm; 
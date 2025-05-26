import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

function App() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/scan', { code });
      setResults(response.data);
    } catch (err) {
      setResults({ error: 'Failed to scan contract' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Smart Contract Scanner</h1>
        <div className="h-96 mb-4">
          <Editor
            height="100%"
            defaultLanguage="sol"
            value={code}
            onChange={(val) => setCode(val)}
          />
        </div>
//      <textarea
//        className="w-full h-64 p-4 border border-gray-300 rounded mb-4"
//        placeholder="Paste your Solidity code here..."
//        value={code}
//        onChange={(e) => setCode(e.target.value)}
//      />
      <button
        onClick={handleScan}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Scanning...' : 'Scan Contract'}
      </button>

      {results && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Scan Results</h2>
          {results.success ? (
            results.issues.length ? (
              <ul className="list-disc pl-6">
                {results.issues.map((issue, idx) => (
                  <li key={idx}>
                    <strong>{issue.type}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-green-600">✅ No issues found!</p>
            )
          ) : (
            <p className="text-red-600">❌ {results.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

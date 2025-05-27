import React, { useState } from 'react';
import axios from 'axios';

const SAMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public constant WITHDRAWAL_LIMIT = 1 ether;
    function setOwner(address newOwner) public { owner = newOwner; }
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }
    function unsafeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    function destroy() public { selfdestruct(payable(msg.sender)); }
    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }
    function unsafeCall(address target, bytes memory data) public {
        target.call(data);
    }
    function getRandomNumber() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
    }
    function delegateCall(address target, bytes memory data) public {
        target.delegatecall(data);
    }
    struct User { uint256 id; bool isActive; uint256 balance; address addr; }
    User[] public users;
    function findUser(address addr) public view returns (uint256) {
        for(uint256 i = 0; i < users.length; i++) {
            if(users[i].addr == addr) { return i; }
        }
        return type(uint256).max;
    }
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return amount * 5 / 100;
    }
    function complexFunction(uint256 amount, address to, bool shouldTransfer) public {
        if(amount > 0) {
            if(to != address(0)) {
                if(shouldTransfer) {
                    balances[to] += amount;
                    balances[msg.sender] -= amount;
                    emit Transfer(msg.sender, to, amount);
                }
            }
        }
    }
    event Transfer(address indexed from, address indexed to, uint256 amount);
}
`;

export default function ContractScannerUI() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await axios.post('http://localhost:4000/scan', { code });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed');
    }
    setLoading(false);
  };

  const handleLoadSample = () => {
    setCode(SAMPLE_CONTRACT);
    setResults(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a0845] to-[#6441a5] flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
        <span role="img" aria-label="shield">🛡️</span> Smart Contract Security Scanner
      </h1>
      <p className="text-purple-200 mb-6">Comprehensive security auditing and vulnerability detection for smart contracts</p>
      <div className="w-full max-w-2xl bg-[#3a2067] rounded-xl p-6 shadow-lg mb-6">
        <label className="block text-purple-200 font-semibold mb-2">Contract Code</label>
        <textarea
          className="w-full h-40 p-3 rounded bg-[#18122b] text-purple-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Paste your Solidity contract code here..."
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition disabled:opacity-50"
            onClick={handleScan}
            disabled={loading || !code.trim()}
          >
            {loading ? 'Scanning...' : 'Scan Contract'}
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded transition"
            onClick={handleLoadSample}
            disabled={loading}
          >
            Load Sample
          </button>
        </div>
      </div>

      {/* Results */}
      {!results && !error && (
        <div className="w-full max-w-2xl bg-[#3a2067] rounded-xl p-6 text-center text-purple-200 mb-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">🛡️</span>
            <div className="font-semibold text-lg">Ready to Scan</div>
            <div>Paste your contract code and click <b>Scan Contract</b> to begin security analysis.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full max-w-2xl bg-red-700 rounded-xl p-4 text-white mb-4">
          <b>Error:</b> {error}
        </div>
      )}

      {results && (
        <div className="w-full max-w-2xl space-y-4">
          {/* Vulnerability Detection */}
          <SectionCard
            icon="⚠️"
            title="Vulnerability Detection"
            color="red"
            items={results.vulnerabilities}
            fields={['type', 'description', 'lineNumber', 'recommendation']}
            emptyText="No vulnerabilities found."
          />
          {/* Gas Optimization */}
          <SectionCard
            icon="💡"
            title="Gas Optimization"
            color="yellow"
            items={results.gasOptimizations}
            fields={['type', 'description', 'potentialSavings', 'recommendation']}
            emptyText="No gas optimizations found."
          />
          {/* Code Quality */}
          <SectionCard
            icon="✅"
            title="Code Quality"
            color="green"
            items={results.codeQuality}
            fields={['type', 'description', 'severity', 'recommendation']}
            emptyText="No code quality issues found."
          />
          {/* Overall Score */}
          <div className="bg-[#3a2067] rounded-xl p-4 text-center text-purple-200">
            <div className="text-lg font-semibold">Overall Security Score</div>
            <div className="text-3xl font-bold text-white">{results.overallScore}/100</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ icon, title, color, items, fields, emptyText }) {
  return (
    <div className={`bg-[#3a2067] rounded-xl p-4 border-l-4 border-${color}-400`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`font-bold text-${color}-300`}>{title}</span>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="bg-[#2a0845] rounded p-3 text-purple-100">
              {fields.map(field => (
                <div key={field}>
                  <b className="capitalize">{field.replace(/([A-Z])/g, ' $1')}:</b> {item[field]}
                </div>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-purple-400">{emptyText}</div>
      )}
    </div>
  );
} 
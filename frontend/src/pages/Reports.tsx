import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analysis Reports</h1>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <p className="text-gray-600">No reports available.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports; 
import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Analysis Reports</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {/* Placeholder for reports list */}
              <li className="px-6 py-4">
                <p className="text-sm text-gray-500">No reports available yet.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 
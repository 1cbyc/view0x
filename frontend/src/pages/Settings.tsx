import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { updateSettings } from '../store/slices/settingsSlice';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleToggle = (key: keyof typeof settings) => {
    dispatch(updateSettings({ [key]: !settings[key] }));
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Analysis Settings
              </h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="reentrancy" className="text-sm font-medium text-gray-700">
                      Reentrancy Detection
                    </label>
                    <p className="text-sm text-gray-500">
                      Enable detection of reentrancy vulnerabilities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('reentrancyDetection')}
                    className={`${
                      settings.reentrancyDetection ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <span
                      className={`${
                        settings.reentrancyDetection ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="overflow" className="text-sm font-medium text-gray-700">
                      Integer Overflow Detection
                    </label>
                    <p className="text-sm text-gray-500">
                      Enable detection of integer overflow vulnerabilities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('overflowDetection')}
                    className={`${
                      settings.overflowDetection ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <span
                      className={`${
                        settings.overflowDetection ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="access" className="text-sm font-medium text-gray-700">
                      Access Control Detection
                    </label>
                    <p className="text-sm text-gray-500">
                      Enable detection of access control vulnerabilities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('accessControlDetection')}
                    className={`${
                      settings.accessControlDetection ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <span
                      className={`${
                        settings.accessControlDetection ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 
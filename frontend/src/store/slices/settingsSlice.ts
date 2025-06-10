import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AnalyzerSettings {
  enabled: boolean;
  severity: 'high' | 'medium' | 'low';
}

interface SettingsState {
  apiEndpoint: string;
  scanTimeout: number;
  analyzers: {
    reentrancy: AnalyzerSettings;
    integerOverflow: AnalyzerSettings;
    accessControl: AnalyzerSettings;
    uninitializedStorage: AnalyzerSettings;
    delegateCall: AnalyzerSettings;
  };
}

const initialState: SettingsState = {
  apiEndpoint: 'http://localhost:8000',
  scanTimeout: 300,
  analyzers: {
    reentrancy: { enabled: true, severity: 'high' },
    integerOverflow: { enabled: true, severity: 'high' },
    accessControl: { enabled: true, severity: 'high' },
    uninitializedStorage: { enabled: true, severity: 'medium' },
    delegateCall: { enabled: true, severity: 'high' },
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateApiEndpoint: (state, action: PayloadAction<string>) => {
      state.apiEndpoint = action.payload;
    },
    updateScanTimeout: (state, action: PayloadAction<number>) => {
      state.scanTimeout = action.payload;
    },
    updateAnalyzerSettings: (
      state,
      action: PayloadAction<{
        analyzer: keyof SettingsState['analyzers'];
        settings: AnalyzerSettings;
      }>
    ) => {
      const { analyzer, settings } = action.payload;
      state.analyzers[analyzer] = settings;
    },
  },
});

export const {
  updateApiEndpoint,
  updateScanTimeout,
  updateAnalyzerSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer; 
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Vulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
}

interface AnalysisResult {
  contractAddress: string;
  vulnerabilities: Vulnerability[];
  timestamp: string;
  analysisId: number;
}

interface AnalysisState {
  results: AnalysisResult[];
  currentAnalysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalysisState = {
  results: [],
  currentAnalysis: null,
  loading: false,
  error: null,
};

export const analyzeContract = createAsyncThunk(
  'analysis/analyzeContract',
  async (contractAddress: string) => {
    const response = await api.post('/analysis/analyze', { contractAddress });
    return response.data.results;
  }
);

export const getAnalysisHistory = createAsyncThunk(
  'analysis/getHistory',
  async () => {
    const response = await api.get('/analysis/history');
    return response.data;
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Analyze Contract
      .addCase(analyzeContract.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(analyzeContract.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAnalysis = action.payload;
        state.results.unshift(action.payload);
      })
      .addCase(analyzeContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to analyze contract';
      })
      // Get Analysis History
      .addCase(getAnalysisHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAnalysisHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
      })
      .addCase(getAnalysisHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch analysis history';
      });
  },
});

export const { clearCurrentAnalysis } = analysisSlice.actions;
export default analysisSlice.reducer; 
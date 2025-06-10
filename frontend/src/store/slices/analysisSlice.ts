import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contractApi } from '../../services/api';

export interface AnalysisResult {
  id: string;
  contractAddress: string;
  vulnerabilities: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    location: {
      line: number;
      column: number;
    };
  }[];
  timestamp: string;
  status: 'completed' | 'failed' | 'in_progress';
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
    const response = await contractApi.analyzeContract({ contractCode: contractAddress, options: {} });
    return response.data;
  }
);

export const getAnalysisHistory = createAsyncThunk(
  'analysis/getHistory',
  async () => {
    const response = await contractApi.getAnalysisHistory();
    return response.data;
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
        state.error = action.error.message || 'Analysis failed';
      })
      .addCase(getAnalysisHistory.fulfilled, (state, action) => {
        state.results = action.payload;
      });
  },
});

export const { clearCurrentAnalysis } = analysisSlice.actions;
export default analysisSlice.reducer; 
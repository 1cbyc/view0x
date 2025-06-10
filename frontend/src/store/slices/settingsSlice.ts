import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  reentrancyDetection: boolean;
  overflowDetection: boolean;
  accessControlDetection: boolean;
}

const initialState: SettingsState = {
  reentrancyDetection: true,
  overflowDetection: true,
  accessControlDetection: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { updateSettings } = settingsSlice.actions;
export default settingsSlice.reducer; 
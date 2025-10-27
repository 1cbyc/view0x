import { EventEmitter } from 'events';

// Define the structure of the analysis update payload
export interface AnalysisUpdatePayload {
  analysisId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  error?: string;
  result?: any;
}

// Create a singleton EventEmitter instance
class AppEventEmitter extends EventEmitter {}
export const appEvents = new AppEventEmitter();

// Define event names as constants to avoid typos
export const AppEvent = {
  ANALYSIS_UPDATE: 'analysis:update',
};

// Type-safe emit and on methods for analysis updates
export function emitAnalysisUpdate(payload: AnalysisUpdatePayload) {
  appEvents.emit(AppEvent.ANALYSIS_UPDATE, payload);
}

export function onAnalysisUpdate(listener: (payload: AnalysisUpdatePayload) => void) {
  appEvents.on(AppEvent.ANALYSIS_UPDATE, listener);
}

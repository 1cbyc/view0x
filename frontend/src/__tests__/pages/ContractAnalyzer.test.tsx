import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContractAnalyzer from '@/pages/ContractAnalyzer';
import { analysisApi } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
  analysisApi: {
    createPublicAnalysis: vi.fn(),
  },
}));

// Mock socket service
vi.mock('@/services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribeToAnalysis: vi.fn(),
    unsubscribeFromAnalysis: vi.fn(),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ContractAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the contract analyzer page', () => {
    renderWithRouter(<ContractAnalyzer />);
    expect(screen.getByText(/Smart Contract Security Scanner/i)).toBeInTheDocument();
  });

  it('should display code editor', () => {
    renderWithRouter(<ContractAnalyzer />);
    // CodeMirror renders as a textarea
    const editor = document.querySelector('.cm-editor');
    expect(editor).toBeInTheDocument();
  });

  it('should show analyze button', () => {
    renderWithRouter(<ContractAnalyzer />);
    expect(screen.getByRole('button', { name: /analyze contract/i })).toBeInTheDocument();
  });

  it('should show load example button', () => {
    renderWithRouter(<ContractAnalyzer />);
    expect(screen.getByRole('button', { name: /load example/i })).toBeInTheDocument();
  });
});

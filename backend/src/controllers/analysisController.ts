import { Request, Response } from 'express';
import { ScannerEngine } from '../../../scanner-engine/dist/ScannerEngine';

const scannerEngine = new ScannerEngine();

export const analyzeContract = async (req: Request, res: Response) => {
    try {
        const { sourceCode } = req.body;
        
        if (!sourceCode) {
            return res.status(400).json({
                error: 'Source code is required',
                details: 'Please provide the Solidity source code in the request body'
            });
        }

        const analysisResult = await scannerEngine.analyzeContract(sourceCode);
        res.json(analysisResult);
    } catch (error) {
        console.error('Error analyzing contract:', error);
        
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Failed to analyze contract',
                details: error.message
            });
        }
        
        res.status(500).json({
            error: 'Failed to analyze contract',
            details: 'An unexpected error occurred'
        });
    }
}; 
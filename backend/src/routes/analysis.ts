import { Router } from 'express';
import { analyzeContract } from '../controllers/analysisController';
import { ScannerEngine } from 'scanner-engine';

const router = Router();

// Public analysis endpoint (no authentication required)
router.post('/public', async (req, res) => {
    try {
        const { contractCode } = req.body;
        
        if (!contractCode || typeof contractCode !== 'string') {
            return res.status(400).json({ 
                status: 'error',
                message: 'Contract code is required' 
            });
        }

        // Use the real scanner engine
        const engine = new ScannerEngine();
        let analysisResult;
        try {
            analysisResult = await engine.analyzeContract(contractCode);
        } catch (err: any) {
            return res.status(400).json({
                status: 'error',
                message: 'Failed to analyze contract. Please check your Solidity code.',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        res.json({
            status: 'success',
            message: 'Analysis completed',
            results: analysisResult
        });
    } catch (error: any) {
        console.error('Analysis error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Protected analysis endpoint (requires authentication)
router.post('/', analyzeContract);

export default router; 
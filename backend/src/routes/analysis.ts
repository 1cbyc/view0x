import { Router } from 'express';
import { analyzeContract } from '../controllers/analysisController';

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

        // For now, return mock analysis results
        // TODO: Integrate with the actual scanner engine
        const mockResult = {
            vulnerabilities: [
                {
                    type: 'Reentrancy Attack',
                    severity: 'HIGH',
                    description: 'External calls are made before state changes, which could lead to reentrancy attacks.',
                    lineNumber: 18,
                    recommendation: 'Use the checks-effects-interactions pattern. Update state before making external calls.'
                },
                {
                    type: 'Missing Access Control',
                    severity: 'HIGH',
                    description: 'Function modifies state but lacks access control modifiers.',
                    lineNumber: 10,
                    recommendation: 'Add access control modifiers (e.g., onlyOwner, onlyRole) to restrict function access.'
                },
                {
                    type: 'tx.origin Usage',
                    severity: 'MEDIUM',
                    description: 'Using tx.origin for authorization can be exploited by malicious contracts.',
                    lineNumber: 30,
                    recommendation: 'Use msg.sender instead of tx.origin for authorization checks.'
                },
                {
                    type: 'Weak Randomness',
                    severity: 'MEDIUM',
                    description: 'Using block.timestamp and block.difficulty for randomness is predictable.',
                    lineNumber: 40,
                    recommendation: 'Use Chainlink VRF or similar secure randomness solutions.'
                }
            ],
            gasOptimizations: [
                {
                    type: 'State Variable Packing',
                    potentialSavings: '~2000 gas',
                    description: 'State variables can be packed into fewer storage slots.',
                    lineNumber: 4,
                    recommendation: 'Group related state variables together to optimize storage layout.'
                },
                {
                    type: 'Unchecked External Call',
                    potentialSavings: '~2600 gas',
                    description: 'External call result is not checked for success.',
                    lineNumber: 35,
                    recommendation: 'Always check the return value of external calls.'
                }
            ],
            codeQuality: [
                {
                    type: 'Magic Numbers',
                    severity: 'LOW',
                    description: 'Hardcoded values should be defined as constants.',
                    lineNumber: 5,
                    recommendation: 'Define magic numbers as named constants for better readability.'
                },
                {
                    type: 'Complex Function',
                    severity: 'LOW',
                    description: 'Function has multiple responsibilities and could be simplified.',
                    lineNumber: 15,
                    recommendation: 'Break down complex functions into smaller, focused functions.'
                }
            ],
            overallScore: 65
        };

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({
            status: 'success',
            message: 'Analysis completed',
            results: mockResult
        });
    } catch (error) {
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
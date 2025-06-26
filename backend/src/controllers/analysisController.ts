import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { AnalysisResult } from '../models/AnalysisResult';

// Common vulnerability patterns
const VULNERABILITY_PATTERNS = {
    reentrancy: [
        'call.value',
        'transfer',
        'send',
        'fallback',
        'receive'
    ],
    overflow: [
        'uint256',
        'int256',
        'SafeMath',
        '+',
        '-',
        '*',
        '/'
    ],
    accessControl: [
        'onlyOwner',
        'require',
        'assert',
        'modifier'
    ]
};

export const analyzeContract = async (req: Request, res: Response) => {
    try {
        const { contractAddress } = req.body;
        
        if (!ethers.isAddress(contractAddress)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid contract address' 
            });
        }

        // Get contract source code
        const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');
        const code = await provider.getCode(contractAddress);
        
        if (code === '0x') {
            return res.status(400).json({ 
                status: 'error',
                message: 'No contract found at this address' 
            });
        }

        // Analyze for vulnerabilities
        const vulnerabilities = [];
        
        // Check for reentrancy vulnerabilities
        if (VULNERABILITY_PATTERNS.reentrancy.some(pattern => code.includes(pattern))) {
            vulnerabilities.push({
                type: 'reentrancy',
                severity: 'high',
                description: 'Potential reentrancy vulnerability detected. Check for proper checks-effects-interactions pattern.',
                recommendations: [
                    'Use ReentrancyGuard',
                    'Implement checks-effects-interactions pattern',
                    'Consider using pull payment pattern'
                ]
            });
        }

        // Check for integer overflow
        if (VULNERABILITY_PATTERNS.overflow.some(pattern => code.includes(pattern))) {
            vulnerabilities.push({
                type: 'integer_overflow',
                severity: 'medium',
                description: 'Potential integer overflow vulnerability detected. Check for proper SafeMath usage.',
                recommendations: [
                    'Use SafeMath library',
                    'Implement overflow checks',
                    'Consider using Solidity 0.8+ which has built-in overflow checks'
                ]
            });
        }

        // Check for access control issues
        if (VULNERABILITY_PATTERNS.accessControl.some(pattern => code.includes(pattern))) {
            vulnerabilities.push({
                type: 'access_control',
                severity: 'medium',
                description: 'Potential access control issues detected. Review permission checks.',
                recommendations: [
                    'Implement proper access control modifiers',
                    'Use OpenZeppelin AccessControl',
                    'Review all permission checks'
                ]
            });
        }

        // Save analysis result
        const analysisResult = await AnalysisResult.create({
            contractAddress,
            vulnerabilities,
            timestamp: new Date(),
            userId: (req as any).user.userId
        });

        res.json({
            status: 'success',
            message: 'Analysis completed',
            results: {
                contractAddress,
                vulnerabilities,
                timestamp: analysisResult.timestamp,
                analysisId: analysisResult.id
            }
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
    }
}; 
import { Router } from 'express';
import { analyzeContract } from '../controllers/analysisController';

const router = Router();

router.post('/analyze', analyzeContract);

export default router; 
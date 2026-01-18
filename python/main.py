#!/usr/bin/env python3
"""
view0x Python Analysis Server
HTTP server that handles contract analysis requests from the Node.js backend.
"""

import json
import logging
import os
import sys
import time
import traceback
from typing import Dict, Any, Optional
import asyncio
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import redis.asyncio as redis

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from analyzers.slither_analyzer import SlitherAnalyzer
from analyzers.gas_optimizer import GasOptimizer
from analyzers.code_quality import CodeQualityAnalyzer

# Optional analyzers - import only if available
try:
    from analyzers.mythril_analyzer import mythril_analyzer
except ImportError:
    mythril_analyzer = None
    logger.warning("Mythril analyzer not available (package not installed)")

try:
    from analyzers.semgrep_analyzer import semgrep_analyzer
except ImportError:
    semgrep_analyzer = None
    logger.warning("Semgrep analyzer not available (package not installed)")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class AnalysisRequest(BaseModel):
    contract_code: str = Field(..., min_length=1, description="Solidity contract code")
    job_id: str = Field(..., description="Unique job identifier")
    options: Dict[str, Any] = Field(default_factory=dict, description="Analysis options")
    callback_url: Optional[str] = Field(None, description="Callback URL for results")

class AnalysisResponse(BaseModel):
    success: bool
    job_id: str
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: float
    version: str
    analyzers: Dict[str, bool]

# Global variables
app = None
redis_client = None
slither_analyzer = None
mythril_analyzer_instance = None
semgrep_analyzer_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client, slither_analyzer, mythril_analyzer_instance, semgrep_analyzer_instance

    logger.info("Starting view0x Analysis Server...")

    try:
        # Initialize Redis connection
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connection established")

        # Initialize analyzers
        slither_analyzer = SlitherAnalyzer()
        mythril_analyzer_instance = mythril_analyzer if mythril_analyzer is not None else None
        semgrep_analyzer_instance = semgrep_analyzer if semgrep_analyzer is not None else None

        # Log analyzer availability
        if slither_analyzer.is_available():
            logger.info("Slither analyzer available")
        else:
            logger.warning("Slither analyzer not available")

        if mythril_analyzer_instance and mythril_analyzer_instance.is_available():
            logger.info("Mythril analyzer available")
        else:
            logger.warning("Mythril analyzer not available")

        if semgrep_analyzer_instance and semgrep_analyzer_instance.is_available():
            logger.info("Semgrep analyzer available")
        else:
            logger.warning("Semgrep analyzer not available")

        logger.info("Analysis server started successfully")

    except Exception as e:
        logger.error(f"Failed to initialize server: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down Analysis Server...")
    if redis_client:
        await redis_client.close()
    logger.info("Analysis Server shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="view0x Analysis Server",
    description="Python-based analysis server for smart contract security auditing",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_ok = False
        if redis_client:
            try:
                await redis_client.ping()
                redis_ok = True
            except Exception:
                pass

        # Check analyzers
        analyzers_status = {
            "slither": slither_analyzer.is_available() if slither_analyzer else False,
            "mythril": mythril_analyzer_instance.is_available() if mythril_analyzer_instance else False,
            "semgrep": semgrep_analyzer_instance.is_available() if semgrep_analyzer_instance else False,
        }

        status = "healthy" if redis_ok and any(analyzers_status.values()) else "unhealthy"

        return HealthResponse(
            status=status,
            timestamp=time.time(),
            version="1.0.0",
            analyzers=analyzers_status
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_contract(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze a smart contract"""
    try:
        logger.info(f"Starting analysis for job {request.job_id}")

        # Validate request
        if len(request.contract_code) > 5_000_000:  # 5MB limit
            raise HTTPException(
                status_code=400,
                detail="Contract code too large (max 5MB)"
            )

        # Add background task for analysis
        background_tasks.add_task(
            process_analysis,
            request.job_id,
            request.contract_code,
            request.options,
            request.callback_url
        )

        return AnalysisResponse(
            success=True,
            job_id=request.job_id,
            message="Analysis started successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_analysis(
    job_id: str,
    contract_code: str,
    options: Dict[str, Any],
    callback_url: Optional[str] = None
):
    """Process contract analysis in background"""
    try:
        logger.info(f"Processing analysis for job {job_id}")

        # Update job status to processing
        await update_job_status(job_id, "processing", 10, "Initializing analysis")

        # Determine which engine to use
        engine = options.get('engine', 'slither') if options else 'slither'
        logger.info(f"Running analysis with engine: {engine}")

        # Run the selected analyzer
        loop = asyncio.get_event_loop()
        result = None

        if engine == 'slither':
            if not slither_analyzer or not slither_analyzer.is_available():
                raise Exception("Slither analyzer not available")
            
            await update_job_status(job_id, "processing", 30, "Running Slither analysis")
            result = await loop.run_in_executor(
                None,
                slither_analyzer.analyze,
                contract_code
            )
            
        elif engine == 'mythril':
            if not mythril_analyzer_instance or not mythril_analyzer_instance.is_available():
                raise Exception("Mythril analyzer not available")
            
            await update_job_status(job_id, "processing", 30, "Running Mythril analysis")
            result = await loop.run_in_executor(
                None,
                mythril_analyzer_instance.analyze,
                contract_code
            )
            
        elif engine == 'semgrep':
            if not semgrep_analyzer_instance or not semgrep_analyzer_instance.is_available():
                raise Exception("Semgrep analyzer not available")
            
            await update_job_status(job_id, "processing", 30, "Running Semgrep analysis")
            result = await loop.run_in_executor(
                None,
                semgrep_analyzer_instance.analyze,
                contract_code
            )
        else:
            raise Exception(f"Unknown engine: {engine}")

        if not result:
            raise Exception("Analysis returned no result")

        await update_job_status(job_id, "processing", 70, "Running gas optimization analysis")
        
        # Run gas optimization analysis
        gas_optimizer = GasOptimizer()
        gas_optimizations = await loop.run_in_executor(
            None,
            gas_optimizer.analyze,
            contract_code
        )

        await update_job_status(job_id, "processing", 80, "Running code quality analysis")
        
        # Run code quality analysis
        code_quality_analyzer = CodeQualityAnalyzer()
        code_quality_issues = await loop.run_in_executor(
            None,
            code_quality_analyzer.analyze,
            contract_code
        )

        await update_job_status(job_id, "processing", 85, "Processing results")

        # Format results for our system
        analysis_result = {
            "summary": {
                "totalVulnerabilities": result["summary"]["totalVulnerabilities"],
                "highSeverity": result["summary"]["highSeverity"],
                "mediumSeverity": result["summary"]["mediumSeverity"],
                "lowSeverity": result["summary"]["lowSeverity"],
                "gasOptimizations": len(gas_optimizations),
                "codeQualityIssues": len(code_quality_issues),
                "overallScore": calculate_security_score(result["summary"]),
                "riskLevel": determine_risk_level(result["summary"])
            },
            "vulnerabilities": result["vulnerabilities"],
            "gasOptimizations": gas_optimizations,
            "codeQuality": code_quality_issues,
            "metadata": {
                "analysisTime": result["metadata"]["processingTime"],
                "toolsUsed": [engine, "gas-optimizer", "code-quality"],
                "contractStats": result["metadata"]["contractStats"],
                "timestamp": time.time(),
                "version": "1.0.0",
                "cacheHit": False
            }
        }

        # Store results in Redis
        await store_analysis_result(job_id, analysis_result)

        # Update job status to completed
        await update_job_status(job_id, "completed", 100, "Analysis completed")

        logger.info(f"Analysis completed for job {job_id}")

        # TODO: Send callback if provided
        if callback_url:
            await send_callback(callback_url, job_id, analysis_result)

    except Exception as e:
        logger.error(f"Analysis failed for job {job_id}: {e}")
        logger.error(traceback.format_exc())

        # Update job status to failed
        await update_job_status(job_id, "failed", 0, f"Analysis failed: {str(e)}")

        # Store error in Redis
        error_result = {
            "error": str(e),
            "timestamp": time.time(),
            "job_id": job_id
        }
        await store_analysis_result(job_id, error_result, failed=True)

async def update_job_status(
    job_id: str,
    status: str,
    progress: int,
    current_step: str
):
    """Update job status in Redis"""
    try:
        if redis_client:
            status_data = {
                "status": status,
                "progress": progress,
                "current_step": current_step,
                "updated_at": time.time()
            }
            await redis_client.hset(
                f"job_status:{job_id}",
                mapping=status_data
            )

            # Publish status update for real-time notifications
            await redis_client.publish(
                f"job_updates:{job_id}",
                json.dumps(status_data)
            )

    except Exception as e:
        logger.error(f"Failed to update job status: {e}")

async def store_analysis_result(
    job_id: str,
    result: Dict[str, Any],
    failed: bool = False
):
    """Store analysis result in Redis"""
    try:
        if redis_client:
            result_key = f"analysis_result:{job_id}"

            # Store result with 24 hour expiration
            await redis_client.setex(
                result_key,
                86400,  # 24 hours
                json.dumps(result)
            )

            logger.info(f"Stored analysis result for job {job_id}")

    except Exception as e:
        logger.error(f"Failed to store analysis result: {e}")

async def send_callback(callback_url: str, job_id: str, result: Dict[str, Any]):
    """Send callback notification (TODO: Implement)"""
    # TODO: Implement HTTP callback to Node.js backend
    logger.info(f"TODO: Send callback to {callback_url} for job {job_id}")

def calculate_security_score(summary: Dict[str, int]) -> int:
    """Calculate overall security score (0-100)"""
    high = summary.get("highSeverity", 0)
    medium = summary.get("mediumSeverity", 0)
    low = summary.get("lowSeverity", 0)

    # Weight different severities
    penalty = (high * 20) + (medium * 5) + (low * 1)

    # Start with 100 and subtract penalties
    score = max(0, 100 - penalty)
    return score

def determine_risk_level(summary: Dict[str, int]) -> str:
    """Determine overall risk level"""
    high = summary.get("highSeverity", 0)
    medium = summary.get("mediumSeverity", 0)

    if high > 0:
        return "HIGH" if high > 2 else "MEDIUM"
    elif medium > 5:
        return "MEDIUM"
    else:
        return "LOW"

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "view0x Analysis Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze"
        }
    }

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, shutting down...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    # Configuration
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    workers = int(os.getenv("WORKERS", "1"))
    log_level = os.getenv("LOG_LEVEL", "info")

    logger.info(f"Starting server on {host}:{port}")

    # Run server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        workers=workers,
        log_level=log_level,
        reload=os.getenv("RELOAD", "false").lower() == "true"
    )

import { Router } from "express";
import { cacheMiddleware } from "../middleware/cacheMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { getFacets, getIncident, getStats, listIncidents } from "../controllers/rektController";

const router = Router();

router.get("/stats", cacheMiddleware(300), asyncHandler(getStats));
router.get("/facets", cacheMiddleware(300), asyncHandler(getFacets));
router.get("/incidents", cacheMiddleware(120), asyncHandler(listIncidents));
router.get("/incidents/:slug", cacheMiddleware(300), asyncHandler(getIncident));

export default router;

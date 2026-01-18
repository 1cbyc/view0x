import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController";

const router = Router();

router.use(auth);

router.post("/", asyncHandler(createTemplate));
router.get("/", asyncHandler(getTemplates));
router.get("/:id", asyncHandler(getTemplate));
router.put("/:id", asyncHandler(updateTemplate));
router.delete("/:id", asyncHandler(deleteTemplate));

export default router;

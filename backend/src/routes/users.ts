import { Request, Response, Router } from "express";
import { auth } from "../middleware/auth";
import { asyncHandler, NotFoundError, ValidationError } from "../middleware/errorHandler";
import { User } from "../models/User";

const router = Router();

router.use(auth);

router.get(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.scope("withoutSecrets").findByPk(req.user?.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: {
        user: user.toProfileObject(),
      },
    });
  }),
);

router.put(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user?.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { name, company, avatar } = req.body as {
      name?: string;
      company?: string;
      avatar?: string;
    };

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new ValidationError("Name cannot be empty");
      }
      user.name = trimmedName;
    }

    if (company !== undefined) {
      (user as any).company = company.trim() || null;
    }

    if (avatar !== undefined) {
      (user as any).avatar = avatar.trim() || null;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: user.toProfileObject(),
      },
    });
  }),
);

router.get(
  "/usage",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user?.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: {
        plan: user.plan,
        usageCount: user.usageCount,
        usageLimit: user.usageLimit,
        usagePercentage: user.getUsagePercentage(),
        canAnalyze: user.canAnalyze(),
      },
    });
  }),
);

router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "users",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

export default router;

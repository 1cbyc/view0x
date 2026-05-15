import authRoutes from "./auth";
import analysisRoutes from "./analysis";
import userRoutes from "./users";

export function mountApiRoutes(app: import("express").Express): void {
  app.use("/api/auth", authRoutes);
  app.use("/api/analysis", analysisRoutes);
  app.use("/api/users", userRoutes);
}

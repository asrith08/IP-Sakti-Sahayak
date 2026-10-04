import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get(
  "/me",
  authMiddleware,
  (req: AuthenticatedRequest, res) => {
    const { supabaseUser } = req;
    if (!supabaseUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({
      authenticated: true,
      userId: supabaseUser.id,
    });
  },
);

export default router;

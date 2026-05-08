import { Router } from "express";
import evaluateRoutes from "./routes/evaluate.route.ts";

const router = Router();

router.use("/evaluate", evaluateRoutes);

export default router;

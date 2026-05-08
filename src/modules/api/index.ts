import { Router } from "express";
import examsRoutes from "./routes/exams.route";
import submissionsRoutes from "./routes/submissions.route";

const router = Router();

router.use("/exams", examsRoutes);
router.use("/submissions", submissionsRoutes);

export default router;

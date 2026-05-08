import { Router } from "express";
import examsRoutes from "./routes/exams.route";
import ocrRoutes from "./routes/ocr.route";
import submissionsRoutes from "./routes/submissions.route";

const router = Router();

router.use("/ocr", ocrRoutes);
router.use("/exams", examsRoutes);
router.use("/submissions", submissionsRoutes);

export default router;

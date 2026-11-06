import { Router, type IRouter } from "express";
import healthRouter from "./health";
import taxRouter from "./tax";

const router: IRouter = Router();

router.use(healthRouter);
router.use(taxRouter);

export default router;

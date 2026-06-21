import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import onboardRouter from "./onboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(onboardRouter);

export default router;

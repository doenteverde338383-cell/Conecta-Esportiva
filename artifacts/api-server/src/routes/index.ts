import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import videosRouter from "./videos";
import storageRouter from "./storage";
import challengesRouter from "./challenges";
import rankingsRouter from "./rankings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(videosRouter);
router.use(storageRouter);
router.use(challengesRouter);
router.use(rankingsRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import usersRouter from "./users";
import storageRouter from "./storage";
import supabaseRouter from "./supabase";
import notificationsRouter from "./notifications";
import versionRouter from "./version";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/users", usersRouter);
router.use("/storage", storageRouter);
router.use("/supabase", supabaseRouter);
router.use("/notifications", notificationsRouter);
router.use(versionRouter);

export default router;

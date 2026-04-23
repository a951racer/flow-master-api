import { Router } from "express";
import { getAll } from "../controllers/user.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);

export default router;

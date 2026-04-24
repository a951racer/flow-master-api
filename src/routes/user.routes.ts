import { Router } from "express";
import { getAll, update, remove } from "../controllers/user.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateObjectId } from "../middleware/validate-object-id";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.put("/:id", validateObjectId("id"), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/period.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { periodSchema } from "../schemas/period.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(periodSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(periodSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

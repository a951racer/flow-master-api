import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/period-income.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { periodIncomeSchema } from "../schemas/period-income.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(periodIncomeSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(periodIncomeSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

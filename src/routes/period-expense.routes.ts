import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/period-expense.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { periodExpenseSchema } from "../schemas/period-expense.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(periodExpenseSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(periodExpenseSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

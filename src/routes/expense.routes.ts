import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/expense.controller";
import { getAuditTrail } from "../controllers/expense-audit.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { expenseSchema } from "../schemas/expense.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id/audit", validateObjectId("id"), getAuditTrail);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(expenseSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(expenseSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

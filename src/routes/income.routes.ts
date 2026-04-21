import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/income.controller";
import { getAuditTrail } from "../controllers/income-audit.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { incomeSchema } from "../schemas/income.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id/audit", validateObjectId("id"), getAuditTrail);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(incomeSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(incomeSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

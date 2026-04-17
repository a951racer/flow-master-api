import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/payment-source.controller";
import { jwtAuthenticator } from "../middleware/jwt-authenticator";
import { validateBody } from "../middleware/validate-body";
import { validateObjectId } from "../middleware/validate-object-id";
import { paymentSourceSchema } from "../schemas/payment-source.schema";

const router = Router();

router.use(jwtAuthenticator);

router.get("/", getAll);
router.get("/:id", validateObjectId("id"), getById);
router.post("/", validateBody(paymentSourceSchema), create);
router.put("/:id", validateObjectId("id"), validateBody(paymentSourceSchema), update);
router.delete("/:id", validateObjectId("id"), remove);

export default router;

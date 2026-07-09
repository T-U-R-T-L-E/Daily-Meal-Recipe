import { Router } from "express";
import payController from "../controllers/past";

const router = Router();

router.post("/initialize", payController.initializePayment);
router.get("/verify", payController.verifyPayment);

export default router;

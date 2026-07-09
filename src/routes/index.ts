import { Router } from "express";
import paystackRouter from "./paystack";

const router = Router();

router.use("/paystack", paystackRouter);

export default router;

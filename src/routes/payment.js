import express from "express";
import userAuth from "../middlewares/auth.js";
import { createPayment, paymentWebhook, verifyPremium } from "../controllers/payment.controller.js";

const paymentRouter = express.Router();

/**
 * CREATE PAYMENT ORDER
 * Protected route – only logged-in users
 */
paymentRouter.post("/payment/create", userAuth, createPayment);

/**
 * RAZORPAY WEBHOOK
 * Confirms payment authenticity & updates DB
 */
paymentRouter.post("/payment/webhook", paymentWebhook);

/**
 * VERIFY PREMIUM STATUS
 */
paymentRouter.get("/premium/verify", userAuth, verifyPremium);

export default paymentRouter;

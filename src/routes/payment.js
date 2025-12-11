import express from "express";
import userAuth from "../middleware/auth.js";
import { User } from "../models/user.js";
import razorpayInstance from "../utils/razorpay.js";
import { Payment } from "../models/payment.js";
import membershipAmount from "../utils/constants.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

const paymentRouter = express.Router();

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { membershipType } = req.body;
    const { firstName, lastName, emailId } = req.user;

    const order = await razorpayInstance.orders.create({
      amount: membershipAmount[membershipType] * 100,
      currency: "INR",
      receipt: "receipt#2",
      notes: {
        firstName,
        lastName,
        emailId,
        membershipType: membershipType,
      },
    });

    console.log(order);

    const payment = new Payment({
      userId: req.user._id,
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    const savedPayment = await payment.save();

    // returning back to frontend page
    // res.json({order});
    res.json({ ...savedPayment.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    console.log("Razorpay Webhook Called");
    const webhookSignature = req.get("X-Razorpay-Signature");
    console.log("Webhook Signature", webhookSignature);

    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    console.log(process.env.RAZORPAY_WEBHOOK_SECRET);

    if (!isWebhookValid) {
      console.log("Invalid webhook signature");
      return res.status(400).json({ msg: "Webhook signature is invalid" });
    }

    console.log("Valid Webhook signature");

    // Updating payment status in database
    const paymentDetails = req.body.payload.payment.entity;

    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    payment.status = paymentDetails.status;
    await payment.save();
    console.log("Payment Saved");

    const user = await User.findOne({ _id: payment.userId });
    user.isPremium = true;
    user.membershipType = payment.notes.membershipType;
    console.log("User Saved");

    await user.save();

    return res.status(200).json({ msg: "Webhook received successfully" });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  const user = req.user.toJSON();
  console.log("user inside verification ", user);
  if (user.isPremium) {
    return res.json({ ...user });
  }
  return res.json({ ...user });
});



export default paymentRouter;

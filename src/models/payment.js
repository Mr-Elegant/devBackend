import mongoose, {Schema} from "mongoose"

// Schema to store Razorpay payment details
const paymentSchema = new Schema(
  {
     // Reference to User who made payment
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Razorpay payment ID (filled after webhook)
    paymentId: {
      type: String,
    },
    // Razorpay order ID
    orderId: {
      type: String,
      required: true,
    },
    // Payment status (created, paid, failed)
    status: {
      type: String,
      required: true,
    },
     // Amount paid (in paise)
    amount: {
      type: Number,
      required: true,
    },
     // Currency (INR)
    currency: {
      type: String,
      required: true,
    },
    // Razorpay receipt reference
    receipt: {
      type: String,
      required: true,
    },
      // Metadata sent during order creation
    notes: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      membershipType: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema )
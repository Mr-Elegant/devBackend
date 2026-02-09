// Import Razorpay SDK
import Razorpay from "razorpay";

// Create Razorpay instance using environment credentials
var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,        // Public Razorpay Key
    key_secret: process.env.RAZORPAY_KEY_SECRET        // Secret Key (Server-only)
});

export default instance;
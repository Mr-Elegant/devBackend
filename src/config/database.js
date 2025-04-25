import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect("mongodb+srv://preetverma365:zhtdhsrfNEbGNlm1@backenddev.ccl0q6c.mongodb.net/backendDev");
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
};

export default connectDB;

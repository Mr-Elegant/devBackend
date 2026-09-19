import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import http from "http";
import dotenv from "dotenv";
// dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import connectDB from './config/database.js';
import express from 'express'; 
const app = express();
import cookieParser from 'cookie-parser';
import cors from "cors"
import passport from "passport";
import "./config/passport.js"; // Initialize Passport strategies
import initializeSocket from "./utils/socket.js";

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import requestRouter from './routes/request.js';
import userRouter from './routes/user.js';
import paymentRouter from "./routes/payment.js";
import chatRouter from "./routes/chat.js";
import uploadRouter from "./routes/upload.js";
import postRouter from "./routes/post.js";
import adminRouter from "./routes/admin.js";

// Trust the proxy (Render / Nginx) so Passport generates HTTPS callback URLs
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    "http://localhost:5173",
    "https://devnet.co.in",
    "https://www.devnet.co.in",
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith(".vercel.app") ||
            origin.endsWith(".devnet.co.in") ||
            process.env.NODE_ENV !== "production"
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(passport.initialize());

// Health check endpoint for uptime monitors (Cron-job.org/UptimeRobot) & Render
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
initializeSocket(server);


app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", paymentRouter); 
app.use("/", chatRouter);
app.use("/", uploadRouter);
app.use("/", postRouter);
app.use("/", adminRouter);

const PORT = process.env.PORT || 3000;
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    })
    .catch((err) => {
        console.log("Database connection failed", err);
    });

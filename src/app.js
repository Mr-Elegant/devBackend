import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from "dotenv";
// dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import connectDB from './config/database.js';
import express from 'express'; 
const app = express();
import cookieParser from 'cookie-parser';
import cors from "cors"


import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import requestRouter from './routes/request.js';
import userRouter from './routes/user.js';


app.use(express.json())
app.use(cookieParser())
app.use(cors({
     origin: "http://localhost:5173",
    credentials: true,
}))

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter)




connectDB()
    .then(() => {
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        })
    })
    .catch((err) => {
        console.log("Database connection failed", err);
    });



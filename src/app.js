import connectDB from './config/database.js';
import express from 'express'; 
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import requestRouter from './routes/request.js';

const app = express();
dotenv.config();

app.use(express.json())
app.use(cookieParser())


app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);




connectDB()
    .then(() => {
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        })
    })
    .catch((err) => {
        console.log("Database connection failed", err);
    });



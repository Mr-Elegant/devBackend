import cron from "node-cron";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { run as sendEmailRun } from "./sendEmail.js";
import ConnectionRequestModel from "../models/connectionRequest.js";

// "0 9 * * *" = Minute 0, Hour 9 (Exactly 9:00 AM)
cron.schedule("0 9 * * *", async () => {
    console.log("Running Daily Cron Job: Checking pending requests...");
    
    try {
        const yesterday = subDays(new Date(), 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);

        const pendingRequests = await ConnectionRequestModel.find({
            status: "interested",
            createdAt : {
                $gte : yesterdayStart,   
                $lt : yesterdayEnd,      
            }
        }).populate("fromUserId toUserId");     

        const listofEmails = [
            ...new Set(pendingRequests.map((req) => req.toUserId.emailId))
        ];    

        for (const email of listofEmails) {
            try {
                // Pass the dynamic 'email' variable into the run function
                const res = await sendEmailRun(
                    email, 
                    "New Friend Requests pending for " + email,
                    "There are friend requests pending. Please log in to DevNet to connect with more developers!"
                );
                console.log(`Successfully sent digest to: ${email}`);
            } catch (err) {
                console.error(`Failed to send email to ${email}:`, err);
            }
        }

    } catch (error) {
        console.error("Cron Job Database Error:", error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Forces the EC2 server to run this at 9:00 AM IST
});
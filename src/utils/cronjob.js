import cron from "node-cron";
import {subDays, startofDay, endOfDay} from "date-fns"
import sendEmail from "./sendEmail";
import ConnectionRequestModel from "../models/connectionRequest";


// Schedule a cron job that runs every day at 8:00 AM
// Cron format → "0 9 * * *" → minute=0, hour=8, every day/month/week
cron.schedule("* 9 * * *", async () => {

     // This entire block will execute at 8:00 AM daily
    // send emails to all people whot got request in yesterday
    try {
        // Calculate "yesterday" by subtracting 1 day from the current date
        const yesterday = subDays(new Date(), 1);

        // Get the start time of yesterday (00:00:00)
        const yesterdayStart = startofDay(yesterday);
        // Get the end time of yesterday (23:59:59)
        const yesterdayEnd = endOfDay(yesterday);

        // Query the database for all connection requests that:
        // - Have a status of "interested"
        // - Were created between yesterdayStart and yesterdayEnd
        // Also populate user details for both 'fromUserId' and 'toUserId' fields
        const pendingRequests = await ConnectionRequestModel.find({
            status: "interested",
            createdAt : {
                $gte : yesterdayStart,    // greater than or equal to the start of yesterday
                $lt : yesterdayEnd,       // less than the end of yesterday
            }
        }).populate("fromUserId toUserId");     // fetch related user documents

        const listofEmails = [
            ...new Set(pendingRequests.map((req) => req.toUserId.emailId))
        ]    

        // Loop through each unique email address
        for (const email of listofEmails) {
            // To send emails
            try {
            // Send an email notification to the user
            // 'sendEmail.run' likely sends an email with a subject and message body
            const res = await sendEmail.run(
            "New Friend Requests pending for " + email,
            "There are so many friend requests pending, please connect with more developers."

        );
        console.log(res);
      } catch (err) {
        console.log(err);
      }
        }

    } catch (error) {
        console.log(error)
    }
})
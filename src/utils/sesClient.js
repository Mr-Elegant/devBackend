import dotenv from "dotenv";
dotenv.config();
// console.log("MONGOURI:", process.env.MONGODB_URI);
// console.log("jwt_secret:", process.env.JWT_SECRET);
// console.log("AWS_ACCESS_KEY:", process.env.AWS_ACCESS_KEY);
console.log("AWS_SECRET_KEY:", process.env.AWS_SECRET_KEY ? "Loaded ✅" : "Missing ❌");

import {SESClient} from "@aws-sdk/client-ses"

// Create SES service object.
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});



export default sesClient;
// snippet-end:[ses.JavaScript.createclientv3]



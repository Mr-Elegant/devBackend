
import {SendEmailCommand} from "@aws-sdk/client-ses";
import sesClient from "./sesClient.js"

const createSendEmailCommand = (toAddress, fromAddress, subject, body) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<h1>${body}</h1>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: "This is the text format email",
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [
      /* more items */
    ],
  });
};

const run = async (toEmail, subject, body) => {
  // If AWS keys are not configured, skip gracefully
  if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || process.env.AWS_ACCESS_KEY === "disabled") {
    console.log("[Email Service] AWS SES disabled or credentials not provided. Skipping email dispatch.");
    return null;
  }

  try {
    const sendEmailCommand = createSendEmailCommand(
      toEmail,
      "preet@devnet.co.in",
      subject,
      body
    );

    const res = await sesClient.send(sendEmailCommand);
    console.log(`[Email Service] Successfully sent email to ${toEmail}`);
    return res;
  } catch (error) {
    console.warn(`[Email Service] Failed to send email to ${toEmail} (Non-blocking):`, error.message);
    return null;
  }
};

// snippet-end:[ses.JavaScript.email.sendEmailV3]
export {run};
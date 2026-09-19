import cron from "node-cron";

/**
 * Render Free Tier Keep-Alive Service
 * Sends an outbound HTTP request through the internet to Render's routing proxy
 * every 12 minutes to reset the 15-minute inactivity sleep timer.
 */
const startKeepAlive = () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Keep-Alive: Disabled in development.");
    return;
  }

  const backendUrl = process.env.BACKEND_URL || "https://devnet-backend-kor2.onrender.com";
  const healthUrl = `${backendUrl.replace(/\/+$/, "")}/health`;

  console.log(`[Keep-Alive] Initialized. Target: ${healthUrl} (every 12 minutes)`);

  // Every 12 minutes: "*/12 * * * *"
  cron.schedule("*/12 * * * *", async () => {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log(`[Keep-Alive] Heartbeat success (${response.status}) at ${new Date().toLocaleTimeString("en-IN")}`);
      } else {
        console.warn(`[Keep-Alive] Heartbeat returned status: ${response.status}`);
      }
    } catch (error) {
      console.error("[Keep-Alive] Heartbeat ping failed:", error.message);
    }
  });
};

export default startKeepAlive;

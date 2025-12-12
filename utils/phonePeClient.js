import { StandardCheckoutClient, Env } from "pg-sdk-node";

export const phonePeClient = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID,
  process.env.PHONEPE_CLIENT_SECRET,
  process.env.PHONEPE_CLIENT_VERSION || "1.0.0",
  process.env.NODE_ENV === "production" ? Env.PRODUCTION : Env.SANDBOX
);

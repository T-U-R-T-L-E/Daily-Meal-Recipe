import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  appPort: process.env.PORT || 3000,
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: parseInt(process.env.DB_PORT || "5432", 10),
  dbUser: process.env.POSTGRES_USER || "postgres",
  dbPassword: process.env.POSTGRES_PASSWORD || "your_secure_password",
  dbName: process.env.POSTGRES_DB || "online_payment_api",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL || "https://api.paystack.co",
};

export default config;

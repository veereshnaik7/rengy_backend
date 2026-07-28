import { config } from "dotenv";
config();
let configuration = {};

configuration.MONGODB_DATABASE = process.env.MONGODB_DATABASE;
configuration.PORT = process.env.PORT;
configuration.JWT_SK = process.env.JWT_SK;
configuration.JWT_REFRESH_SK = process.env.JWT_REFRESH_SK;
configuration.JWT_RESET_SK = process.env.JWT_RESET_SK;
configuration.BREVO_API_KEY = process.env.BREVO_API_KEY;
configuration.EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME || "Mini CRM";
configuration.EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS
configuration.FRONTEND_URL = process.env.FRONTEND_URL;


if (process.env.NODE_ENV == "development") {
  configuration.MONGODB_URL = process.env.MONGODB_URL_LOCAL;
  configuration.env = "development";
} else if (process.env.NODE_ENV == "production") {
  configuration.MONGODB_URL = process.env.MONGODB_URL_PROD;
  configuration.env = "production";
} else {
  configuration.MONGODB_URL = process.env.MONGODB_URL_LOCAL;
  configuration.env = process.env.NODE_ENV || "development";
}



export default configuration;

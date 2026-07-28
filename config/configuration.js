import { config } from "dotenv";
config();
let configuration = {};

configuration.MONGODB_DATABASE = process.env.MONGODB_DATABASE;
configuration.PORT = process.env.PORT;
configuration.JWT_SK = process.env.JWT_SK;
configuration.JWT_REFRESH_SK = process.env.JWT_REFRESH_SK;
configuration.JWT_RESET_SK = process.env.JWT_RESET_SK;
configuration.EMAIL_SERVICE = process.env.EMAIL_SERVICE;
configuration.EMAIL_HOST = process.env.EMAIL_HOST;
configuration.EMAIL_PORT = process.env.EMAIL_PORT;
configuration.EMAIL_SECURE = process.env.EMAIL_SECURE;
configuration.EMAIL_USER = process.env.EMAIL_USER;
configuration.EMAIL_PASS = process.env.EMAIL_PASS;
configuration.EMAIL_FROM = process.env.EMAIL_FROM;
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

console.log(configuration.MONGODB_URL)


export default configuration;

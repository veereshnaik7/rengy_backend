import mongoose from "mongoose";
import configuration from "./configuration.js";

async function connectToDatabase() {
  try {
    const connection = await mongoose.connect(configuration.MONGODB_URL, {
      dbName: configuration.MONGODB_DATABASE,
    });

    console.log("MongoDB connected successfully ✅");
    console.log(`Database: ${connection.connection.name} ✅`);
    console.log(`Host: ${connection.connection.host}✅`);
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);
    process.exit(1);
  }
}

export { connectToDatabase };
export default mongoose;

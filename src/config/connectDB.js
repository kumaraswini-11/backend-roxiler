import mongoose from "mongoose";
import { config } from "./index.js";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    // Connect to MongoDB using Mongoose with connection pooling
    const connectionInstance = await mongoose.connect(
      `${config.mongoDBUri}/${DB_NAME}`
    );

    // Log successful connection
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    // Log and exit the application process on connection failure
    console.error("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default connectDB;

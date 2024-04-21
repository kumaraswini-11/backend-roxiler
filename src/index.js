import dotenv from "dotenv";
import { config } from "./config/index.js";
import { app } from "./app.js";
import connectDB from "./config/connectDB.js";

// Load environment variables from the .env file
dotenv.config({
  path: "./.env",
});

// Connect to the MongoDB database
connectDB()
  .then(() => {
    // Start the Express server
    const PORT = config.port || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`);
    });
  })
  .catch((err) => {
    // Log an error message if MongoDB connection fails
    console.error("MONGO db connection failed !!! ", err);
  });

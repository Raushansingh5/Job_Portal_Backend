import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/dbConfig.js";

const PORT = process.env.PORT || 6000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database", err);
  });

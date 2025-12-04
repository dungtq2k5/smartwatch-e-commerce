import mongoose from "mongoose";

export default async function connectDB(): Promise<void>{
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI!)

    console.log("🛢 ", `MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connection to MongoDB:`, error);
    process.exit(1);
  }
}
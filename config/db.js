import mongoose from "mongoose";

let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

/**
 * Returns a cached/reused Mongoose connection.
 * Critical for Vercel serverless — avoids creating a new connection on every invocation.
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const MONGO_URL = process.env.MONGO_URL;
    if (!MONGO_URL) {
      throw new Error("MONGO_URL environment variable is not defined.");
    }

    cached.promise = mongoose
      .connect(MONGO_URL, {
        bufferCommands: false,
      })
      .then((m) => {
        console.log("[DB] MongoDB connected successfully.");
        return m;
      })
      .catch((err) => {
        console.error("[DB] MongoDB connection error:", err.message);
        cached.promise = null; // Reset on failure so next call retries
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

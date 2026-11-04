import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gitogether26';

let connectionPromise = null;

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).finally(() => {
      connectionPromise = null;
    });
  }

  await connectionPromise;
}

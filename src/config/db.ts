import mongoose from 'mongoose';

export interface DatabaseConnectionInfo {
  host: string;
  name: string;
}

/**
 * Connect to MongoDB using Mongoose.
 * Exits process with failure code (1) if connection fails.
 */
export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri: string | undefined = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('MongoDB connection error: MONGODB_URI (or MONGO_URI) environment variable is not defined.');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri);
    const connectionInfo: DatabaseConnectionInfo = {
      host: conn.connection.host,
      name: conn.connection.name,
    };

    console.log(`MongoDB Connected: ${connectionInfo.host} (database: ${connectionInfo.name})`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`MongoDB connection failed: ${error.message}`);
    } else {
      console.error('MongoDB connection failed with unknown error:', error);
    }
    process.exit(1);
  }
};


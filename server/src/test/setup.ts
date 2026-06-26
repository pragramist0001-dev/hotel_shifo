import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/sanatory_test_db';
  await mongoose.connect(uri);
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
};

export const clearDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

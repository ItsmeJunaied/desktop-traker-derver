const mongoose = require('mongoose');

// Replace with your MongoDB Atlas connection string
const uri = 'mongodb+srv://screenshoter:CowrYeMVZFCxNeNZ@cluster0.zj6nics.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;

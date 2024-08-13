const express = require("express");
const mongoose = require("mongoose");
const screenshot = require("screenshot-desktop");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const connectDB = require("./db");
const { timeStamp } = require("console");
const cloudinary = require("cloudinary").v2;
const app = express();
require("dotenv").config();

app.use(cors());
app.use(express.json());

const port = process.env.PORT | 3000;

cloudinary.config({
  cloud_name: process.env.cloudinary_Name,
  api_key: process.env.cloudinary_API_Key,
  api_secret: process.env.cloudinary_Secret_Key,
});



let screenshotInterval;

const uri = 'mongodb+srv://junaiedhossain:8ODVbwqbMqHLulnX@cluster0.lxwvb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

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

const ScreenshotSchema = new mongoose.Schema({
  url: String,
  timestamp: Date,
});
const Screenshot = mongoose.model("Screenshots", ScreenshotSchema);

app.post("/start", (req, res) => {
  if (!screenshotInterval) {
    screenshotInterval = setInterval(async () => {
      try {
        const img = await screenshot();
        const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
        const filePath = path.join(
          __dirname,
          `screenshots/screenshot-${timestamp}.jpg`
        );

        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, img);

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(filePath);

        // Save URL to MongoDB
        const screenshotDoc = new Screenshot({
          url: result.secure_url,
          timestamp: new Date(),
        });

        await screenshotDoc.save();

        console.log(`Screenshot uploaded and saved: ${result.secure_url}`);

        // Optionally delete the local file
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error taking screenshot or uploading:", err);
      }
    }, 20000); // 180000 ms = 3 minutes
  }
  res.json({ message: "Screenshot process started" });
});

app.post("/stop", (req, res) => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
  res.json({ message: "Screenshot process stopped" });
});

app.get("/screenshotData", async (req, res) => {
  try {
    const screenshotData = await Screenshot.find().sort({ timestamp: -1 });
    res.json(screenshotData);
  } catch (error) {
    // Log and return an error response
    console.error("Error retrieving screenshot data:", error);
    res.status(500).json({ error: "Failed to retrieve the data" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is live");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

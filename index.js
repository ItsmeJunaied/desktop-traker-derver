const express = require("express");
const mongoose = require("mongoose");
const screenshot = require("screenshot-desktop");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const connectDB = require("./db");
const cloudinary = require("cloudinary").v2;
const app = express();
require("dotenv").config();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.cloudinary_Name,
  api_key: process.env.cloudinary_API_Key,
  api_secret: process.env.cloudinary_Secret_Key,
});

let screenshotInterval = null;

connectDB();

const port = process.env.PORT || 3000;

const takeScreenshot = async () => {
  try {
    // Trigger the screenshot process
    const img = await screenshot(); // Use the screenshot package or function you have
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const filePath = path.join(
      __dirname,
      `screenshots/screenshot-${timestamp}.jpg`
    );

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, img);

    const result = await cloudinary.uploader.upload(filePath);

    const screenshotDoc = new Screenshot({
      url: result.secure_url,
      timestamp: new Date(),
    });

    await screenshotDoc.save();

    console.log(`Screenshot uploaded and saved: ${result.secure_url}`);

    fs.unlinkSync(filePath);

    console.log({
      message: "Screenshot captured and saved",
      url: result.secure_url,
    });
  } catch (err) {
    console.error("Error taking screenshot or uploading:", err);
  }
};

app.post("/start", async (req, res) => {
  if (screenshotInterval) {
    return res.json({ message: "Screenshot process is already running" });
  }
  screenshotInterval = setInterval(takeScreenshot, 5000);
  res.json({ message: "Screenshot process started" });
});

app.post("/stop", (req, res) => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
  res.json({ message: "Stop functionality is not required in serverless" });
});

app.get("/screenshotData", async (req, res) => {
  try {
    const screenshotData = await Screenshot.find().sort({ timestamp: -1 });
    res.json(screenshotData);
  } catch (error) {
    console.error("Error retrieving screenshot data:", error);
    res.status(500).json({ error: "Failed to retrieve the data" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is live");
});

const ScreenshotSchema = new mongoose.Schema({
  url: String,
  timestamp: Date,
});
const Screenshot = mongoose.model("Screenshots", ScreenshotSchema);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

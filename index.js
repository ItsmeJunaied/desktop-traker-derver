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

console.log(process.env.cloudinary_Name);

let screenshotInterval;

connectDB();

const port = process.env.PORT || 3000; // Ensure the port is defined

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

const ScreenshotSchema = new mongoose.Schema({
  url: String,
  timestamp: Date,
});
const Screenshot = mongoose.model("Screenshots", ScreenshotSchema);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

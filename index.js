require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { initializeFirebase } = require("./config/firebase");

// Import routes
const cropsRoutes = require("./routes/cropsRoutes");
const interestsRoutes = require("./routes/interestsRoutes");
const usersRoutes = require("./routes/usersRoutes");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🌾 KrishiLink API Server is running successfully!",
    version: "1.0.0",
    endpoints: {
      crops: "/api/crops",
      interests: "/api/interests",
      users: "/api/users",
    },
  });
});

// API Routes
app.use("/api/crops", cropsRoutes);
app.use("/api/interests", interestsRoutes);
app.use("/api/users", usersRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server and connect to database
async function startServer() {
  try {
    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Connect to MongoDB
    await connectDB();

    // Start listening
    app.listen(port, () => {
      console.log(`🚀 KrishiLink server is running on port: ${port}`);
      console.log(`📡 API Base URL: http://localhost:${port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Export app for Vercel
module.exports = app;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://krishilink-project-1452e.web.app",
      "https://krishilink-project-1452e.firebaseapp.com",
    ],
    credentials: true,
  })
);

// ==================== MONGODB CONNECTION ====================
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Database collections
let db;
let cropsCollection;
let usersCollection;

let isConnected = false;

async function connectDB() {
  if (isConnected && db) {
    return;
  }

  try {
    await client.connect();
    db = client.db(process.env.DB_NAME || "krishilinkDB");
    cropsCollection = db.collection("crops");
    usersCollection = db.collection("users");
    isConnected = true;
    console.log("✅ Successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    isConnected = false;
    throw err;
  }
}

// Middleware to ensure DB connection
const ensureDBConnection = async (req, res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
    }
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Initialize database connection
connectDB().catch(console.dir);

// ==================== ROOT ENDPOINTS ====================

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

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    database: isConnected ? "connected" : "disconnected",
  });
});

// ==================== CROPS API ROUTES ====================

// GET /api/crops - Fetch all crops with optional search
app.get("/api/crops", ensureDBConnection, async (req, res) => {
  try {
    const searchQuery = req.query.search;
    let filter = {};

    if (searchQuery) {
      filter = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { type: { $regex: searchQuery, $options: "i" } },
          { location: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    const crops = await cropsCollection.find(filter).toArray();

    res.json({
      success: true,
      message: "Crops fetched successfully",
      data: crops,
    });
  } catch (error) {
    console.error("Error fetching crops:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crops",
      error: error.message,
    });
  }
});

// GET /api/crops/latest - Fetch latest 6 crops for homepage
app.get("/api/crops/latest", ensureDBConnection, async (req, res) => {
  try {
    const latestCrops = await cropsCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.json({
      success: true,
      message: "Latest crops fetched successfully",
      data: latestCrops,
    });
  } catch (error) {
    console.error("Error fetching latest crops:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch latest crops",
      error: error.message,
    });
  }
});

// GET /api/crops/interest - Unwind all interests from all crops
app.get("/api/crops/interest", ensureDBConnection, async (req, res) => {
  try {
    const interests = await cropsCollection
      .aggregate([
        { $unwind: "$interests" },
        { $replaceRoot: { newRoot: "$interests" } },
      ])
      .toArray();

    res.json({
      success: true,
      message: "All interests fetched successfully",
      data: interests,
    });
  } catch (error) {
    console.error("Error fetching interests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interests",
      error: error.message,
    });
  }
});

// GET /api/crops/:id - Fetch single crop by ID
app.get("/api/crops/:id", ensureDBConnection, async (req, res) => {
  try {
    const cropId = req.params.id;

    if (!ObjectId.isValid(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const crop = await cropsCollection.findOne({ _id: new ObjectId(cropId) });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    res.json({
      success: true,
      message: "Crop fetched successfully",
      data: crop,
    });
  } catch (error) {
    console.error("Error fetching crop:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crop",
      error: error.message,
    });
  }
});

// POST /api/crops - Add new crop
app.post("/api/crops", ensureDBConnection, async (req, res) => {
  try {
    const { pricePerUnit, quantity, name, type, unit, description, location } = req.body;

    // Validation
    if (!name || !type || !unit || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (pricePerUnit === undefined || pricePerUnit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price per unit must be greater than 0",
      });
    }

    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const newCrop = {
      ...req.body,
      interests: [],
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await cropsCollection.insertOne(newCrop);

    res.status(201).json({
      success: true,
      message: "Crop added successfully",
      data: { ...newCrop, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error adding crop:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add crop",
      error: error.message,
    });
  }
});

// PUT /api/crops/:id - Update crop
app.put("/api/crops/:id", ensureDBConnection, async (req, res) => {
  try {
    const cropId = req.params.id;

    if (!ObjectId.isValid(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const existingCrop = await cropsCollection.findOne({
      _id: new ObjectId(cropId),
    });

    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    // Verify ownership
    const userEmail = req.headers["user-email"];
    if (existingCrop.owner?.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only update your own crops",
      });
    }

    const { _id, interests, createdAt, ...updateData } = req.body;

    // Validate updated values if provided
    if (updateData.pricePerUnit !== undefined && updateData.pricePerUnit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price per unit must be greater than 0",
      });
    }

    if (updateData.quantity !== undefined && updateData.quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    const result = await cropsCollection.updateOne(
      { _id: new ObjectId(cropId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes made to the crop",
      });
    }

    const updatedCrop = await cropsCollection.findOne({
      _id: new ObjectId(cropId),
    });

    res.json({
      success: true,
      message: "Crop updated successfully",
      data: updatedCrop,
    });
  } catch (error) {
    console.error("Error updating crop:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update crop",
      error: error.message,
    });
  }
});

// DELETE /api/crops/:id - Delete crop
app.delete("/api/crops/:id", ensureDBConnection, async (req, res) => {
  try {
    const cropId = req.params.id;

    if (!ObjectId.isValid(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const existingCrop = await cropsCollection.findOne({
      _id: new ObjectId(cropId),
    });

    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    // Verify ownership
    const userEmail = req.headers["user-email"];
    if (existingCrop.owner?.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own crops",
      });
    }

    // Check for pending interests and warn user
    const pendingInterests = existingCrop.interests?.filter(
      (interest) => interest.status === "pending"
    ) || [];

    if (pendingInterests.length > 0) {
      // Allow deletion but include warning in response
      const result = await cropsCollection.deleteOne({
        _id: new ObjectId(cropId),
      });

      return res.json({
        success: true,
        message: "Crop deleted successfully",
        warning: `This crop had ${pendingInterests.length} pending interest(s) which have been removed`,
        data: { 
          deletedCount: result.deletedCount,
          pendingInterestsRemoved: pendingInterests.length 
        },
      });
    }

    const result = await cropsCollection.deleteOne({
      _id: new ObjectId(cropId),
    });

    res.json({
      success: true,
      message: "Crop deleted successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Error deleting crop:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete crop",
      error: error.message,
    });
  }
});

// ==================== INTERESTS API ROUTES ====================

// POST /api/interests - Add new interest to a crop
app.post("/api/interests", ensureDBConnection, async (req, res) => {
  try {
    const { cropId, userEmail, userName, quantity, message } = req.body;

    if (!cropId || !userEmail || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cropId, userEmail, userName",
      });
    }

    if (!ObjectId.isValid(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const crop = await cropsCollection.findOne({ _id: new ObjectId(cropId) });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    const existingInterest = crop.interests?.find(
      (interest) => interest.userEmail === userEmail
    );

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: "You have already shown interest in this crop",
      });
    }

    // Validate quantity
    const requestedQuantity = quantity || 0;
    
    if (requestedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    if (requestedQuantity === 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Warning if requested quantity exceeds available (but allow it)
    let warning = null;
    if (requestedQuantity > crop.quantity) {
      warning = `Note: You requested ${requestedQuantity} ${crop.unit}, but only ${crop.quantity} ${crop.unit} is currently available`;
    }

    const newInterest = {
      _id: new ObjectId().toString(),
      cropId,
      userEmail,
      userName,
      quantity: requestedQuantity,
      message: message || "",
      status: "pending",
      createdAt: new Date(),
    };

    const result = await cropsCollection.updateOne(
      { _id: new ObjectId(cropId) },
      {
        $push: { interests: newInterest },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to add interest to crop",
      });
    }

    res.status(201).json({
      success: true,
      message: "Interest added successfully",
      warning: warning,
      data: newInterest,
    });
  } catch (error) {
    console.error("Error adding interest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add interest",
      error: error.message,
    });
  }
});

// GET /api/interests/sent?email=user@example.com - Fetch interests sent by a user
app.get("/api/interests/sent", ensureDBConnection, async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required",
      });
    }

    const cropsWithInterests = await cropsCollection
      .find({
        "interests.userEmail": userEmail,
      })
      .toArray();

    const sentInterests = cropsWithInterests.flatMap((crop) => {
      return crop.interests
        .filter((interest) => interest.userEmail === userEmail)
        .map((interest) => ({
          ...interest,
          cropDetails: {
            _id: crop._id,
            name: crop.name,
            type: crop.type,
            pricePerUnit: crop.pricePerUnit,
            unit: crop.unit,
            location: crop.location,
            image: crop.image,
            owner: crop.owner,
          },
        }));
    });

    res.json({
      success: true,
      message: "Sent interests fetched successfully",
      data: sentInterests,
    });
  } catch (error) {
    console.error("Error fetching sent interests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sent interests",
      error: error.message,
    });
  }
});

// GET /api/interests/received?email=owner@example.com - Fetch interests for crops owned by user
app.get("/api/interests/received", ensureDBConnection, async (req, res) => {
  try {
    const ownerEmail = req.query.email;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required",
      });
    }

    const ownedCrops = await cropsCollection
      .find({
        "owner.ownerEmail": ownerEmail,
        "interests.0": { $exists: true },
      })
      .toArray();

    const receivedInterests = ownedCrops.flatMap((crop) => {
      return crop.interests.map((interest) => ({
        ...interest,
        cropDetails: {
          _id: crop._id,
          name: crop.name,
          type: crop.type,
          pricePerUnit: crop.pricePerUnit,
          unit: crop.unit,
          quantity: crop.quantity,
          location: crop.location,
          image: crop.image,
        },
      }));
    });

    res.json({
      success: true,
      message: "Received interests fetched successfully",
      data: receivedInterests,
    });
  } catch (error) {
    console.error("Error fetching received interests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch received interests",
      error: error.message,
    });
  }
});

// PUT /api/interests/status - Update interest status (accept/reject)
// PATCH /api/interests/:id - Update interest status by interest ID
app.patch("/api/interests/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id: interestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: status",
      });
    }

    if (!["accepted", "rejected", "pending", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted', 'rejected', 'pending', or 'cancelled'",
      });
    }

    // Find the crop that contains this interest
    const crop = await cropsCollection.findOne({
      "interests._id": interestId,
    });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Interest not found",
      });
    }

    const interest = crop.interests?.find((int) => int._id === interestId);

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: "Interest not found",
      });
    }

    // Check if interest is already processed
    if (interest.status === "accepted" && status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Interest has already been accepted",
      });
    }

    const updateQuery = {
      $set: {
        "interests.$[elem].status": status,
        "interests.$[elem].updatedAt": new Date(),
        updatedAt: new Date(),
      },
    };

    // If accepting, reduce crop quantity with atomic operation to prevent race condition
    if (status === "accepted" && interest.quantity > 0) {
      // Check if sufficient quantity is available
      if (crop.quantity < interest.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity available. Requested: ${interest.quantity}, Available: ${crop.quantity}`,
        });
      }

      // Use atomic $inc operation instead of reading and setting
      updateQuery.$inc = { quantity: -interest.quantity };
      delete updateQuery.$set.quantity; // Remove the set operation
    }

    const result = await cropsCollection.updateOne(
      { 
        _id: crop._id,
        // Add condition to ensure quantity doesn't go negative (double-check)
        ...(status === "accepted" && interest.quantity > 0 
          ? { quantity: { $gte: interest.quantity } } 
          : {})
      },
      updateQuery,
      {
        arrayFilters: [{ "elem._id": interestId }],
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update interest status",
      });
    }

    const updatedCrop = await cropsCollection.findOne({
      _id: crop._id,
    });

    res.json({
      success: true,
      message: `Interest ${status} successfully`,
      data: updatedCrop,
    });
  } catch (error) {
    console.error("Error updating interest status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update interest status",
      error: error.message,
    });
  }
});

// PUT /api/interests/status - Update interest status (legacy endpoint)
app.put("/api/interests/status", ensureDBConnection, async (req, res) => {
  try {
    const { interestId, cropId, status } = req.body;

    if (!interestId || !cropId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: interestId, cropId, status",
      });
    }

    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted', 'rejected', or 'pending'",
      });
    }

    if (!ObjectId.isValid(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const crop = await cropsCollection.findOne({ _id: new ObjectId(cropId) });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    const interest = crop.interests?.find((int) => int._id === interestId);

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: "Interest not found",
      });
    }

    // Check if interest is already processed
    if (interest.status === "accepted" && status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Interest has already been accepted",
      });
    }

    const updateQuery = {
      $set: {
        "interests.$[elem].status": status,
        "interests.$[elem].updatedAt": new Date(),
        updatedAt: new Date(),
      },
    };

    // If accepting, reduce crop quantity with atomic operation to prevent race condition
    if (status === "accepted" && interest.quantity > 0) {
      // Check if sufficient quantity is available
      if (crop.quantity < interest.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity available. Requested: ${interest.quantity}, Available: ${crop.quantity}`,
        });
      }

      // Use atomic $inc operation instead of reading and setting
      updateQuery.$inc = { quantity: -interest.quantity };
      delete updateQuery.$set.quantity; // Remove the set operation
    }

    const result = await cropsCollection.updateOne(
      { 
        _id: new ObjectId(cropId),
        // Add condition to ensure quantity doesn't go negative (double-check)
        ...(status === "accepted" && interest.quantity > 0 
          ? { quantity: { $gte: interest.quantity } } 
          : {})
      },
      updateQuery,
      {
        arrayFilters: [{ "elem._id": interestId }],
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update interest status",
      });
    }

    const updatedCrop = await cropsCollection.findOne({
      _id: new ObjectId(cropId),
    });

    res.json({
      success: true,
      message: `Interest ${status} successfully`,
      data: updatedCrop,
    });
  } catch (error) {
    console.error("Error updating interest status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update interest status",
      error: error.message,
    });
  }
});

// ==================== USERS API ROUTES ====================

// POST /api/users - Add new user (on registration)
app.post("/api/users", ensureDBConnection, async (req, res) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: "User already exists",
        data: existingUser,
      });
    }

    const newUser = {
      email,
      name: name || "",
      photoURL: photoURL || "",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { ...newUser, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
});

// GET /api/users/:email - Fetch user by email
app.get("/api/users/:email", ensureDBConnection, async (req, res) => {
  try {
    const email = req.params.email;

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});

// PUT /api/users/:email - Update user profile
app.put("/api/users/:email", ensureDBConnection, async (req, res) => {
  try {
    const email = req.params.email;
    const { name, photoURL, phone, address, bio } = req.body;

    const existingUser = await usersCollection.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (bio !== undefined) updateData.bio = bio;

    const result = await usersCollection.updateOne(
      { email },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes made to user profile",
      });
    }

    const updatedUser = await usersCollection.findOne({ email });

    res.json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
      error: error.message,
    });
  }
});

// GET /api/users - Get all users (optional, for admin purposes)
app.get("/api/users", ensureDBConnection, async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();

    res.json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// ==================== ERROR HANDLERS ====================

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

  const isDatabaseError =
    err.message?.includes("Database") ||
    err.message?.includes("MongoDB") ||
    err.message?.includes("connect");

  res.status(isDatabaseError ? 503 : 500).json({
    success: false,
    message: isDatabaseError
      ? "Database connection error. Please try again."
      : "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ==================== START SERVER ====================

// Start server only in non-Vercel environment
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 KrishiLink server running on port ${port}`);
    console.log(`📡 API Base URL: http://localhost:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Export for Vercel serverless functions
export default app;

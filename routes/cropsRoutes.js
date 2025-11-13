const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// GET /api/crops - Fetch all crops with optional search
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

    const searchQuery = req.query.search;
    let filter = {};

    // If search query exists, search in name, type, location, description
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
router.get("/latest", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

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
router.get("/interest", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

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
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");
    const cropId = req.params.id;

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

// POST /api/crops - Add new crop (Protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

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

// PUT /api/crops/:id - Update crop (Protected, Owner only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");
    const cropId = req.params.id;

    // Check if crop exists and verify ownership
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
    const userEmail = req.user.email || req.headers["user-email"];
    if (existingCrop.owner.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only update your own crops",
      });
    }

    // Remove fields that shouldn't be updated directly
    const { _id, interests, createdAt, ...updateData } = req.body;

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

// DELETE /api/crops/:id - Delete crop (Protected, Owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");
    const cropId = req.params.id;

    // Check if crop exists and verify ownership
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
    const userEmail = req.user.email || req.headers["user-email"];
    if (existingCrop.owner.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own crops",
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

module.exports = router;

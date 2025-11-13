const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const router = express.Router();

// POST /api/interests - Add new interest to a crop
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

    const { cropId, userEmail, userName, quantity, message } = req.body;

    // Validate required fields
    if (!cropId || !userEmail || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cropId, userEmail, userName",
      });
    }

    // Check if crop exists
    const crop = await cropsCollection.findOne({ _id: new ObjectId(cropId) });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    // Check if user already showed interest in this crop
    const existingInterest = crop.interests?.find(
      (interest) => interest.userEmail === userEmail
    );

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: "You have already shown interest in this crop",
      });
    }

    // Create new interest
    const newInterest = {
      _id: new ObjectId().toString(),
      cropId,
      userEmail,
      userName,
      quantity: quantity || 0,
      message: message || "",
      status: "pending",
      createdAt: new Date(),
    };

    // Add interest to crop's interests array
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
router.get("/sent", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required",
      });
    }

    // Find all crops that have interests from this user
    const cropsWithInterests = await cropsCollection
      .find({
        "interests.userEmail": userEmail,
      })
      .toArray();

    // Extract only the relevant interests and include crop details
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
router.get("/received", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

    const ownerEmail = req.query.email;

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required",
      });
    }

    // Find all crops owned by this user that have interests
    const ownedCrops = await cropsCollection
      .find({
        "owner.ownerEmail": ownerEmail,
        "interests.0": { $exists: true }, // Has at least one interest
      })
      .toArray();

    // Extract all interests with crop details
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
router.put("/status", async (req, res) => {
  try {
    const db = getDB();
    const cropsCollection = db.collection("crops");

    const { interestId, cropId, status } = req.body;

    // Validate required fields
    if (!interestId || !cropId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: interestId, cropId, status",
      });
    }

    // Validate status value
    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted', 'rejected', or 'pending'",
      });
    }

    // Find the crop and interest
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

    // Update the interest status
    const updateQuery = {
      $set: {
        "interests.$[elem].status": status,
        "interests.$[elem].updatedAt": new Date(),
        updatedAt: new Date(),
      },
    };

    // If status is accepted, reduce crop quantity
    if (status === "accepted" && interest.quantity > 0) {
      const newQuantity = Math.max(0, crop.quantity - interest.quantity);
      updateQuery.$set.quantity = newQuantity;
    }

    const result = await cropsCollection.updateOne(
      { _id: new ObjectId(cropId) },
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

    // Fetch and return updated crop
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

module.exports = router;

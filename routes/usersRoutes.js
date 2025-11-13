const express = require("express");
const { getDB } = require("../config/db");

const router = express.Router();

// POST /api/users - Add new user (on registration)
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    
    const { email, name, photoURL } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    
    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: "User already exists",
        data: existingUser
      });
    }
    
    // Create new user
    const newUser = {
      email,
      name: name || "",
      photoURL: photoURL || "",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { ...newUser, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
});

// GET /api/users/:email - Fetch user by email
router.get("/:email", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    
    const email = req.params.email;
    
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      message: "User fetched successfully",
      data: user
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
});

// PUT /api/users/:email - Update user profile
router.put("/:email", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    
    const email = req.params.email;
    const { name, photoURL, phone, address, bio } = req.body;
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: new Date()
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
        message: "No changes made to user profile"
      });
    }
    
    // Fetch and return updated user
    const updatedUser = await usersCollection.findOne({ email });
    
    res.json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
      error: error.message
    });
  }
});

// GET /api/users - Get all users (optional, for admin purposes)
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    
    const users = await usersCollection.find().toArray();
    
    res.json({
      success: true,
      message: "Users fetched successfully",
      data: users
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
});

module.exports = router;


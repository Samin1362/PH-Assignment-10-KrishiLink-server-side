const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10, // Optimize for serverless
  minPoolSize: 1,
});

let db;
let isConnecting = false;

async function connectDB() {
  // If already connected, return existing connection
  if (db) {
    return db;
  }

  // If connection is in progress, wait for it
  if (isConnecting) {
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return db;
  }

  try {
    isConnecting = true;
    
    await client.connect();
    db = client.db(process.env.DB_NAME || "krishilinkDB");
    console.log("✅ Successfully connected to MongoDB!");
    
    // Ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Database is ready to accept queries!");
    
    isConnecting = false;
    return db;
  } catch (error) {
    isConnecting = false;
    console.error("❌ MongoDB connection failed:", error);
    throw error; // Don't exit in serverless environment
  }
}

function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}

module.exports = { connectDB, getDB, client };


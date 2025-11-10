const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

//mongodb uri and client
// password: MfLF69AAb7MDrrVz
const uri =
  "mongodb+srv://krishiLinkDbUser:MfLF69AAb7MDrrVz@cluster0.l2cobj0.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is running.");
});

//for database
async function run() {
  try {
    await client.connect();

    const db = client.db("krishiLink_db");
    const cropsCollection = db.collection("crops");
    const interestCollection = db.collection("interests");

    //get request
    app.get("/crops", async (req, res) => {
      try {
        const result = await cropsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to get crop", error });
      }
    });

    app.get("/crops/interest", async (req, res) => {
      try {
        const result = await cropsCollection
          .aggregate([
            { $unwind: "$crop.interests" },
            { $replaceRoot: { newRoot: "$crop.interests" } },
          ])
          .toArray();

        res.send(result);
      } catch (e) {
        res.status(500).send({ message: "Faild to get interest", e });
      }
    });

    //post request
    app.post("/crops", async (req, res) => {
      const cropId = new ObjectId();
      const crop = req.body;
      const newCrop = { _id: cropId, crop };
      const result = await cropsCollection.insertOne(newCrop);
      res.send(result);
    });

    app.post("/interest/:id", async (req, res) => {
      try {
        const cropId = req.params.id;
        const interest = req.body;
        interest._id = new ObjectId();
        interest.cropId = cropId;

        // inserting the interest to the interest collection
        await interestCollection.insertOne(interest);

        // adding to crop interest array
        const updateResult = await cropsCollection.updateOne(
          { _id: new ObjectId(cropId) },
          { $push: { "crop.interests": interest } }
        );

        res.send({
          message: "Interest added successfully",
          interest,
          updateResult,
        });

      } catch (e) {
        res.status(500).send({ message: "Failed to add interest", e });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});

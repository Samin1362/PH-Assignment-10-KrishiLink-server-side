const { MongoClient, ServerApiVersion } = require("mongodb");
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

    const db = client.db('krishiLink_db');
    const productCollection = db.collection('products');

    app.post("/products", async(req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    })

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

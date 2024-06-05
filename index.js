const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    // 'https://pet-adoption-ed896.web.app'
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("public"));
// database connect

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.po42dna.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const petsCollection = client.db("PetadoptionDB").collection("pets");
    const usersCollection = client.db("PetadoptionDB").collection("users");
    const adoptCollection = client.db("PetadoptionDB").collection("adopted");
    const donationCampaignsCollection = client.db("PetadoptionDB").collection("donationCampaigns");
    const donationCollection = client
      .db("PetadoptionDB")
      .collection("donation");
    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // user relate api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exit", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // pets relate api
    app.post("/pets", async (req, res) => {
      const pets = req.body;
      const result = await petsCollection.insertOne(pets);
      res.send(result);
    });
    app.get("/pets", async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category && category !== "null") {
        query = { category };
      }

      const result = await petsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/allPets", async (req, res) => {
      const filter = req.query;
      // // search
      const query = {
        name: { $regex: filter.search, $options: "i" },
      };
      const options = {
        sort: {
          date: filter.sort === "asc" ? 1 : -1,
        },
      };
      const result = await petsCollection.find(query, options).toArray();
      res.send(result);
    });
    app.get("/pet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });
    // Adopt relate api
    app.post("/adopts", async (req, res) => {
      const adopt = req.body;
      const result = await adoptCollection.insertOne(adopt);
      res.send(result);
    });
    // donation relate api
    app.get("/donation", async (req, res) => {
      const result = await donationCollection.find().toArray();
      res.send(result);
    });
    // single donation db
    app.get("/donation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    });
    // create payment 
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);
      console.log(amount, "inside the intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Hello from Assignment-12 Server");
});
app.listen(port, () => {
  console.log(`Assignment-12 is running on port ${port}`);
});

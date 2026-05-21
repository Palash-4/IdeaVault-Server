const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config()




const uri = process.env.MONGODB_URI;

const app = express()
const PORT = process.env.PORT;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));



const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });

    }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        req.user = payload;
        next()
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" });

    };

}
async function run() {
    try {
        // await client.connect();
        const db = client.db("ideavault")
        const ideaCollection = db.collection("ideas")
        const commentCollection = db.collection("comments");

        app.get('/ideas', async (req, res) => {
            const result = await ideaCollection.find().toArray()
            res.json(result);
        })

        app.post('/ideas', verifyToken, async (req, res) => {
            const ideaData = req.body
            const result = await ideaCollection.insertOne(ideaData)
            res.json(result)
        })

        app.get('/ideas/:id', async (req, res) => {
            const { id } = req.params;
            const result = await ideaCollection.findOne({ _id: new ObjectId(id) })
            res.json(result)

        });



        app.get("/my-ideas/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await ideaCollection.find({ userEmail: email }).toArray();
            res.json(result);
        });

        app.delete("/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const existingComment = await commentCollection.findOne({ _id: new ObjectId(id) });
            if (
                existingComment.userEmail !== req.user.email
            ) {
                return res.status(403).json({
                    message: "Forbidden"
                });
            }

            const result = await commentCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        }
        );

        app.patch("/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const { comment } = req.body;
            const existingComment = await commentCollection.findOne({ _id: new ObjectId(id) });

            if (
                existingComment.userEmail !== req.user.email
            ) {
                return res.status(403).json({message: "Forbidden"});
            }

            const result = await commentCollection.updateOne({_id: new ObjectId(id)},
                {
                    $set: { comment },
                }
            );
            res.json(result);
        }
        );


        app.get("/my-interactions/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await commentCollection.find({ userEmail: email }).sort({ createdAt: -1, }).toArray();
            res.json(result);
        }
        );

        app.post("/comments", verifyToken, async (req, res) => {
            const commentData = req.body;
            const result = await commentCollection.insertOne(commentData);
            res.json(result);
        });

        app.get("/comments/:ideaId", async (req, res) => {
            const { ideaId } = req.params;
            const result = await commentCollection.find({ ideaId }).toArray();
            res.json(result);
        });

        app.delete("/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await commentCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        app.patch("/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const { comment } = req.body;
            const result = await commentCollection.updateOne({ _id: new ObjectId(id) },
                {
                    $set: {
                        comment,
                    },
                }
            );
            res.json(result);
        });




        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server Is Running")
})

app.listen(PORT, () => {
    console.log(`server is running${PORT}`);

})
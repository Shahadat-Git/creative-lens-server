const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('server is running');
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@simple-crud-server.g8zjk15.mongodb.net/?retryWrites=true&w=majority`;



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const userCollesction = client.db('creativeLensDB').collection('users');

        app.post('/jwt', (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' });

            res.send({ token: token });

        })

        // users api
        app.post('/users', async (req, res) => {
            // console.log(req.body)
            const user = req.body;
            const query = { email: user.email };

            const isFound = await userCollesction.findOne(query);
            // console.log(isFound)
            if (!isFound) {
                const result = await userCollesction.insertOne(user);
                res.send(result);
            }
            res.send({ status: false })

        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`server is running : ${port}`)
})

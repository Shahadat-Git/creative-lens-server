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

const verifyJWT = (req, res, next) => {
    const authorization = req?.headers?.authorization;
    if (!authorization) {
        return res.status(401).send({ status: 'unauthorized' });
    }

    // bearer token
    const token = authorization.split(' ')[1];
    // console.log(token)

    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ status: 'unauthorized' });
        }
        req.decoded = decoded;
        next();
    })

}



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@simple-crud-server.g8zjk15.mongodb.net/?retryWrites=true&w=majority`;


const uri = `mongodb://127.0.0.1:27017`;





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

        const usersCollection = client.db('creativeLensDB').collection('users');
        const classedCollection = client.db('creativeLensDB').collection('classes');

        app.post('/jwt', (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' });

            res.send({ token: token });

        })

        // users apis
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            // console.log(req.body)
            const user = req.body;
            const query = { email: user.email };

            const isFound = await usersCollection.findOne(query);
            // console.log(isFound)
            if (!isFound) {
                const result = await usersCollection.insertOne(user);
                res.send(result);
            }
            else {
                res.send({ status: false })
            }

        });

        app.get('/users/status/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log(req.decoded.email)
            console.log(email)
            if (!req.decoded.email === email) {
                return res.send({ status: 'unauthorized user' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (!user) {
                return res.send({ status: 'status not found' })
            }
            const result = { status: user?.role }
            res.send(result);
        });


        // classes apis

        app.post('/classes',verifyJWT, async (req, res) => {
            const classData = req.body;
            const result = await classedCollection.insertOne(classData);
            res.send(result);
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

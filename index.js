const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


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



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@simple-crud-server.g8zjk15.mongodb.net/?retryWrites=true&w=majority`;


// const uri = `mongodb://127.0.0.1:27017`;





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
        const classesCollection = client.db('creativeLensDB').collection('classes');
        const cartsCollection = client.db('creativeLensDB').collection('carts')
        const paymentCollection = client.db('creativeLensDB').collection('payment');


        // admin verify
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();


        }


        // instructor verify
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();


        }

        // create jwt token
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

        app.patch('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: data.role,
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        app.get('/users/status/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
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


        // for instructors
        app.get('/instructors', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/instructors/popular', async (req, res) => {
            const query = { role: 'instructor' };
            sort = { students: -1 }
            const result = await usersCollection.find(query).sort(sort).limit(6).toArray();
            res.send(result);
        })



        // classes apis
        app.get('/classes', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
            const classData = req.body;
            const result = await classesCollection.insertOne(classData);
            res.send(result);
        });

        app.patch('/classes/:id', verifyJWT, verifyInstructor, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            // console.log(data)
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: data.name,
                    seats: data.seats,
                    price: data.price,
                }
            }
            const result = await classesCollection.updateOne(query, updatedDoc);
            res.send(result);
        })


        app.get('/my-classes/:email', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ status: 'unauthorized user' })
            }
            const query = { instructorEmail: email };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/class/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(query);
            res.send(result);
        });

        app.patch('/class/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            // console.log(id, data)
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: data.status,
                }
            }
            const result = await classesCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        app.put('/class/:id', verifyJWT, verifyAdmin, async (req, res) => {
            // console.log(req.body, req.params.id)
            const id = req.params.id;
            const data = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    feedback: data.feedback,
                }
            };
            const options = { upsert: true };
            const result = await classesCollection.updateOne(query, updatedDoc, options);

            res.send(result);
        });

        app.get('/classes/popular', async (req, res) => {
            const sort = { enrolled: -1 };
            const projection = { name: 1, img: 1, enrolled: 1 }
            const result = await classesCollection.find().limit(6).sort(sort).project(projection).toArray();
            res.send(result);
        })

        // approved classes
        app.get('/classes/approved', async (req, res) => {
            const query = { status: 'approved' };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })

        // cart apis

        app.post('/carts', verifyJWT, async (req, res) => {
            const data = req.body;
            // console.log(data)
            const result = await cartsCollection.insertOne(data);
            res.send(result);

        });

        app.get('/carts/:email', verifyJWT, async (req, res) => {
            const email = req.params?.email;
            const query = { email: email };
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });


        app.get('/cart/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.findOne(query);
            res.send(result);
        })

        app.delete('/carts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        })


        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // payment related api
        app.get('/payments/:email', verifyJWT, async (req, res) => {
            const query = { email: req.params?.email };
            const sort = { date: -1 };
            const result = await paymentCollection.find(query).sort(sort).toArray();
            res.send(result);
        })

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: new ObjectId(payment.cartItemId) }
            const deleteResult = await cartsCollection.deleteOne(query)

            // class data update

            const classQuery = { _id: new ObjectId(payment.classId) }
            const selectedClass = await classesCollection.findOne(classQuery);

            const options = { upsert: true };

            const classUpdate = {
                $set: {
                    seats: selectedClass?.seats - 1,
                    enrolled: selectedClass?.enrolled ? selectedClass?.enrolled + 1 : 1,
                }
            }

            const deleteSets = await classesCollection.updateOne(classQuery, classUpdate, options)

            // user data update
            const userQuery = { email: payment?.instructorEmail };
            const classInstructor = await usersCollection.findOne(userQuery);

            const userUpdate = {
                $set: {
                    students: classInstructor?.students ? classInstructor?.students + 1 : 1,
                }
            }

            const userUpdateResult = await usersCollection.updateOne(userQuery, userUpdate, options)


            res.send({ insertResult, deleteResult, deleteSets, userUpdateResult });
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

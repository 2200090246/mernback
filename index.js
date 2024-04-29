const express = require("express");
const cors = require("cors");
require("./db/config");

const User = require("./db/User");
const Event = require("./db/Event");


const app = express();

app.use(express.json());
app.use(cors());
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body
    try {
        const user = await User.findOne({ email })
        if (user) {
            res.json({ message: "user already Exist" })
        }
        else {
            const user = new User({ name, email, password })
            const result = await user.save()
            res.json({ message: "user Created Succesfully", result: result })
        }
    } catch (error) {
        res.json({ message: "An Error Occoured" })
    }
})

app.post('/login', async (req, res) => {
    if (req.body.password && req.body.email) {
        let user = await User.findOne(req.body).select("-password");
        if (user) {
            res.send(user)
        }
        else {
            res.send({ result: "no user found" })
        }
    }
    else {
        res.send("enter all the credintials")
    }

})

app.post('/add-event', async (req, res) => {
    let event = new Event(req.body);
    let result = await event.save();
    res.json({ message: "your event added succesfully", data: result });
});
app.get("/events", async (req, res) => {
    const events = await Event.find();
    if (events.length > 0) {
        res.send(events)
    }
    else {
        res.send({ result: "No Event found" })
    }
});

app.delete("/event/:id", async (req, res) => {
    let result = await Event.deleteOne({ _id: req.params.id });
    res.send(result)
});
app.get('/event/:id', async (req, res) => {
    let result = await Event.findOne({ _id: req.params.id })
    if (result) {
        res.send(result)
    }
    else {
        res.send({ "result": "No Record Found." })
    }
});
app.put("/event/:id", async (req, res) => {
    let result = await Event.updateOne(
        { _id: req.params.id },
        { $set: req.body }
    )
    res.send(result)
});
app.get("/search/:key", async (req, res) => {
    let result = await Event.find({
        "$or": [
            {
                name: { $regex: req.params.key }
            },

            {
                club: { $regex: req.params.key }
            },
            {
                venue: { $regex: req.params.key }
            },
            {
                category: { $regex: req.params.key }
            },
            {
                date: { $regex: req.params.key }
            },

        ]
    });
    res.send(result);
})
app.listen(5000);
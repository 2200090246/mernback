const express = require('express');
const router = express.Router();
const Event = require('../db/Event');

// Add Event
router.post('/add-event', async (req, res) => {
    let event = new Event(req.body);
    let result = await event.save();
    res.json({ message: "your event added succesfully", data: result });
});

// Get All Events
router.get("/events", async (req, res) => {
    const events = await Event.find();
    if (events.length > 0) {
        res.send(events)
    }
    else {
        res.send({ result: "No Event found" })
    }
});

// Delete Event
router.delete("/event/:id", async (req, res) => {
    const { userId, userRole } = req.body;

    try {
        const event = await Event.findOne({ _id: req.params.id });
        if (!event) {
            return res.status(404).send({ result: "Event not found" });
        }

        if (userRole === 'admin' || event.userId === userId) {
            let result = await Event.deleteOne({ _id: req.params.id });
            res.send(result);
        } else {
            res.status(403).send({ result: "Unauthorized to delete this event" });
        }
    } catch (error) {
        res.status(500).send({ result: "Error deleting event" });
    }
});

// Get Single Event
router.get('/event/:id', async (req, res) => {
    let result = await Event.findOne({ _id: req.params.id })
    if (result) {
        res.send(result)
    }
    else {
        res.send({ "result": "No Record Found." })
    }
});

// Update Event
router.put("/event/:id", async (req, res) => {
    let result = await Event.updateOne(
        { _id: req.params.id },
        { $set: req.body }
    )
    res.send(result)
});

// Search Events
router.get("/search/:key", async (req, res) => {
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

module.exports = router;

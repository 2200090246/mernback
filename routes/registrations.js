const express = require('express');
const router = express.Router();
const Registration = require('../db/Registration');
const User = require('../db/User');
const Event = require('../db/Event');
const transporter = require('../utils/email');

// Register for an event
router.post('/register-event', async (req, res) => {
    const { userId, eventId } = req.body;
    try {
        const existing = await Registration.findOne({ userId, eventId });
        if (existing) {
            return res.status(400).send({ message: "Already registered for this event" });
        }
        const registration = new Registration({ userId, eventId });
        const result = await registration.save();

        const user = await User.findOne({ _id: userId });
        const event = await Event.findOne({ _id: eventId });
        if (user && event) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Registration Confirmed: ${event.name}`,
                    html: `<h3>You have successfully registered for ${event.name}</h3>
                           <p><strong>Date:</strong> ${event.date}</p>
                           <p><strong>Time:</strong> ${event.time}</p>
                           <p><strong>Venue:</strong> ${event.venue}</p>
                           <p>We look forward to seeing you there!</p>`
                });
            } catch (mailError) {
                console.error("EMAIL ERROR (REGISTER EVENT):", mailError);
            }
        }

        res.send({ message: "Registered successfully", result });
    } catch (error) {
        res.status(500).send({ message: "Error registering for event" });
    }
});

// Unregister from an event
router.post('/unregister-event', async (req, res) => {
    const { userId, eventId } = req.body;
    try {
        const result = await Registration.findOneAndDelete({ userId, eventId });
        if (result) {
            const user = await User.findOne({ _id: userId });
            const event = await Event.findOne({ _id: eventId });
            if (user && event) {
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: `Registration Cancelled: ${event.name}`,
                        html: `<h3>You have successfully unregistered from ${event.name}</h3>
                               <p>If this was a mistake, you can register again at any time.</p>`
                    });
                } catch (mailError) {
                    console.error("EMAIL ERROR (UNREGISTER EVENT):", mailError);
                }
            }
            res.send({ message: "Unregistered successfully" });
        } else {
            res.status(404).send({ message: "Registration not found" });
        }
    } catch (error) {
        res.status(500).send({ message: "Error unregistering from event" });
    }
});

// Get registrations for a specific user
router.get('/my-registrations/:userId', async (req, res) => {
    try {
        const registrations = await Registration.find({ userId: req.params.userId }).populate('eventId');
        res.send(registrations);
    } catch (error) {
        res.status(500).send({ message: "Error fetching registrations" });
    }
});

// Get registrations for a specific event (for Admin)
router.get('/event-registrations/:eventId', async (req, res) => {
    try {
        const registrations = await Registration.find({ eventId: req.params.eventId }).populate('userId', 'name email');
        res.send(registrations);
    } catch (error) {
        res.status(500).send({ message: "Error fetching registrations" });
    }
});

module.exports = router;

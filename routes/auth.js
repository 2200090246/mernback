const express = require('express');
const router = express.Router();
const User = require('../db/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../utils/email');

/* =========================
   REGISTER
========================= */
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            isVerified: false,
            verificationToken,
            verificationTokenExpires
        });

        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
        const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;

        // Send email (do not fail signup if mail fails)
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify your email',
                html: `
                    <h3>Email Verification</h3>
                    <p>Click the link below to verify your email:</p>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                    <p>This link expires in 24 hours.</p>
                `
            });
        } catch (mailError) {
            console.error("EMAIL ERROR (REGISTER):", mailError);
        }

        res.status(201).json({
            message: "User created successfully. Please verify your email."
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/* =========================
   LOGIN
========================= */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ result: "Enter all credentials" });
    }

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ result: "No user found" });
        }

        if (!user.isVerified) {
            return res.status(403).send({ result: "Email not verified. Please check your inbox." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ result: "Invalid credentials" });
        }

        user = user.toObject();
        delete user.password;
        res.send(user);

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).send({ result: "Login failed" });
    }
});

/* =========================
   VERIFY EMAIL
========================= */
router.get('/verify/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            verificationToken: req.params.token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ message: "Invalid or expired token" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.send({ message: "Email verified successfully" });

    } catch (error) {
        console.error("VERIFY ERROR:", error);
        res.status(500).send({ message: "Error verifying email" });
    }
});

/* =========================
   RESEND VERIFICATION
========================= */
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).send({ message: "Email already verified" });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
        const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Resend: Verify your email',
                html: `
                    <h3>Email Verification</h3>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                `
            });
        } catch (mailError) {
            console.error("EMAIL ERROR (RESEND):", mailError);
        }

        res.send({ message: "Verification email sent" });

    } catch (error) {
        console.error("RESEND ERROR:", error);
        res.status(500).send({ message: "Error sending verification email" });
    }
});

/* =========================
   FORGOT PASSWORD
========================= */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
        const resetUrl = `${frontendUrl}/reset-password/${token}`;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <h3>Password Reset</h3>
                    <a href="${resetUrl}">${resetUrl}</a>
                `
            });
        } catch (mailError) {
            console.error("EMAIL ERROR (FORGOT):", mailError);
        }

        res.send({ message: "Password reset link sent to your email" });

    } catch (error) {
        console.error("FORGOT ERROR:", error);
        res.status(500).send({ message: "Error sending reset email" });
    }
});

/* =========================
   RESET PASSWORD
========================= */
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ message: "Invalid or expired token" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.send({ message: "Password reset successfully" });

    } catch (error) {
        console.error("RESET ERROR:", error);
        res.status(500).send({ message: "Error resetting password" });
    }
});

module.exports = router;

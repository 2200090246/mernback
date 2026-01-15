const express = require('express');
const router = express.Router();
const User = require('../db/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../utils/email');

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body
    try {
        const user = await User.findOne({ email })
        if (user) {
            res.json({ message: "user already Exist" })
        }
        else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

            const user = new User({
                name,
                email,
                password: hashedPassword,
                role,
                isVerified: false,
                verificationToken,
                verificationTokenExpires
            })
            const result = await user.save()

            // Send Verification Email
            const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
            const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;
            await transporter.sendMail({
                from: 'n1775201@gmail.com',
                to: email,
                subject: 'Verify your email for Event Management System',
                html: `<h3>Click the link below to verify your email:</h3>
                       <a href="${verificationUrl}">${verificationUrl}</a>
                       <p>This link expires in 24 hours.</p>`
            });

            res.json({ message: "user Created Succesfully. Please verify your email.", result: result })
        }
    } catch (error) {
        console.error(error);
        res.json({ message: "An Error Occoured" })
    }
});

// Login
router.post('/login', async (req, res) => {
    if (req.body.password && req.body.email) {
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            if (!user.isVerified) {
                return res.send({ result: "Email not verified. Please check your inbox." });
            }
            const isMatch = await bcrypt.compare(req.body.password, user.password);
            if (isMatch) {
                // Remove password from response
                user = user.toObject();
                delete user.password;
                res.send(user)
            } else {
                res.send({ result: "invalid credentials" })
            }
        }
        else {
            res.send({ result: "no user found" })
        }
    }
    else {
        res.send("enter all the credintials")
    }

});

// Verify Email
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
        res.status(500).send({ message: "Error verifying email" });
    }
});

// Resend Verification
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
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
        const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;
        await transporter.sendMail({
            from: 'n1775201@gmail.com',
            to: email,
            subject: 'Resend: Verify your email for Event Management System',
            html: `<h3>Click the link below to verify your email:</h3>
                   <a href="${verificationUrl}">${verificationUrl}</a>
                   <p>This link expires in 24 hours.</p>`
        });

        res.send({ message: "Verification email sent" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error sending verification email" });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'https://mernfront-dmoz.onrender.com';
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        await transporter.sendMail({
            from: 'n1775201@gmail.com',
            to: email,
            subject: 'Password Reset Request',
            html: `<h3>Click the link below to reset your password:</h3>
                   <a href="${resetUrl}">${resetUrl}</a>
                   <p>This link expires in 1 hour.</p>`
        });

        res.send({ message: "Password reset link sent to your email" });
    } catch (error) {
        res.status(500).send({ message: "Error sending reset email" });
    }
});

// Reset Password
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
        res.status(500).send({ message: "Error resetting password" });
    }
});

module.exports = router;

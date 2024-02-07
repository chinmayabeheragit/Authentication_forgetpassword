// index.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('./models/User');

const app = express();
const PORT = 8004;

mongoose.connect('mongodb+srv://foodinor:Stark890@cluster0.ogwx3pn.mongodb.net/Foodinor?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'Foodinor',
});


const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

const transporter = nodemailer.createTransport({
    // Your email transporter configuration
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Set to true if using SSL/TLS
    auth: {
        user: 'chinmayabehera891@gmail.com',
        pass: 'ozjndnvgjcirenit',
    },
});


// Serve login page on the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});


// Handle login request
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            res.send('Login successful!');
        } else {
            res.send('Incorrect email or password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

// Handle registration request
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.send('Email already registered');
        } else {
            // Create a new user
            const newUser = new User({ email, password });
            await newUser.save();
            res.send('Registration successful!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});




// Serve forget password page
app.get('/forget-password', (req, res) => {
    res.sendFile(__dirname + '/views/forget-password.html');
});

// Handle forget password request

app.post('/forget-password', async (req, res) => {
    try {
        const { email } = req.body; // Use req.body instead of req.query

        // Check if the email is registered
        const user = await User.findOne({ email });

        if (!user) {
            return res.send('Email not found');
        }

        // Generate a unique token
        const token = crypto.randomBytes(20).toString('hex');

        // Store the token and associated email in the database
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
        await user.save();

        // Create a password reset link
        const resetLink = `http://localhost:8004/update-password?token=${token}`;


        // Send an email with the password reset link
        await transporter.sendMail({
            to: email,
            subject: 'Password Reset',
            html: `Click <a href="${resetLink}">here</a> to reset your password.`,
        });

        // Redirect to a page confirming that the email has been sent
        res.sendFile(__dirname + '/views/confirm-email-sent.html');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Serve update password page
app.get('/update-password', (req, res) => {
    // Extract the token from the URL parameters
    const token = req.query.token;

    // Pass the token to the update-password.html page
    res.sendFile(__dirname + '/views/update-password.html');
});


// Handle update password request
app.post('/update-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Find the user with the provided token and ensure the token is not expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (user) {
            // Update the user's password
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            console.log('Password updated successfully! Redirecting to login page...');

            // Redirect to the login page after successful password update
            res.redirect('/');

            // res.send('Password updated successfully!');
        } else {
            res.send('Invalid or expired token');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Serve confirmation page for email sent
app.get('/confirm-email-sent', (req, res) => {
    res.sendFile(__dirname + '/views/confirm-email-sent.html');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
});

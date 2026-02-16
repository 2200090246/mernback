require('dotenv').config();
const express = require("express");
const cors = require("cors");
require("./db/config");

const app = express();

app.use(express.json());
app.use(cors());

// Import Routes
app.use(require('./routes/auth'));
app.use(require('./routes/events'));
app.use(require('./routes/registrations'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
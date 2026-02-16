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

app.listen(5000);
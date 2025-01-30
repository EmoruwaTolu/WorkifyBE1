const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const eventRoutes = require('./routes/events');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/events', eventRoutes);

// Server setup
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const eventRoutes = require('./routes/events'); // to access any endpoint with events it should look like www.x.com/events/API_endpoint
const userRoutes = require('./routes/student-users');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/events', eventRoutes);
app.use('/users', userRoutes);

// Server setup
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const eventRoutes = require('./routes/events'); // to access any endpoint with events it should look like www.x.com/events/API_endpoint
const userRoutes = require('./routes/student-users');

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'https://ueventsfe.onrender.com',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).end();
        return;
    }
    next();
});

app.use(bodyParser.json());

app.use('/events', eventRoutes);
app.use('/users', userRoutes);

// Server setup
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

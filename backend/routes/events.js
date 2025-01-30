const express = require('express');
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require('multer');
const sharp = require('sharp');
const connectDB = require('../config/db');
const s3 = require('../config/s3');

const router = express.Router();
const bucketName = process.env.BUCKET_NAME;

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET events
router.get('/get-events', async (req, res) => {
    const db = await connectDB();
    const eventsCollection = db.collection('CSSA-CMS');

    try {
        const upcomingEvents = await eventsCollection
            .find({ date: { $gte: new Date() } })
            .sort({ date: 1 })
            .limit(5)
            .toArray();

        for (const event of upcomingEvents) {
            const getParameters = { Bucket: bucketName, Key: event.eventKey };
            event.posterUrl = await getSignedUrl(s3, new GetObjectCommand(getParameters), { expiresIn: 3600 });
        }

        res.json(upcomingEvents);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST event
router.post('/upload-events', upload.single('poster'), async (req, res) => {
    const db = await connectDB();
    const eventsCollection = db.collection('CSSA-CMS');

    try {
        const dayOfUpload = new Date();
        const webpBuffer = await sharp(req.file.buffer)
            .resize({ height: 1080, width: 1080, fit: "contain" })
            .webp({ quality: 80 })
            .toBuffer();

        const s3Key = `${req.body.name}_${dayOfUpload.getDate()}_${dayOfUpload.getMonth() + 1}_${dayOfUpload.getFullYear()}_${req.body.language}.webp`;

        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: webpBuffer,
            ContentType: 'image/webp'
        }));

        const imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: s3Key }), { expiresIn: 3600 });

        const newEvent = {
            name: req.body.name,
            date: new Date(req.body.date),
            eventKey: s3Key,
            location: req.body.location,
            language: req.body.language,
            posterUrl: imageUrl,
            description: req.body.description
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

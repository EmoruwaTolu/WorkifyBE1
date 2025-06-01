const express = require("express");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const sharp = require("sharp");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const docClient = require("../config/db");
const s3 = require("../config/s3");

const router = express.Router();
const bucketName = process.env.BUCKET_NAME;
const tableName = "CSSA-CMS"; // Your DynamoDB table name

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET events - GET means that this API sends data
router.get('/get-events', async (req, res) => {
    try {
        console.log("yeah we reached here")
        const getFutureEvents = new ScanCommand({
            TableName: tableName,
            FilterExpression: "#date >= :now",
            ExpressionAttributeNames: { "#date": "date" },
            ExpressionAttributeValues: { ":now": { S: new Date().toISOString() } },
        });
    
        const { Items } = await docClient.send(getFutureEvents);

        console.log(Items)
        Items.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
    
        // The images are being stored in an s3 bucket and this loop is to get all the images for the right events from these buckets
        for (const event of Items) {
            const getParameters = { Bucket: bucketName, Key: event.eventKey.S };
            event.posterUrl = await getSignedUrl(s3, new GetObjectCommand(getParameters), { expiresIn: 3600 });
        }
        res.json(Items);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/get-events-specific', async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
        throw new createHttpError.BadRequest("Must supply a `date` query parameter");
        }

        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
        throw new createHttpError.BadRequest("`date` is not a valid ISO date string");
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        console.log(targetDate)

        const scanCmd = new ScanCommand({
            TableName: tableName,
            FilterExpression: "#date BETWEEN :start AND :end",
            ExpressionAttributeNames:  { "#date": "date" },
            ExpressionAttributeValues: {
                ":start": { S: startOfDay.toISOString() },
                ":end":   { S: endOfDay.toISOString() }
            }
        });

        const { Items = [] } = await docClient.send(scanCmd);
        const rawEvents = Items.map(item => unmarshall(item));

        // Regenerate a fresh signed URL for each event's poster
        const eventsWithUrls = await Promise.all(
            rawEvents.map(async evt => {
                if (evt.eventKey) {
                const freshUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({ Bucket: bucketName, Key: evt.eventKey }),
                    { expiresIn: 3600 }
                );
                return { ...evt, posterUrl: freshUrl };
                }
                return evt;
            })
        );

        return res.json(eventsWithUrls);
    } 
    catch (err) {
        return next(err);
    }
});

// POST event - POST means that this API receives data
router.post('/upload-events', upload.single('eventImage'), async (req, res) => {
    try {
        const dayOfUpload = new Date();
        const s3Key = `${req.body.eventName}_${dayOfUpload.getDate()}_${dayOfUpload.getMonth() + 1}_${dayOfUpload.getFullYear()}_${req.body.language}.webp`;
    
        const webpBuffer = await sharp(req.file.buffer)
            .resize({ height: 1080, width: 1080, fit: "contain" })
            .webp({ quality: 80 })
            .toBuffer();
    
        // Upload to S3
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: webpBuffer,
            ContentType: "image/webp"
        }));
    
        const imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: s3Key }), { expiresIn: 3600 });
        const eventId = `${req.body.name}_${dayOfUpload.getTime()}`;

        console.log(req.body.date)
        console.log(new Date(req.body.date))
        const newEvent = {
            'event-id':  eventId,
            name:        req.body.eventName,
            date:        new Date(req.body.date).toISOString(),
            startTime:   req.body.startTime,
            endTime:     req.body.endTime,
            tags:        JSON.parse(req.body.tags),
            location:    req.body.eventLocation,
            language:    req.body.language,
            eventKey:    s3Key,
            posterUrl:   imageUrl,
            description: req.body.description,
        };

        console.log(newEvent)
          
    
        // Insert into DynamoDB
        await docClient.send(new PutCommand({ TableName: tableName, Item: newEvent }));
        res.json(newEvent);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

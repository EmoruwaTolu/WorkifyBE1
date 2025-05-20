const express = require("express");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { ScanCommand } = require("@aws-sdk/client-dynamodb");
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

// POST event - POST means that this API receives data
router.post('/update-account', upload.single('clubBanner'), async (req, res) => {
    try {
        const s3Key = `${req.body.name}_banner.webp`;
    
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
    
        const newEvent = {
            id: `${req.body.name}_${dayOfUpload.getTime()}`, // Unique ID for DynamoDB
            name: req.body.name,
            date: new Date(req.body.date).toISOString(),
            eventKey: s3Key,
            location: req.body.location,
            language: req.body.language,
            posterUrl: imageUrl,
            description: req.body.description,
        };
        const updatedClubProfile = {
            id: `${req.body.name}_club`, // Unique ID for DynamoDB
            club: req.body.club,
            clubKey: s3Key,
            description: req.body.clubDescription,
            posterUrl: imageUrl,
            members: req.body.members,
        }
    
        // Insert into DynamoDB
        await docClient.send(new PutCommand({ TableName: tableName, Item: newEvent }));
        res.json(newEvent);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const dynamoClient = new DynamoDBClient({
    region: process.env.BUCKET_REGION, 
    credentials: {
        accessKeyId: process.env.DYNAMODB_ACCESS_KEY,
        secretAccessKey: process.env.DYNAMODB_SECRET_KEY,
    },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

module.exports = docClient;

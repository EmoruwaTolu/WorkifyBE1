// For guidance take a look at events.js
// The table in Events.js refers to the database you will be sending information to
// The table you should use for this is StudentAccounts
// The database should store data such as FirstName, LastName, Email, and password

// 1. Create an API that creates a user in the database
// 1. Create an API that validates whether data(email and password) a user in the database actually exists.
// For the second API you should have appropriate response messages if it fails, i.e user does not exist or incorrect password

// You know where to find me if you need more info
// I heavily recommend trying to figure it out yourself before using ChatGPT, I think I've documented the code well enough but you can always message me about something that's confusing

const express = require("express");
const bcrypt = require('bcryptjs');
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const docClient = require("../config/db");

const router = express.Router();
const tableName = "StudentAccounts"; // Your DynamoDB table name

// POST users - Creating the User
router.post('/add-user', async (req, res) => {
    try {
        const dayOfUpload = new Date();

        const salt = await bcrypt.genSalt(10);
        const hashed_pass = await bcrypt.hash(req.body.password, salt)

        //TODO: Some kind of way to query and see if the email already exists.
        
        const newUser = {
            "student-aws-id": `${req.body.email}`, // Unique ID for DynamoDB
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashed_pass
        };
    
        // Insert into DynamoDB
        await docClient.send(new PutCommand({ TableName: tableName, Item: newUser }));
        res.json(newUser);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
    // console.log("Router Working");
    // res.end();
});

// Validating user information and comparing password
router.post('/validate-user', async (req, res) => {
    const { email, password} = req.body; // get inputted email and password 

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        const getUser = new GetCommand({
            TableName: tableName,
            Key: { "student-aws-id": email } // Find using email
        });
    
        const { Item } = await docClient.send(getUser);
        if (!Item) {
            return res.status(404).json({ error: "User does not exist." });
        }

        const isPasswordValid = await bcrypt.compare(password, Item.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect password." });
        }
    
        res.json({ message: "User validated successfully." });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;


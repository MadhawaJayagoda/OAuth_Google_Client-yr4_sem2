const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
require('dotenv/config');

let constants = require('./resources/constants');
const {google} = require('googleapis');

//Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Import Routes
const postRoutes = require('./routes/posts');

app.use('/posts', postRoutes);

const OAuth2Client = new google.auth.OAuth2(
  constants.CLIENT_ID,
  constants.CLIENT_SECRET,
  constants.REDIRECT_URI
);

var authorized = false;

var name;
var profilePic;

// ROUTES
app.get('/', (req, res) => {
	res.render('index');

});


// start listening to the server
app.listen(3000, () => {
    console.log("Application is running on port:", 3000);
});
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv/config');

const {google} = require('googleapis');
const OAuth2Data = require('./resources/credentials');

//Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Import Routes
const postRoutes = require('./routes/posts');

app.use('/posts', postRoutes);


// ROUTES
app.get('/', (req, res) => {
   res.render("index")
});

// start listening to the server
app.listen(3000, () => {
    console.log("Application is running on port:", 3000);
});
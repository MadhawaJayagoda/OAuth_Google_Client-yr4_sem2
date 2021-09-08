const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
require('dotenv/config');

let constants = require('./resources/constants');
const {google} = require('googleapis');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

app.set('view engine', 'ejs');

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
	 if (!authorized) {
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        console.log(url);

        res.render("index", {url:url});
    } else {

        let oAuth2 = google.oauth2({
            auth: OAuth2Client,
            version: 'v2'
        });

        oAuth2.userinfo.get(function (err, response) {
            if (err) {
                console.log(err.message);
                throw err;
            }

            console.log(response.data);

            name = response.data.name;
            profilePic = response.data.picture;

            res.render("success", {
                name: name,
                pic: profilePic,
                success:false
            });
        })

    }
});

app.get('/google/callback', (req, res) => {

    const code = req.query.code;

    if(code) {
        OAuth2Client.getToken( code, function (err, tokens) {
            if (err) {
                console.log("Error occured when getting Access Tokens", err.message);
            } else {
                console.log("Successfully received an Access Token");
                console.log("Access Tokens: ", tokens);
                OAuth2Client.setCredentials(tokens);

                authorized = true;

                res.redirect('/')
            }

        })
    }
});


app.listen(3000, () => {
    console.log("Application is running on port:", 3000);
});
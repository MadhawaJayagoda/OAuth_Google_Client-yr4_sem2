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

// Set the view engine 
app.set('view engine', 'ejs');

const OAuth2Client = new google.auth.OAuth2(
  constants.CLIENT_ID,
  constants.CLIENT_SECRET,
  constants.REDIRECT_URI
);

var authorized = false;
var name;
var profilePic;
var fileArray;
var sharedFile = false;
var sharedLink = "";

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname )
    },
});

var upload = multer({
    storage: storage,
}).single("file");  // Filed name and max count



// ROUTES
// Display Login page, if not authenticated
// Else, display main inteface, if the user is already authenticated. 
app.get('/', (req, res) => {
    if (!authorized) {
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        res.render("index", {url:url});
    } else {

        let oAuth2 = google.oauth2({
            auth: OAuth2Client,
            version: 'v2'
        });

        // Get User info from Google resource server
        oAuth2.userinfo.get(function (err, response) {
            if (err) {
                console.log(err.message);
                throw err;
            }

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

    // Authorization token from Google after verification
    const code = req.query.code;

    if(code) {
        // Get the access token
        OAuth2Client.getToken( code, function (err, tokens) {
            if (err) {
                console.log("Error occured when getting Access Token", err.message);
            } else {
                // Succcessfully received an Access Token
                OAuth2Client.setCredentials(tokens);

                authorized = true;

                res.redirect('/')
            }
        })
    }
});

// Upload files to Google Drive
app.post('/upload', (req, res) => {
    if (!authorized) {
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        res.render("index", {url: url});
    } else {

        // User Logged in - User has an Active session
        upload(req, res, function(err) {
            if(err) {
                // Error in Multer file upload
                console.log(err.message);
            }

            // Upload to drive
            const drive = google.drive({
                version:'v3',
                auth: OAuth2Client
            });

            const fileMetaData = {
                name: req.file.filename
            };

            const media = {
                mimeType: req.file.mimetype,
                body: fs.createReadStream(req.file.path)
            };

            drive.files.create({
                resource: fileMetaData,
                media: media,
                fields: "id"
            }, (err, file) => {
                if (err) {
                    //Error occured in uploading file to Google Drive
                    console.log(err.message);
                    throw err;
                }

                // Delete the file in the images folder
                fs.unlinkSync(req.file.path);
                res.render("success", {
                    name: name,
                    pic: profilePic,
                    success:true
                })
            });
        });
    }
});

// Terminate the current session of the user
app.get('/logout', (req, res) => {
   authorized = false;
   res.redirect('/');
});


async function getFileList(drive) {
    const response = await drive.files.list({
        pageSize: 10,
        fields: "nextPageToken, files(id, name, mimeType, createdTime)",
    });
    const files = response.data.files;
    const fileArray = [];
    if (files.length) {
        const fileDisplay = [];
        const fileId = [];
        const mimeType = [];

        for (var i = 0; i < files.length; i++) {
            fileDisplay.push(files[i].name);
            fileId.push(files[i].id);
            mimeType.push(files[i].mimeType);
        }
        for (var y = 0; y < fileDisplay.length; y++) {
            fileArray.push({
                file: fileDisplay[y],
                id: fileId[y],
                type: mimeType[y],
            });
        }
    }
    return fileArray;
}

app.get('/gldrive', async (req, res) => {

    if (!authorized) {
		// User is not logged In
		
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        res.render("index", {url: url});
    } else {

        // User Logged in - has an Active session
        const drive = google.drive({
            version: "v3",
            auth: OAuth2Client
        });
        fileArray = await getFileList(drive).catch((err) => {
            if (err) console.log(err);
        });
        
        if (fileArray.length == undefined || fileArray.length == 0) {
			// No files in Drive
            res.redirect('/');
        } else {
            res.render("drive", {
                name: name,
                pic: profilePic,
                fileArray: fileArray,
                sharedFile: sharedFile,
                sharedLink: sharedLink,
            });
        }
    }
});

//create a public url
app.post('/share', async (req, res) => {
    if (!authorized) {
		// User not logged in
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        res.render("index", {url: url});
    } else {
        // User logged in - User has an Active session
        sharedLink = "";

        const drive = google.drive({
            version: "v3",
            auth: OAuth2Client
        });

        try {
            const fileId = req.body.id;
            //change file permisions to public.
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            await drive.files.get({
                fileId: fileId,
                fields: 'webViewLink, webContentLink',
            }, (err, file) => {
                if (err) {
					// Error in creating a sharable link
                    console.log(err.message);
                    throw err;
                }

                sharedFile = true;
                sharedLink = file.data.webViewLink;

                res.render("drive", {
                    name: name,
                    pic: profilePic,
                    fileArray: fileArray,
                    sharedFile: sharedFile,
                    sharedLink: sharedLink
                }, (err, res) => {
                    if(err) {
                        // Error in sending link to Front-end
                        console.log(err);
                    } else {
                        console.log(sharedLink);
                    }
                });
            });

        } catch (error) {
            console.log(error.message);
        }
    }
});

// Delete file from Drive
app.delete('/delete', async (req, res) => {
    if (!authorized) {
		// User not logged in
        let url = OAuth2Client.generateAuthUrl({
            access_type: constants.ACCESS_TYPE,
            scope: constants.SCOPES
        });

        res.render("index", {url: url});
    } else {

        // User Logged In - User has an Active Session
        const drive = google.drive({
            version: "v3",
            auth: OAuth2Client
        });
        try {
            const response = await drive.files.delete({
                fileId: req.body.id
            });

            if(response.status >= 200 && response.status < 300) {

                sharedFile = false;
                sharedLink = "";

                res.render("drive", {
                    name: name,
                    pic: profilePic,
                    fileArray: fileArray,
                    sharedFile: sharedFile,
                    sharedLink: sharedLink
                }, (err, res) => {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log(sharedLink);
                    }
                });
            }
        } catch(err) {
            console.log(error.message)
        }
    }
});


// start listening to the server
app.listen(3000, () => {
    console.log("Application is running on port:", 3000);
});
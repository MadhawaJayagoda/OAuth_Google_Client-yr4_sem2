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

app.post('/upload', (req, res) => {
    upload(req, res, function(err) {
        if(err) {
            throw err;
        }

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
                console.log("Error occured in uploading file to Google Drive");
                console.log(err.message);
                throw err;
            }

            res.render("success", {
                name: name,
                pic: profilePic,
                success:true
            })
        });
    });
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

    const drive = google.drive({
        version: "v3",
        auth: OAuth2Client
    });
    fileArray = await getFileList(drive).catch((err) => {
        if (err) console.log(err);
    });

    if(fileArray.length == undefined || fileArray.length == 0 ) {
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
});

app.post('/share', async (req, res) => {

    sharedLink = "";

    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        await drive.files.get({
                fields: 'webViewLink, webContentLink',
        }, (err, file) => {
            if (err) {
                throw err;
            }

            sharedFile = true;
            sharedLink = file.data;

            res.render("drive", {
                name: name,
                pic: profilePic,
                fileArray: fileArray,
                sharedLink: sharedLink
            }, (err, res) => {
                if(err) {
                    console.log(err);
                } else {
                    console.log("Successfully shared link to front-end", sharedLink);
                }
            });
        });

    } catch (error) {
        console.log(error);
    }
});


app.delete('/delete', async (req, res) => {
    
    try {
        const response = await drive.files.delete({
            fileId: req.body.id
        });

		sharedFile = false;
		sharedLink = "";

		res.render("drive", {
			name: name,
			pic: profilePic,
			fileArray: fileArray,
		}, (err, res) => {
			if(err) {
				thorw err;
			} else {
				console.log(response);
			}

        }
    } catch(err) {
        console.log(error.message)
    }
});

app.get('/logout', (req, res) => {
   res.redirect('/');
});

app.listen(3000, () => {
    console.log("Application is running on port:", 3000);
});
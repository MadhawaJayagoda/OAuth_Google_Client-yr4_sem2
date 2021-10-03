'use strict';

const OAuth2Data = require('./credentials');

let constants = {
    CLIENT_ID: OAuth2Data.web.client_id,
    CLIENT_SECRET: OAuth2Data.web.client_secret,
    REDIRECT_URI: OAuth2Data.web.redirect_uris[0],

    SCOPES: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile",

    ACCESS_TYPE: 'offline'
};

module.exports =
    Object.freeze(constants); // freeze prevents changes by users

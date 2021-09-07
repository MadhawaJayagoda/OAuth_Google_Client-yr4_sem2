const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
   res.send('We are in Posts');
});

module.exports = router;
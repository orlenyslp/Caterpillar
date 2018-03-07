'use strict';

var request = require('request');

request.post(
    'http://localhost:3010/services',
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Done")
        }
    }
);






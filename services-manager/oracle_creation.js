'use strict';

const request = require('request');
const async = require('async');

async.seq(
    (req, callback) => {
        request({ url: 'http://localhost:3010/oracles', method: 'POST', json: true }, (err, resp) => {
            console.log('done');
            callback(null, 'done');
        })
    }
)({});

console.log('Working on oracle creation');
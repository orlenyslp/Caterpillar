'use strict';
const fs = require('fs');
const request = require('request');
const async = require('async');

const example = fs.readFileSync('demo_running_example.bpmn', 'utf-8');

async.seq(
    (modelInfo, callback) => {
        console.log(modelInfo);
        request({ url: 'http://localhost:3000/models', method: 'POST', json: true, body: modelInfo }, (err, resp, body) => {
            console.log('done');
            callback(null, modelInfo.name);
        })
    },
    (modelName, callback) => {
        request({ url: `http://localhost:3000/models/${modelName}`, method: 'POST', json: true, body: {} }, (err, resp, body) => {
            callback(null, `http://localhost:3000/processes/${body.address}`);
        })
    }
)({ name: 'example', bpmn: example });

console.log('Just a checkpoint');
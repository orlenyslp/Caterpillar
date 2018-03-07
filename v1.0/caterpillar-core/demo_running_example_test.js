'use strict';
const fs = require('fs');
const request = require('request');
const async = require('async');

let example = fs.readFileSync('demo_running_example.bpmn', 'utf-8');
async.seq(
    (example, callback) => {
        request({ url: 'http://localhost:3010/services/Assess_Loan_Risk', method: 'GET'}, (err, resp, body) => {
            callback(null, example.replace('$Assess_Loan_Risk', JSON.parse(body).address));
        })
    },
    (example, callback) => {
        request({ url: 'http://localhost:3010/services/Appraise_Property', method: 'GET'}, (err, resp, body) => {
            callback(null, {name: 'example', bpmn: example.replace('$Appraise_Property', JSON.parse(body).address)});
        })
    },
    (modelInfo, callback) => {
        request({ url: 'http://localhost:3000/models', method: 'POST', json: true, body: modelInfo }, (err, resp, body) => {
            callback(null, modelInfo.name);
        })
    },
    (modelName, callback) => {
        request({ url: `http://localhost:3000/models/${modelName}`, method: 'POST', json: true, body: {} }, (err, resp, body) => {
            
         })
    }
)(example);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var solc = require("solc");
var Web3 = require("web3");
var services_store_1 = require("../services/services.store");
var definitions_1 = require("../services/definitions");
var definitions_2 = require("../services/definitions");
var services_parse_1 = require("../services/services.parse");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
http.listen(8090, function () {
    console.log('started on port 8090');
});
var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));
var runningOracles = new Map();
web3.eth.filter("latest", function (error, result) {
    if (!error) {
        var info = web3.eth.getBlock(result);
        if (info.transactions.length > 0) {
            console.log("Info ", info);
            var areFiredTasks = false;
            var contractsToNotify = [];
            info.transactions.forEach(function (transactionHash) {
                var transRec = web3.eth.getTransactionReceipt(transactionHash);
                transRec.logs.forEach(function (logElem) {
                    var contractAddress = logElem.address.toString();
                });
            });
            if (areFiredTasks)
                io.emit('message', { type: 'new-message', text: "Updates in Server" });
        }
    }
});
exports.createOracles = function () {
    var parameters = [new definitions_2.ParameterInfo('uint', 'monthlyRevenue'), new definitions_2.ParameterInfo('uint', 'loadAmount')];
    var Assess_Loan_Risk = new definitions_1.ServiceInfo('Assess_Loan_Risk', parameters);
    services_parse_1.parseService(Assess_Loan_Risk);
    var parameters2 = [new definitions_2.ParameterInfo('uint', 'cost')];
    var Appraise_Property = new definitions_1.ServiceInfo('Appraise_Property', parameters2);
    services_parse_1.parseService(Appraise_Property);
    services_store_1.serviceStore.set(Appraise_Property.serviceName, Appraise_Property);
    services_store_1.serviceStore.set(Assess_Loan_Risk.serviceName, Assess_Loan_Risk);
    try {
        var input_1 = {};
        services_store_1.serviceStore.forEach(function (serviceInfo) {
            input_1[serviceInfo.serviceName] = serviceInfo.solidity;
        });
        var output_1 = solc.compile({ sources: input_1 }, 1);
        Object.keys(output_1.contracts).forEach(function (entryContract) {
            var ProcessContract = web3.eth.contract(JSON.parse(output_1.contracts[entryContract].interface));
            ProcessContract.new({ from: web3.eth.accounts[0], data: "0x" + output_1.contracts[entryContract].bytecode, gas: 4000000 }, function (err, contract) {
                if (err) {
                    console.log('error ', err);
                }
                else if (contract.address) {
                    console.log('oracle created!', contract.address.toString());
                    runningOracles.set(contract.address.toString(), entryContract.split(":")[0]);
                }
                else {
                    console.log("address ", contract);
                }
            });
        });
        console.log("Running Oracles ", runningOracles);
    }
    catch (e) {
        console.log(e);
    }
};
//# sourceMappingURL=services.controller.js.map
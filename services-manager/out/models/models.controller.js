"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var solc = require("solc");
var Web3 = require("web3");
var models_store_1 = require("./models.store");
var definitions_1 = require("./definitions");
var definitions_2 = require("./definitions");
var models_parsers_1 = require("./models.parsers");
var models = express_1.Router();
//var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));
var assessLoanRiskAddress = '';
var appraisePropertyAddress = '';
var oracleContractData;
web3.eth.filter("latest", function (error, result) {
    if (!error) {
        var info = web3.eth.getBlock(result);
        if (info.transactions.length > 0) {
            info.transactions.forEach(function (transactionHash) {
                var transRec = web3.eth.getTransactionReceipt(transactionHash);
                transRec.logs.forEach(function (logElem) {
                    models_store_1.serviceStore.forEach(function (serviceInfo) {
                        if (serviceInfo.address === logElem.address.toString()) {
                            var index = parseInt(logElem.data.toString(), 16);
                            var contractInterface = web3.eth.contract(JSON.parse(serviceInfo.contract[serviceInfo.entryContractName].interface));
                            //console.log("Contract Interface ", contractInterface);
                            var contractInstance = contractInterface.at(logElem.address);
                            var result_1 = contractInstance['reply_callbak'](index, 10, { from: web3.eth.accounts[0], gas: 3000000 }, function (err, result) {
                                if (!err) {
                                    console.log('----------------------------------------------------------------------------------------------');
                                    console.log(serviceInfo.oracleName + " CALLBACK STARTED WITH INDEX " + index);
                                    console.log("CONTRACT ", serviceInfo.address);
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                                else {
                                    console.log('----------------------------------------------------------------------------------------------');
                                    console.log('Error:', err);
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                            });
                        }
                    });
                });
            });
        }
    }
});
var loadOracles = function () {
    var parameters = [new definitions_2.ParameterInfo('uint', 'monthlyRevenue'), new definitions_2.ParameterInfo('uint', 'loadAmount')];
    var Assess_Loan_Risk = new definitions_1.OracleInfo('Assess_Loan_Risk', parameters);
    models_parsers_1.parseOracle(Assess_Loan_Risk);
    var parameters2 = [new definitions_2.ParameterInfo('uint', 'cost')];
    var Appraise_Property = new definitions_1.OracleInfo('Appraise_Property', parameters2);
    models_parsers_1.parseOracle(Appraise_Property);
    models_store_1.serviceStore.set(Appraise_Property.oracleName, Appraise_Property);
    models_store_1.serviceStore.set(Assess_Loan_Risk.oracleName, Assess_Loan_Risk);
    try {
        models_store_1.serviceStore.forEach(function (serviceInfo) {
            var input = {};
            input[serviceInfo.oracleName] = serviceInfo.solidity;
            serviceInfo.contract = solc.compile({ sources: input }, 1).contracts;
        });
    }
    catch (e) {
        console.log(e);
    }
};
var createOracles = function () {
    try {
        loadOracles();
        models_store_1.serviceStore.forEach(function (serviceInfo) {
            Object.keys(serviceInfo.contract).forEach(function (entryContract) {
                console.log('----------------------------------------------------------------------------------------------');
                console.log("STARTING WITH " + entryContract.split(":")[0] + " ORACLE CREATION");
                console.log('----------------------------------------------------------------------------------------------');
                var ProcessContract = web3.eth.contract(JSON.parse(serviceInfo.contract[entryContract].interface));
                ProcessContract.new({ from: web3.eth.accounts[0], data: "0x" + serviceInfo.contract[entryContract].bytecode, gas: 4000000 }, function (err, contract) {
                    if (err) {
                        console.log('error ', err);
                    }
                    else if (contract.address) {
                        models_store_1.serviceStore.get(serviceInfo.oracleName).address = contract.address;
                        models_store_1.serviceStore.get(serviceInfo.oracleName).entryContractName = entryContract;
                        console.log('----------------------------------------------------------------------------------------------');
                        console.log(entryContract.split(":")[0] + " CREATED AT ADDRESS ", contract.address.toString());
                        console.log('----------------------------------------------------------------------------------------------');
                    }
                });
            });
        });
    }
    catch (e) {
        console.log(e);
    }
};
models.post('/services', function (req, res) {
    try {
        createOracles();
    }
    catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});
models.get('/services/:serviceID', function (req, res) {
    var oracleID = req.params.serviceID;
    console.log('----------------------------------------------------------------------------------------------');
    console.log('QUERYING SERVICE INFO: ', oracleID);
    if (models_store_1.serviceStore.has(oracleID)) {
        console.log("CONTRACT NAME: ", models_store_1.serviceStore.get(oracleID).entryContractName);
        console.log("CONTRACT ADDRESS: ", models_store_1.serviceStore.get(oracleID).address);
        console.log("SOLIDITY CODE: ", models_store_1.serviceStore.get(oracleID).solidity);
        console.log('----------------------------------------------------------------------------------------------');
        res.status(200).send(JSON.stringify({ entryContractName: models_store_1.serviceStore.get(oracleID).entryContractName, address: models_store_1.serviceStore.get(oracleID).address, solidity: models_store_1.serviceStore.get(oracleID).solidity }));
    }
    else {
        console.log('----------------------------------------------------------------------------------------------');
        res.status(404).send('Oracle not found');
        console.log('----------------------------------------------------------------------------------------------');
    }
});
models.get('/services', function (req, res) {
    console.log('QUERYING ALL ACTIVE ORACLES');
    var actives = [];
    models_store_1.serviceStore.forEach(function (serviceInfo) {
        console.log({ name: serviceInfo.oracleName, address: serviceInfo.address });
        console.log('----------------------------------------------------------------------------------------------');
        actives.push({ name: serviceInfo.oracleName, address: serviceInfo.address });
    });
    if (actives.length > 0) {
        res.status(200).send(actives);
    }
    else
        res.status(404).send('There are not running oracles');
});
exports.default = models;
//# sourceMappingURL=models.controller.js.map
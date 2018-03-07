import { Router } from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';

import { serviceStore } from './models.store';
import { OracleInfo } from "./definitions";
import { ParameterInfo } from "./definitions";
import { parseOracle } from "./models.parsers";


const models: Router = Router();
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));

var assessLoanRiskAddress = '';
var appraisePropertyAddress = '';
var oracleContractData;

web3.eth.filter("latest", function(error, result) {
  if (!error) {
      var info = web3.eth.getBlock(result);
      if(info.transactions.length > 0) {
          info.transactions.forEach(transactionHash => {                                 
              var transRec = web3.eth.getTransactionReceipt(transactionHash);
              transRec.logs.forEach(logElem => {
                  serviceStore.forEach(serviceInfo => { 
                      if(serviceInfo.address === logElem.address.toString()) {
                        var index = parseInt(logElem.data.toString(), 16);
                        var contractInterface = web3.eth.contract(JSON.parse(serviceInfo.contract[serviceInfo.entryContractName].interface));

                        //console.log("Contract Interface ", contractInterface);
                        
                        var contractInstance = contractInterface.at(logElem.address);
                        let result = contractInstance['reply_callbak'](index, 10, {from: web3.eth.accounts[0], gas: 3000000}, (err, result) => {
                            if (!err) {
                                console.log('----------------------------------------------------------------------------------------------');
                                console.log(`${serviceInfo.oracleName} CALLBACK STARTED WITH INDEX ${index}`);
                                console.log("CONTRACT ", serviceInfo.address);    
                                console.log('----------------------------------------------------------------------------------------------');
                            } else {
                                console.log('----------------------------------------------------------------------------------------------');
                                console.log('Error:', err);
                                console.log('----------------------------------------------------------------------------------------------');
                            }
                        }); 
                      }
                  });
              }) 
          })
      }
  }
});

var loadOracles = () => {
    var parameters = [new ParameterInfo('uint', 'monthlyRevenue'), new ParameterInfo('uint', 'loadAmount')];
    var Assess_Loan_Risk = new OracleInfo('Assess_Loan_Risk', parameters);
    parseOracle(Assess_Loan_Risk);

    var parameters2 = [new ParameterInfo('uint', 'cost')];
    var Appraise_Property = new OracleInfo('Appraise_Property', parameters2);
    parseOracle(Appraise_Property);

    serviceStore.set(Appraise_Property.oracleName, Appraise_Property);
    serviceStore.set(Assess_Loan_Risk.oracleName, Assess_Loan_Risk);

    try { 
        serviceStore.forEach(serviceInfo => {
           var input = {};
           input[serviceInfo.oracleName] = serviceInfo.solidity
           serviceInfo.contract = solc.compile({sources: input}, 1).contracts;
        })        
    } catch (e) {
        console.log(e);
    }
}

var createOracles = (res) => {
    try { 
        loadOracles();
        var count = 0;
        serviceStore.forEach(serviceInfo => {
            Object.keys(serviceInfo.contract).forEach(entryContract => {
                console.log('----------------------------------------------------------------------------------------------');
                console.log(`STARTING WITH ${entryContract.split(":")[0]} ORACLE CREATION`, );
                console.log('----------------------------------------------------------------------------------------------');
                let ProcessContract = web3.eth.contract(JSON.parse(serviceInfo.contract[entryContract].interface));
            ProcessContract.new(
                {from: web3.eth.accounts[0], data: "0x" + serviceInfo.contract[entryContract].bytecode, gas: 4000000},
                (err, contract) => {
                    if (err) {
                        console.log('error ', err);
                    } else if (contract.address) {
                        serviceStore.get(serviceInfo.oracleName).address = contract.address;
                        serviceStore.get(serviceInfo.oracleName).entryContractName = entryContract;
                        console.log('----------------------------------------------------------------------------------------------');
                        console.log(`${entryContract.split(":")[0]} CREATED AT ADDRESS `, contract.address.toString());
                        console.log('----------------------------------------------------------------------------------------------');
                        if (count++ == 2)
                            res.status(201).send("Done");
                    } 
                }
            );
            })
        })
    } catch (e) {
        console.log(e);
    }   
}

models.post('/services', (req, res) => {
    try {
        createOracles(res);
    } catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});

models.get('/services/:serviceID', (req, res) => {
  let oracleID = req.params.serviceID;
  console.log('----------------------------------------------------------------------------------------------');
  console.log('QUERYING SERVICE INFO: ', oracleID);
  if (serviceStore.has(oracleID)) {
      console.log("CONTRACT NAME: ", serviceStore.get(oracleID).entryContractName);
      console.log("CONTRACT ADDRESS: ", serviceStore.get(oracleID).address);
      console.log("SOLIDITY CODE: ", serviceStore.get(oracleID).solidity);
      console.log('----------------------------------------------------------------------------------------------');
      res.status(200).send(JSON.stringify({entryContractName: serviceStore.get(oracleID).entryContractName, address: serviceStore.get(oracleID).address, solidity: serviceStore.get(oracleID).solidity}));
  } else {
      console.log('----------------------------------------------------------------------------------------------');
      res.status(404).send('Oracle not found');
      console.log('----------------------------------------------------------------------------------------------');
  }   
});

models.get('/services', (req, res) => {
  console.log('QUERYING ALL ACTIVE ORACLES');
  var actives = [];
  serviceStore.forEach(serviceInfo => {
      console.log({name: serviceInfo.oracleName, address: serviceInfo.address });
      console.log('----------------------------------------------------------------------------------------------');
      actives.push({name: serviceInfo.oracleName, address: serviceInfo.address })
  });
  if (actives.length > 0 ) {
      res.status(200).send(actives);
  } else
      res.status(404).send('There are not running oracles');
});

export default models;
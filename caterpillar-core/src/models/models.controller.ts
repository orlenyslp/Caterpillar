import { Router } from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';
import * as BigNumber from 'bignumber.js';


import { ModelInfo } from './definitions';
import { parseModel } from './models.parsers';
import { modelStore } from "./models.store";

import { log } from "util";

let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

http.listen(8090, () => {
  console.log('started on port 8090');
});

const models: Router = Router();
const processes: Router = Router();
//var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));

var activityContractMap: Map<string, Array<string>> = new Map();
var runningActivities: Map<string, any> = new Map();        // contract-activity

var validExecution = false;

web3.eth.filter("latest", function(error, result) {
  if (!error) {
      var info = web3.eth.getBlock(result);
      if(info.transactions.length > 0) {
          console.log('----------------------------------------------------------------------------------------------');
          console.log('A NEW BLOCK WAS MINED');
          var updatesInProcess = false;
          var contractsToNotify = [];
          info.transactions.forEach(transactionHash => {
              if(runningActivities.has(transactionHash)) {
                  var activityData = runningActivities.get(transactionHash);
                  var contractsArray = activityContractMap.get(activityData.activity);
                  if(contractsArray.length == 1)
                      activityContractMap.delete(activityData.activity);
                  else
                      contractsArray.splice(contractsArray.indexOf(activityData.contract));
                  runningActivities.delete(transactionHash);
              }
                               
              var transRec = web3.eth.getTransactionReceipt(transactionHash);
              transRec.logs.forEach(logElem => {
                 var contractAddress = logElem.address.toString();
                 if(instances.has(contractAddress)) {
                     var _a = instances.get(contractAddress), contractName = _a[0], modelInfo = _a[1];
                     var elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
                     var controlFlowInfo = modelInfo.controlFlowInfoMap.get(elementName);
                     var nodeId = controlFlowInfo.nodeList[Math.log2(parseInt(logElem.data, 16))];
                     if(nodeId !== undefined) 
                        console.log(`${controlFlowInfo.nodeNameMap.get(nodeId)} COMPLETED IN CONTRACT ${contractAddress}`);
                     else
                        console.log(`MESSAGE ${controlFlowInfo.nodeNameMap.get(nodeId)} RECEIVED FROM CONTRACT ${contractAddress}`);
                     updatesInProcess = true;
                 }
                 if(workListInstances.has(contractAddress)) {
                     var realContractAddress = workListInstances.get(contractAddress);
                     var _a = instances.get(realContractAddress), contractName = _a[0], modelInfo = _a[1];
                     var elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
                     var controlFlowInfo = modelInfo.controlFlowInfoMap.get(elementName);
                     var nodeId = controlFlowInfo.nodeList[Math.log2(parseInt(logElem.data, 16))];
                     if(nodeId !== undefined) 
                        console.log(`${controlFlowInfo.nodeNameMap.get(nodeId)} IS ENABLED IN CONTRACT ${realContractAddress}`);
                     updatesInProcess = true;
                 }
              })
              console.log('----------------------------------------------------------------------------------------------');
      })
        
       if(updatesInProcess) {
           console.log('----------------------------------------------------------------------------------------------');
           console.log("Message sent through socket running on port 8090");
           console.log('----------------------------------------------------------------------------------------------');
           io.emit('message', {type:'new-message', text: "Updates in Server"});

       }
             
      } 
  }
});

var httpAcc = require('http');

var assesLoanRiskInfo;
var apprisePropertyInfo;
var oracleAddresses: Map<string, string> = new Map();

var getAssesLoadInfo = () => new Promise( (resolve, reject) => {
    try {
        httpAcc.get({ hostname: 'localhost', port: 3010, path: '/services/Assess_Loan_Risk' }, (res) => {
            res.setEncoding('utf8');
            res.on('data', function (data) {
                assesLoanRiskInfo = JSON.parse(data);
                oracleAddresses.set('Assess_Loan_Risk', assesLoanRiskInfo.address);
                resolve(assesLoanRiskInfo);
            });
        });
    } catch (e) {
        console.log("ORACLE NOT FOUND");
    }
})
var getAppraisePropertyInfo = () => new Promise( (resolve, reject) => {
    try {
        httpAcc.get({ hostname: 'localhost', port: 3010, path: '/services/Appraise_Property' }, (res) => {
            res.setEncoding('utf8');
            res.on('data', function (data) {
                apprisePropertyInfo = JSON.parse(data);
                oracleAddresses.set('Appraise_Property', apprisePropertyInfo.address);
                resolve(apprisePropertyInfo);
            });
        });
    } catch (e) {
        console.log("ORACLE NOT FOUND");
    }
})

models.post('/models', (req, res, next) => {
    let modelInfo:ModelInfo = req.body as ModelInfo;
    getAssesLoadInfo().then(() => {
        getAppraisePropertyInfo().then(() => {
            try {
                let cont = parseModel(modelInfo, oracleAddresses);
                cont.then( () => {
            
                let input = {};
                input['Assess_Loan_Risk'] = assesLoanRiskInfo.solidity;
                input['Appraise_Property'] = apprisePropertyInfo.solidity;
                input[modelInfo.name] = modelInfo.solidity;

                let activityNames = [];
                modelInfo.controlFlowInfoMap.forEach( (controlFlowInfo, contractName, map) => {
                    controlFlowInfo.callActivities.forEach( (activityName, activityId, map2) => {
                    activityNames.push(activityName);
                    });
                });
                activityNames.forEach( activityName => {
                    if (!modelStore.has(activityName)) {
                    res.status(404).send(`ERROR: Process model '${activityName}' not found`);
                    return;
                    }
                    input[activityName] = modelStore.get(activityName).solidity;

                });              

                console.log('=============================================');
                console.log("SOLIDITY CODE");
                console.log('=============================================');
                Object.keys(input).forEach( key => {
                    console.log(input[key]);
                })
                console.log('----------------------------------------------------------------------------------------------');

                let output = solc.compile({sources: input}, 1);
                console.log('CONTRACTS');
                Object.keys(output.contracts).forEach(key => {
                    console.log(key);
                })
               
                modelInfo.contracts = output.contracts;

                modelStore.set(modelInfo.name, modelInfo);
                res.status(201).send(modelInfo);
                console.log('PROCESSED SUCCESSFULLY');
                console.log('----------------------------------------------------------------------------------------------');

            });

            } catch (e) {
            console.log("Error: ", e);
            res.status(400).send(e);
            }
        });
    });
});


let instances: Map<string, [string, ModelInfo]> = new Map();
let workListInstances: Map<string, string> = new Map();
let workListRealAddress: Map<string, any> = new Map();
let globalControlFlowInfo;

var computeActivation = function (contractAddress) {
    var _a = instances.get(contractAddress), contractName = _a[0], modelInfo = _a[1];
    var contract = web3.eth.contract(JSON.parse(modelInfo.contracts[contractName].interface));
    var elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
    var controlFlowInfo = modelInfo.controlFlowInfoMap.get(elementName);
    var nodeList = controlFlowInfo.nodeList;
    var instance = contract.at(contractAddress);
    var workListAddress = instance.getWorkListAddress.call();

    var activation = instance.getStartedFlowNodes.call();
    var activationAsString = activation.toString(2).split('').reverse();
    var workItemList = [];
    var externalItemGroupList = [];
    var addresses = instance.getSubprocessAddresses ? instance.getSubprocessAddresses.call() : 0;
    
    for (var index = 0; index < activationAsString.length; index++)
        if (activationAsString[index] === '1') {
          let nodeId = controlFlowInfo.nodeList[index];
          if(controlFlowInfo.activeMessages.indexOf(nodeId) >= 0) {
              var messageActivation = instance.getEnabledMessages.call().toString(2).split('').reverse();
              if(messageActivation[index] == 1) {
                  workItemList.push({
                    elementId: nodeId,
                    hrefs: [`/workitems/${workListAddress}/${controlFlowInfo.nodeNameMap.get(nodeId)}`]});
              }
          }
          if (controlFlowInfo.multiinstanceActivities.has(nodeId)) {
              if (controlFlowInfo.childSubprocesses.has(nodeId)) {
                    var mask = instance.getInstances.call(1 << index); // TODO: Should be a bignumber?
                    var maskAsString = mask.toString(2).split('').reverse();
                    for (var iindex = 0; iindex < maskAsString.length; iindex++)
                        if (maskAsString[iindex] === '1') {
                            var addr = addresses[iindex].toString();
                            var subprocessContractName = controlFlowInfo.childSubprocesses.get(nodeId);
                            instances.set(addr, [subprocessContractName, modelInfo]);

                            let [nestedWorkItemList, nestedExternalItemGroupList, nestedControlFlowInfo] = computeActivation(addr);

                            nestedWorkItemList.forEach( workItem => {
                                let originalWorkItem = workItemList.find( witem => witem.elementId === workItem.elementId );
                                if (!originalWorkItem) {
                                    originalWorkItem = {elementId: workItem.elementId, hrefs: []};
                                    workItemList.push(originalWorkItem);
                                }
                                originalWorkItem.hrefs = originalWorkItem.hrefs.concat(workItem.hrefs);
                            });
                            nestedExternalItemGroupList.forEach( externalItemGroup => {
                                let originalExternalItemGroup = externalItemGroupList.find( eitem => eitem.elementId === externalItemGroup.elementId );
                                if (!originalExternalItemGroup) {
                                    originalExternalItemGroup = {elementId: externalItemGroup.elementId, hrefs: []};
                                    externalItemGroupList.push(originalExternalItemGroup);
                                }
                                originalExternalItemGroup.hrefs = originalExternalItemGroup.hrefs.concat(externalItemGroup.hrefs);
                            });
                        }
              } else {
                let mask = instance.getInstances.call(1 << index); // TODO: Should be bignumber?
                let maskAsString = mask.toString(2).split('').reverse();
                let hrefList = [];
                for (var iindex = 0; iindex < maskAsString.length; iindex++)
                    if (maskAsString[iindex] === '1') {
                    let addr = addresses[iindex].toString();
                    let functionName = controlFlowInfo.nodeNameMap.get(nodeId);
                    instances.set(addr, [controlFlowInfo.multiinstanceActivities.get(nodeId), modelInfo]);
                    var reqIds = instance.getTaskRequestIndex.call(1 << index).toString(2).split('').reverse();
                    for(let i = 0; i < reqIds.length; i++) {
                        hrefList.push(`/workitems/${workListAddress}/${reqIds[i]}`);
                    }
                }
                workItemList.push({elementId: nodeId, hrefs: hrefList});
              }
          } else if (controlFlowInfo.nonInterruptingEvents.has(nodeId)) {
                    var mask = instance.getInstances.call(1 << index); // TODO: Should be a bignumber?
                    var maskAsString = mask.toString(2).split('').reverse();
                    for (var iindex = 0; iindex < maskAsString.length; iindex++)
                        if (maskAsString[iindex] === '1') {
                            var addr = addresses[iindex].toString();
                            var subprocessContractName = controlFlowInfo.nonInterruptingEvents.get(nodeId);
                            instances.set(addr, [subprocessContractName, modelInfo]);

                            let [nestedWorkItemList, nestedExternalItemGroupList] = computeActivation(addr);

                            nestedWorkItemList.forEach( workItem => {
                                let originalWorkItem = workItemList.find( witem => witem.elementId === workItem.elementId );
                                if (!originalWorkItem) {
                                    originalWorkItem = {elementId: workItem.elementId, hrefs: []};
                                    workItemList.push(originalWorkItem);
                                }
                                originalWorkItem.hrefs = originalWorkItem.hrefs.concat(workItem.hrefs);
                            });
                            nestedExternalItemGroupList.forEach( externalItemGroup => {
                                let originalExternalItemGroup = externalItemGroupList.find( eitem => eitem.elementId === externalItemGroup.elementId );
                                if (!originalExternalItemGroup) {
                                    originalExternalItemGroup = {elementId: externalItemGroup.elementId, hrefs: []};
                                    externalItemGroupList.push(originalExternalItemGroup);
                                }
                                originalExternalItemGroup.hrefs = originalExternalItemGroup.hrefs.concat(externalItemGroup.hrefs);
                            });
                        }
              } else if (controlFlowInfo.callActivities.has(nodeId)) {
              let mask = instance.getInstances.call(1 << index); // TODO: Should be a bignumber?
              let maskAsString = mask.toString(2).split('').reverse();
              let hrefList = [];
              for (var iindex = 0; iindex < maskAsString.length; iindex++)
                  if (maskAsString[iindex] === '1') {
                      let addr = addresses[iindex].toString();
                      let subprocessModelName = controlFlowInfo.nodeNameMap.get(nodeId);
                      let subprocessModelInfo = modelStore.get(subprocessModelName);
                      instances.set(addr, [subprocessModelInfo.entryContractName, subprocessModelInfo]);
                      
                      var _ma = instances.get(addresses[iindex]), mContractName = _ma[0], mModelInfo = _ma[1];
                      var mContract = web3.eth.contract(JSON.parse(mModelInfo.contracts[mContractName].interface));
                      var mInstance = contract.at(addresses[iindex]);
                      var mWorkListAddress = mInstance.getWorkListAddress.call().toString();
                      if(!workListInstances.has(mWorkListAddress)) {
                          workListInstances.set(mWorkListAddress, addr);
                          workListRealAddress.set(mWorkListAddress, mInstance.getWorkListAddress.call());
                      }
                      hrefList.push(`/models/${subprocessModelName}/processes/${addr}`);
                  }
            externalItemGroupList.push({elementId: nodeId, hrefs: hrefList});
          } else {
              var reqIds = instance.getTaskRequestIndex.call(1 << index).toString(2).split('').reverse();
              for(let i = 0; i < reqIds.length; i++) {
                  validExecution = true;
                  if(reqIds[i] === '1'){
                        workItemList.push({
                        elementId: nodeId,
                        processAddress: contractAddress,
                        hrefs: [`/workitems/${workListAddress}/${i}`]});
                    }
                  }

          }
        }
    globalControlFlowInfo = controlFlowInfo;
    return [workItemList, externalItemGroupList];
};

var getExtendedList = function(originalList) {
    var extendedWorkItemList = [];
    originalList.forEach(workItem => {
        var nextStatus = [];
        workItem.hrefs.forEach(href => {
            if(activityContractMap.has(workItem.elementId) && activityContractMap.get(workItem.elementId).indexOf(workItem.contractAddress) >= 0)
                nextStatus.push('started');
            else
               nextStatus.push('enabled');
        })
        var inputParams = [];
        if(globalControlFlowInfo.localParameters.has(workItem.elementId)) {
            globalControlFlowInfo.localParameters.get(workItem.elementId).forEach(input => {
                inputParams.push({type: input.type, name: input.name});
            })
        }
        extendedWorkItemList.push({elementId: workItem.elementId, input: inputParams, status: nextStatus, hrefs: workItem.hrefs});
    })
    return extendedWorkItemList;
};

var computeExtendedActivation = function(contractAddress) {
    let [workItemList, externalItemGroupList] = computeActivation(contractAddress);
    return [getExtendedList(workItemList), getExtendedList(externalItemGroupList)];    
}

models.post('/models/:modelId', (req, res) => {
  if (modelStore.has(req.params.modelId)) {
    let modelInfo = modelStore.get(req.params.modelId);
    let entryContract = modelInfo.entryContractName;
    console.log('----------------------------------------------------------------------------------------------');
    console.log("TRYING TO CREATE INSTANCE OF CONTRACT: ", entryContract);
    let ProcessContract = web3.eth.contract(JSON.parse(modelInfo.contracts[entryContract].interface));
    ProcessContract.new(
        {from: web3.eth.accounts[0], data: "0x" + modelInfo.contracts[entryContract].bytecode, gas: 4000000},
        (err, contract) => {
            if (err) {
              console.log('error ', err);
              res.status(404).send('ERROR: Contract could not be instantiated');
            } else if (contract.address) {
                instances.set(contract.address.toString(), [modelInfo.entryContractName, modelInfo]);
                var workListAdr = contract.getWorkListAddress.call().toString();
                workListInstances.set(workListAdr, contract.address.toString());
                workListRealAddress.set(workListAdr, contract.getWorkListAddress.call());
                console.log('CONTRACT CREATED !!! AT ADDRESS: ', contract.address.toString());
                console.log('WORKITEMS ADDRESS: ', contract.getWorkListAddress.call());
                console.log('----------------------------------------------------------------------------------------------');
                res.status(201).send({address: contract.address})
            }
        }
    );
  } else
    res.status(404).send('Process model not found');
});

models.get('/processes/:procId', (req, res) => {
  let contractAddress = req.params.procId;
  console.log('----------------------------------------------------------------------------------------------');
  console.log('QUERYING ACTIVATION FOR CONTRACT:', contractAddress);
  if (instances.has(contractAddress)) {
    let [workItemList, externalItemGroupList] = computeExtendedActivation(contractAddress);
    let [contractName, modelInfo] = instances.get(contractAddress);
    console.log("CHECKING ENABLED USER TASKS ", workItemList.length == 0 ? "Empty" : "..........");
    workItemList.forEach(elem => {
        console.log("Element ID: ", elem.elementId);
        console.log("Input Parameters: ", elem.input);
        console.log("Status: ", elem.status);
        console.log("hrefs: ", elem.hrefs);
    })
    //console.log('External Item Groups:', externalItemGroupList);
    console.log('----------------------------------------------------------------------------------------------');
    res.status(200).send({ bpmn: modelInfo.bpmn, workItems: workItemList, externalItemGroupList: externalItemGroupList });
  } else
    res.status(404).send('Process instance not found');
});

models.post('/workitems/:workListAddress/:reqId', (req, res) => {
  let workListAddress = req.params.workListAddress;
  let reqId = req.params.reqId;
  let activityId = req.body.elementId;
  let inputParams = req.body.inputParameters;
  var realParameters = inputParams.length > 0 ? [reqId].concat(inputParams) : [reqId];
  if (validExecution && workListInstances.has(workListAddress) && instances.has(workListInstances.get(workListAddress))) {
    validExecution = false;
    let [contractName, modelInfo] = instances.get(workListInstances.get(workListAddress));
    let elementName = contractName.slice(contractName.indexOf(':')+1, contractName.indexOf('_Contract'));
    let activityName = modelInfo.controlFlowInfoMap.get(elementName).nodeNameMap.get(req.body.elementId);
    console.log('----------------------------------------------------------------------------------------------');
    console.log(`WANT TO FIRE Task: ${activityName}, ON WORKITEM: ${workListAddress}`);
    let result;
    if(modelInfo.controlFlowInfoMap.get(elementName).activeMessages.indexOf(activityId) >= 0) {
       let contract = web3.eth.contract(JSON.parse(modelInfo.contracts[contractName].interface));
       let instance = contract.at(workListInstances.get(workListAddress));      
       result = instance[activityName].apply(this, [reqId].concat(inputParams.concat({from: web3.eth.accounts[0], gas: 3000000})));
    } else {
        let contract = web3.eth.contract(JSON.parse(modelInfo.contracts[contractName.slice(0, contractName.indexOf('_Contract')) + "_WorkList"].interface));
        let instance = contract.at(workListRealAddress.get(workListAddress));
        if(!modelInfo.controlFlowInfoMap.get(elementName).localParameters.has(activityId) || modelInfo.controlFlowInfoMap.get(elementName).localParameters.get(activityId).length == 0)
            activityName = 'DefaultTask';
        result = instance[activityName + '_callback'].apply(this, realParameters.concat({from: web3.eth.accounts[0], gas: 3000000}));
    } 
    if(!activityContractMap.has(activityId) || activityContractMap.get(activityId).indexOf(workListAddress) < 0) {
        runningActivities.set(result, {activity: req.body.elementId, contract: workListAddress});
        if (!activityContractMap.has(activityId))
            activityContractMap.set(activityId, []);
        activityContractMap.get(activityId).push(workListAddress);
    }
    console.log(`TRANSACTION: ${result}, PENDING !!!`);
    console.log('----------------------------------------------------------------------------------------------');
 }
    //console.log('BUT ELEMENT NO FOUND FOR THAT REQUEST');
 
});


export default models;
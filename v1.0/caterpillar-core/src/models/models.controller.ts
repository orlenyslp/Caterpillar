import { workers } from 'cluster';
import { Router } from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';
import * as BigNumber from 'bignumber.js';


import { ModelInfo } from './definitions';
import { parseModel } from './models.parsers';
import { modelStore } from './models.store';

import { log } from "util";

let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

http.listen(8090, () => {
    console.log('started on port 8090');
});

const models: Router = Router();
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));

var activityContractMap: Map<string, Array<string>> = new Map();
var runningActivities: Map<string, any> = new Map();        // contract-activity
var enabledTasks: Map<string, any> = new Map();

var validExecution = false;

web3.eth.filter("latest", function (error, result) {
    if (!error) {
        var info = web3.eth.getBlock(result);
        if (info.transactions.length > 0) {
            console.log('----------------------------------------------------------------------------------------------');
            console.log('NEW BLOCK MINED');
            var updatesInProcess = false;
            var contractsToNotify = [];
            info.transactions.forEach(transactionHash => {
                if (runningActivities.has(transactionHash)) {
                    var activityData = runningActivities.get(transactionHash);
                    var contractsArray = activityContractMap.get(activityData.activity);
                    if (contractsArray.length == 1)
                        activityContractMap.delete(activityData.activity);
                    else
                        contractsArray.splice(contractsArray.indexOf(activityData.contract));
                    runningActivities.delete(transactionHash);
                }

                var transRec = web3.eth.getTransactionReceipt(transactionHash);
                transRec.logs.forEach(logElem => {
                    var contractAddress = logElem.address.toString();
                    if (instances.has(contractAddress)) {
                        var _a = instances.get(contractAddress), contractName = _a[0], modelInfo = _a[1];
                        var elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
                        var controlFlowInfo = modelInfo.controlFlowInfoMap.get(elementName);
                        var nodeId = controlFlowInfo.nodeList[Math.log2(parseInt(logElem.data, 16))];
                        if (nodeId !== undefined) {
                            console.log(`${controlFlowInfo.nodeNameMap.get(nodeId)} COMPLETED IN CONTRACT ${contractAddress}`);
                            updatesInProcess = true;
                        } else
                            console.log(`MESSAGE RECEIVED FROM CONTRACT ${contractAddress}`);
                    }
                    if (workListInstances.has(contractAddress)) {
                        var realContractAddress = workListInstances.get(contractAddress);
                        var _a = instances.get(realContractAddress), contractName = _a[0], modelInfo = _a[1];
                        var elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
                        var controlFlowInfo = modelInfo.controlFlowInfoMap.get(elementName);
                        var nodeId = controlFlowInfo.nodeList[Math.log2(parseInt(logElem.data, 16))];
                        if (nodeId !== undefined) {
                            console.log(`${controlFlowInfo.nodeNameMap.get(nodeId)} IS ENABLED IN CONTRACT ${realContractAddress}`);
                            updatesInProcess = true;
                        }
                    }
                })
                console.log('----------------------------------------------------------------------------------------------');
            })

            if (updatesInProcess) {
                console.log('----------------------------------------------------------------------------------------------');
                console.log("Message sent through socket running on port 8090");
                console.log('----------------------------------------------------------------------------------------------');
                io.emit('message', { type: 'new-message', text: "Updates in Server" });
            }

        }
    }
});

models.get('/processes', (req, res, next) => {
    console.log('QUERYING ALL ACTIVE CONTRACTS');
    var actives = [];
    instances.forEach((dataList, addr, map) => {
        console.log({ id: dataList[1].name, name: dataList[1].entryContractName, contractName: dataList[0], address: addr });
        actives.push({ id: dataList[1].name, name: dataList[1].entryContractName, contractName: dataList[0], address: addr });
    });
    console.log('----------------------------------------------------------------------------------------------');
    if (actives.length > 0) {
        res.status(200).send(actives);
    } else {
        console.log('No Contracts Available');
        res.status(200).send([]);
    }
});

models.get('/models', (req, res, next) => {
    console.log('QUERING REGISTERED MODELS');
    var actives = [];
    modelStore.forEach((modelInfo, modelId, map) => {
        console.log(modelInfo.entryContractName);
        actives.push({id: modelId, name: modelInfo.entryContractName, bpmn: modelInfo.bpmn, solidity: modelInfo.solidity});
    });
    console.log('----------------------------------------------------------------------------------------------');
    res.send(actives);
});

models.post('/models', (req, res, next) => {
    let modelInfo: ModelInfo = req.body as ModelInfo;
    try {
        let cont = parseModel(modelInfo);
        cont.then(() => {

            let input = {};
            input[modelInfo.name] = modelInfo.solidity;

            let activityNames = [];
            modelInfo.controlFlowInfoMap.forEach((controlFlowInfo, contractName, map) => {
                controlFlowInfo.callActivities.forEach((activityName, activityId, map2) => {
                    activityNames.push(activityName);
                });
            });
            activityNames.forEach(activityName => {
                if (!modelStore.has(activityName)) {
                    res.status(404).send(`ERROR: Process model '${activityName}' not found`);
                    return;
                }
                input[activityName] = modelStore.get(activityName).solidity;

            });

            console.log('=============================================');
            console.log("SOLIDITY CODE");
            console.log('=============================================');
            Object.keys(input).forEach(key => {
                console.log(input[key]);
            })
            console.log('----------------------------------------------------------------------------------------------');

            let output = solc.compile({ sources: input }, 1);
            if (Object.keys(output.contracts).length === 0) {
                res.status(400).send('COMPILATION ERROR IN SMART CONTRACTS');
                console.log('COMPILATION ERROR IN SMART CONTRACTS');
                console.log('----------------------------------------------------------------------------------------------');
                return;
            }

            console.log('CONTRACTS');
            Object.keys(output.contracts).forEach(key => {
                console.log(key);
            })
            modelInfo.contracts = output.contracts;
            modelStore.set(modelInfo.name, modelInfo);
            res.status(201).send({ id: modelInfo.name,
                                   name: modelInfo.entryContractName, 
                                   bpmn: modelInfo.bpmn, 
                                   solidity: modelInfo.solidity });
            console.log('PROCESSED SUCCESSFULLY');
            console.log('----------------------------------------------------------------------------------------------');
        });

    } catch (e) {
        console.log("Error: ", e);
        res.status(400).send(e);
    }
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
    var workListAddress = instance.getWorkListAddress.call();     // worklistAddress

    var activation = instance.getStartedFlowNodes.call();
    var activationAsString = activation.toString(2).split('').reverse();
    var workItemList = [];
    var externalItemGroupList = [];
    var addresses = instance.getSubprocessAddresses ? instance.getSubprocessAddresses.call() : 0;

    var mWorkListAddress = workListAddress.toString();
    if (!workListInstances.has(mWorkListAddress)) {
        workListInstances.set(mWorkListAddress, contractAddress.toString());
        workListRealAddress.set(mWorkListAddress, workListAddress);
    }

    for (var index = 0; index < activationAsString.length; index++)
        if (activationAsString[index] === '1') {
            let nodeId = controlFlowInfo.nodeList[index];
            if (controlFlowInfo.activeMessages.indexOf(nodeId) >= 0) {
                var reqIds = instance.getTaskRequestIndex.call(1 << index).toString(2).split('').reverse();
                for (let i = 0; i < reqIds.length; i++) {
                    validExecution = true;
                    if (reqIds[i] === '1') {
                        workItemList.push({
                            elementId: nodeId,
                            processAddress: contractAddress,
                            hrefs: [`/workitems/${workListAddress}/${i}`]
                        });
                    }
                }
            }
            let nestedSubprocesses = new Map<string, string>();
            if (controlFlowInfo.nonInterruptingEvents.has(nodeId))
                nestedSubprocesses = controlFlowInfo.nonInterruptingEvents;
            else if (controlFlowInfo.multiinstanceActivities.has(nodeId) && controlFlowInfo.childSubprocesses.has(nodeId))
                nestedSubprocesses = controlFlowInfo.childSubprocesses;
            if (nestedSubprocesses.size > 0) {
                var mask = instance.getInstances.call(1 << index);      // TODO: Should be a bignumber?
                var maskAsString = mask.toString(2).split('').reverse();
                for (var iindex = 0; iindex < maskAsString.length; iindex++)
                    if (maskAsString[iindex] === '1') {
                        var addr = addresses[iindex].toString();
                        var subprocessContractName = nestedSubprocesses.get(nodeId);
                        instances.set(addr, [subprocessContractName, modelInfo]);

                        let [nestedWorkItemList, nestedExternalItemGroupList] = computeActivation(addr);

                        nestedWorkItemList.forEach(workItem => {
                            let originalWorkItem = workItemList.find(witem => witem.elementId === workItem.elementId);
                            if (!originalWorkItem) {
                                originalWorkItem = { elementId: workItem.elementId, hrefs: [] };
                                workItemList.push(originalWorkItem);
                            }
                            originalWorkItem.hrefs = originalWorkItem.hrefs.concat(workItem.hrefs);
                        });
                        nestedExternalItemGroupList.forEach(externalItemGroup => {
                            let originalExternalItemGroup = externalItemGroupList.find(eitem => eitem.elementId === externalItemGroup.elementId);
                            if (!originalExternalItemGroup) {
                                originalExternalItemGroup = { elementId: externalItemGroup.elementId, hrefs: [] };
                                externalItemGroupList.push(originalExternalItemGroup);
                            }
                            originalExternalItemGroup.hrefs = originalExternalItemGroup.hrefs.concat(externalItemGroup.hrefs);
                        });
                    }
                // verificar si es aquí donde tengo que adicionar la dirección del worklist que se crea internamente
            }
            else if (controlFlowInfo.multiinstanceActivities.has(nodeId)) {
                let mask = instance.getInstances.call(1 << index);    // TODO: Should be bignumber?
                let maskAsString = mask.toString(2).split('').reverse();
                let hrefList = [];
                for (var iindex = 0; iindex < maskAsString.length; iindex++)
                    if (maskAsString[iindex] === '1') {
                        let addr = addresses[iindex].toString();
                        let functionName = controlFlowInfo.nodeNameMap.get(nodeId);
                        instances.set(addr, [controlFlowInfo.multiinstanceActivities.get(nodeId), modelInfo]);
                        var reqIds = instance.getTaskRequestIndex.call(1 << index).toString(2).split('').reverse();
                        for (let i = 0; i < reqIds.length; i++) {
                            if (reqIds[i] === '1')
                                hrefList.push(`/workitems/${workListAddress}/${i}`);
                        }
                    }
                workItemList.push({ elementId: nodeId, hrefs: hrefList });
            }
            else if (controlFlowInfo.callActivities.has(nodeId)) {
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
                        if (!workListInstances.has(mWorkListAddress)) {
                            workListInstances.set(mWorkListAddress, addr);
                            workListRealAddress.set(mWorkListAddress, mInstance.getWorkListAddress.call());
                        }
                        hrefList.push(`${addr}`);
                    }
                externalItemGroupList.push({ elementId: nodeId, hrefs: hrefList });
            } else {
                var reqIds = instance.getTaskRequestIndex.call(1 << index).toString(2).split('').reverse();

                for (let i = 0; i < reqIds.length; i++) {
                    validExecution = true;
                    if (reqIds[i] === '1') {
                        workItemList.push({
                            elementId: nodeId,
                            processAddress: contractAddress,
                            hrefs: [`/workitems/${workListAddress}/${i}`]
                        });
                    }
                }

            }
        }
    activation = instance.getRunningFlowNodes.call();
    activationAsString = activation.toString(2).split('').reverse();
    for (var index = 0; index < activationAsString.length; index++)
        if (activationAsString[index] === '1') {
            let nodeId = controlFlowInfo.nodeList[index];
            workItemList.push({
                elementId: nodeId,
                processAddress: contractAddress,
                hrefs: []
            });

        }
    globalControlFlowInfo = controlFlowInfo;
    return [workItemList, externalItemGroupList];
};

var getExtendedList = function (originalList) {
    var extendedWorkItemList = [];
    originalList.forEach(workItem => {
        var nextStatus = workItem.hrefs.length == 0 ? ['running'] : [];
        workItem.hrefs.forEach(href => {
            nextStatus.push('started');
        })
        var inputParams = [];
        if (globalControlFlowInfo.localParameters.has(workItem.elementId)) {
            globalControlFlowInfo.localParameters.get(workItem.elementId).forEach(input => {
                inputParams.push({ type: input.type, name: input.name });
            })
        }
        extendedWorkItemList.push({ elementId: workItem.elementId, input: inputParams, status: nextStatus, hrefs: workItem.hrefs });
    })
    return extendedWorkItemList;
};

var computeExtendedActivation = function (contractAddress) {
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
            { from: web3.eth.accounts[0], data: "0x" + modelInfo.contracts[entryContract].bytecode, gas: 4700000 },
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
                    res.status(201).send({ address: contract.address })
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
        enabledTasks = new Map();
        let [workItemList, externalItemGroupList] = computeExtendedActivation(contractAddress);
        console.log("External ", externalItemGroupList);
        let [contractName, modelInfo] = instances.get(contractAddress);
        console.log("CHECKING STARTED ELEMENTS ", workItemList.length == 0 && externalItemGroupList.length == 0 ? "Empty" : "..........");
        let toDraw = workItemList.concat(externalItemGroupList) 
        toDraw.forEach(elem => {
            enabledTasks.set(elem.elementId, contractAddress);
            console.log("Element ID: ", elem.elementId);
            console.log("Input Parameters: ", elem.input);
            console.log("Status: ", elem.status);
            console.log("hrefs: ", elem.hrefs);
            console.log("...............................................................")
        })
        if (workItemList.length == 0 && externalItemGroupList.length == 0) {
            if (instances.has(contractAddress)) {
                instances.delete(contractAddress);
                workListInstances.forEach((procAddr, workListAddr, map) => {
                    if (procAddr === contractAddress) {
                        workListInstances.delete(workListAddr);
                        workListRealAddress.delete(workListAddr);
                    }
                })
            }
        }
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
    if (validExecution && enabledTasks.has(activityId) && workListInstances.has(workListAddress) && instances.has(workListInstances.get(workListAddress))) {
        validExecution = false;
        let [contractName, modelInfo] = instances.get(workListInstances.get(workListAddress));
        let elementName = contractName.slice(contractName.indexOf(':') + 1, contractName.indexOf('_Contract'));
        let activityName = modelInfo.controlFlowInfoMap.get(elementName).nodeNameMap.get(req.body.elementId);
        console.log('----------------------------------------------------------------------------------------------');
        console.log(`WANT TO FIRE Task: ${activityName}, ON WORKITEM: ${workListAddress}`);
        let result;
        let contract = web3.eth.contract(JSON.parse(modelInfo.contracts[contractName.slice(0, contractName.indexOf('_Contract')) + "_WorkList"].interface));
        let instance = contract.at(workListRealAddress.get(workListAddress));
        if (!modelInfo.controlFlowInfoMap.get(elementName).localParameters.has(activityId) || modelInfo.controlFlowInfoMap.get(elementName).localParameters.get(activityId).length == 0)
            activityName = 'DefaultTask';
        result = instance[activityName + '_callback'].apply(this, realParameters.concat({ from: web3.eth.accounts[1], gas: 4700000 }));
        if (!activityContractMap.has(activityId) || activityContractMap.get(activityId).indexOf(workListAddress) < 0) {
            runningActivities.set(result, { activity: req.body.elementId, contract: workListAddress });
            if (!activityContractMap.has(activityId))
                activityContractMap.set(activityId, []);
            activityContractMap.get(activityId).push(workListAddress);
        }
        console.log(`TRANSACTION: ${result}, PENDING !!!`);
        console.log('----------------------------------------------------------------------------------------------');
        res.status(201).send(result);
    } else
        res.status(404).send('Invalid Execution');
});


export default models;
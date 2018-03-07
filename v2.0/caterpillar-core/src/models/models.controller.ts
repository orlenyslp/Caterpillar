
import {Router} from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';

import {ModelInfo} from './definitions';
import {parseModel} from './models.parsers';
import {repoSchema} from '../repo/procModelData'
// import * as mongoose from 'mongoose';

// let app = require('express')();
// let http = require('http').Server(app);

// let io = require('socket.io')(http);
// let ObjectId = mongoose.Types.ObjectId;

/* http.listen(8090, () => {
    console.log('started on port 8090');
}); */

const fs = require('fs');

const models: Router = Router();
let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
// var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));

const WebSocket = require('ws');
let mws;
const wss = new WebSocket.Server({port: 8090});
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });
    mws = ws;
});

web3.eth.filter("latest", function (error, result) {
    if (!error) {
        let info = web3.eth.getBlock(result);
        if (info.transactions.length > 0) {
            //  console.log('----------------------------------------------------------------------------------------------');
            //  console.log('NEW BLOCK MINED');
            let toNotify = [];
            info.transactions.forEach(transactionHash => {
                // console.log("TRANSACTION ", transRec);
                let transRec = web3.eth.getTransactionReceipt(transactionHash);
                transRec.logs.forEach(logElem => {
                    if (workListInstances.has(logElem.address) && toNotify.indexOf(logElem.address) < 0) {
                        //console.log("LOG ELEMENT ", logElem);
                        //console.log('WorkList', workListInstances);
                        toNotify.push(workListInstances.get(logElem.address));
                    }
                })
                //console.log('----------------------------------------------------------------------------------------------');
            });
            if (toNotify.length > 0) {
                //console.log("Message sent through socket running on port 8080");
                toNotify.forEach(add => {
                    if (mws)
                        mws.send(add);
                });
                //io.emit('message', { type: 'new-message', text: "Updates in Server" });
            } else {
                //console.log("Nothing to notify");
            }

        }
    }
});

let workListInstances: Map<string, string> = new Map();

let processRegistryContract: any;

// Querying for every contract all the created instances

models.get('/processes', (req, res) => {
    console.log('QUERYING ALL ACTIVE CONTRACTS');
    let actives = [];
    let registeredInstances = processRegistryContract.allInstances.call();
    registeredInstances.forEach(instance => {
        let repoID = web3.toAscii(processRegistryContract.bundleFor.call(instance)).toString().substr(0, 24);
        repoSchema.find({_id: repoID},
            (err, repoData) => {
                if (err) {
                    res.status(404).send([]);
                    return;
                } else {
                  if(repoData.length > 0) {
                    console.log({id: repoID, name: repoData[0].rootProcessName, address: instance});
                    actives.push({id: repoID, name: repoData[0].rootProcessName, address: instance});
                    if (actives.length === registeredInstances.length) {
                        res.status(200).send(actives);
                        return;
                    }
                  }
                }
            })
    })
});

// Querying all registered (root) process in the repository

models.get('/models', (req, res) => {
    console.log('QUERYING REGISTERED MODELS');
    let actives = [];
    repoSchema.find({'bpmnModel': {$ne: 'empty'}},
        (err, repoData) => {
            if (err)
                res.send([]);
            else {
                repoData.forEach(data => {
                    console.log(data.rootProcessName);
                    actives.push({
                        id: data._id,
                        name: data.rootProcessName,
                        bpmn: data.bpmnModel,
                        solidity: data.solidityCode
                    })
                });
                console.log('----------------------------------------------------------------------------------------------');
                res.send(actives);
            }
        });
});

// Deploying new model (updating registry and repository)

models.post('/models', (req, res) => {
    console.log('DEPLOYING MODEL ...');
    let modelInfo: ModelInfo = req.body as ModelInfo;
    try {
        let cont = parseModel(modelInfo);
        cont.then(() => {

            let input = {
                'AbstractFactory': fs.readFileSync('./src/models/abstract/AbstractFactory.sol', 'utf8'),
                'ProcessRegistry': fs.readFileSync('./src/models/abstract/ProcessRegistry.sol', 'utf8'),
                'AbstractProcess': fs.readFileSync('./src/models/abstract/AbstractProcess.sol', 'utf8')
            };

            input[modelInfo.id] = modelInfo.solidity;

            console.log('=============================================');
            console.log("SOLIDITY CODE");
            console.log('=============================================');
            Object.keys(input).forEach(key => {
                console.log(input[key]);
            });
            console.log('----------------------------------------------------------------------------------------------');

            let output = solc.compile({sources: input}, 1);
            if (Object.keys(output.contracts).length === 0) {
                res.status(400).send('COMPILATION ERROR IN SMART CONTRACTS');
                console.log('COMPILATION ERROR IN SMART CONTRACTS');
                console.log(output.errors);
                console.log('----------------------------------------------------------------------------------------------');
                return;
            }

            console.log('CONTRACTS GENERATED AND COMPILED SUCCESSFULLY');
            Object.keys(output.contracts).forEach(key => {
                let bytecode = '0x' + output.contracts[key].bytecode;
                let gasEstimate = web3.eth.estimateGas({data: bytecode});
                console.log(".............................................");
                console.log("Contract Name: " + key.split(':')[1]);
                console.log("Gas Estimation: " + gasEstimate);
            });
            console.log('----------------------------------------------------------------------------------------------');

            // Instantiating Process Registry if necessary
            if (!processRegistryContract) {
                let ProcContract = web3.eth.contract(JSON.parse(output.contracts['ProcessRegistry:ProcessRegistry'].interface));
                ProcContract.new(
                    {
                        from: web3.eth.accounts[0],
                        data: "0x" + output.contracts['ProcessRegistry:ProcessRegistry'].bytecode,
                        gas: 4700000
                    },
                    (err, contract) => {
                        if (err) {
                            console.log(`ERROR: ProcessRegistry instance creation failed`);
                            console.log('RESULT ', err);
                            res.status(403).send(err);
                        } else if (contract.address) {
                            processRegistryContract = contract;
                            console.log("Process Registry CREATED and RUNNING at " + processRegistryContract.address.toString());
                            registerModel(modelInfo, output.contracts, res);
                        }
                    });
            } else {
                registerModel(modelInfo, output.contracts, res);
            }
        })
    } catch (e) {
        console.log("Error: ", e);
        res.status(400).send(e);
    }
});

// Creating a new instance of a registered (root) process

models.post('/models/:bundleId', (req, res) => {
    if (processRegistryContract) {
        repoSchema.find({_id: req.params.bundleId},
            (err, repoData) => {
                if (err)
                    res.status(404).send('Process model not found');
                else {
                    console.log('----------------------------------------------------------------------------------------------');
                    console.log("TRYING TO CREATE INSTANCE OF CONTRACT: ", repoData[0].rootProcessID);
                    processRegistryContract.newBundleInstanceFor(repoData[0]._id.toString(), 0, {
                            from: web3.eth.accounts[0],
                            gas: 4700000
                        },
                        (errNew, resNew) => {
                            if (!errNew) {
                                let myEvent = processRegistryContract.NewInstanceCreatedFor({
                                    fromBlock: 0,
                                    toBlock: 'latest'
                                });
                                myEvent.watch((errEvt, resEvt) => {
                                    if (!errEvt) {
                                        if (resEvt && resEvt.transactionHash === resNew && resEvt.event === 'NewInstanceCreatedFor' && parseInt(resEvt.args.parent.toString(), 16) === 0) {
                                            myEvent.stopWatching();
                                            let processAddress = resEvt.args.processAddress.toString();
                                            console.log('CONTRACT CREATED !!! AT ADDRESS: ', processAddress);
                                            console.log('----------------------------------------------------------------------------------------------');
                                            res.status(200).send({address: processAddress});
                                        }
                                    } else {
                                        console.log('ERROR ', errEvt);
                                        res.status(400).send(errEvt);
                                    }
                                });
                            } else {
                                console.log('ERROR ', errNew);
                                res.status(400).send(errNew);
                            }
                        });
                }
            });
    } else
        res.status(404).send('Process model not found');
});

// Querying activation for a given process (repository ID provided)

models.get('/processes/:procAddress', (req, res) => {
    let contractAddress = req.params.procAddress;
    console.log('----------------------------------------------------------------------------------------------');
    console.log('QUERYING ACTIVATION FOR CONTRACT:', contractAddress);
    if (processRegistryContract) {
        let bundleId = web3.toAscii(processRegistryContract.bundleFor.call(contractAddress)).toString().substr(0, 24);
        repoSchema.find({_id: bundleId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let workitems = [],
                        serviceTasks = [];
                    console.log("CHECKING STARTED ELEMENTS ");
                    instanceStateFor(0, [contractAddress], repoData[0].bpmnModel, workitems, serviceTasks, res);
                } else {
                    console.log('Instance Not Found');
                    res.status(400).send({});
                }
            })
    } else {
        console.log('Instance Not Found');
        res.status(400).send({});
    }
});

// Executing a started workitem

models.post('/workitems/:worklistAddress/:reqId', (req, res) => {
    let worklistAddress = req.params.worklistAddress;
    let reqId = req.params.reqId;
    if (processRegistryContract) {
        let bundleId = web3.toAscii(processRegistryContract.worklistBundleFor.call(worklistAddress)).toString().substr(0, 24);
        repoSchema.find({_id: bundleId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let worklistInstance = web3.eth.contract(JSON.parse(repoData[0].worklistAbi)).at(worklistAddress);
                    let nodeIndex = worklistInstance.elementIndexFor.call(reqId);
                    let node = repoData[0].indexToElement[nodeIndex];
                    console.log(`WANT TO FIRE TASK: ${node.name}, ON WORKLIST: ${worklistAddress}`);
                    let inputParams = req.body.inputParameters;
                    let realParameters = inputParams.length > 0 ? [reqId].concat(inputParams) : [reqId];
                    let result = worklistInstance[node.name].apply(this, realParameters.concat({
                        from: web3.eth.accounts[0],
                        gas: 4700000
                    }));
                    console.log(`TRANSACTION: ${result}, PENDING !!!`);
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(200).send(result);
                    return;
                } else {
                    console.log('Error: ', err);
                    res.status(400).send('Error');
                }
            })
    } else {
        console.log('Error: ', 'Process Registry Undefined');
        res.status(400).send('Process Registry Undefined');
    }
});

/////////////// Methods for deploying model //////////////////////

let registerModel = (modelInfo, contracts, response) => {
    // Sorting elements such that children are created first
    let queue = [{nodeId: modelInfo.id, nodeName: modelInfo.name, bundleId: '', nodeIndex: 0, bundleParent: ''}];
    for (let i = 0; i < queue.length; i++) {
        if (modelInfo.controlFlowInfoMap.has(queue[i].nodeId)) {
            let cfInfo = modelInfo.controlFlowInfoMap.get(queue[i].nodeId);
            let candidates = [cfInfo.multiinstanceActivities, cfInfo.nonInterruptingEvents, cfInfo.callActivities];
            candidates.forEach(children => {
                if (children) {
                    children.forEach((value, key) => {
                        queue.push({nodeId: key, nodeName: value, bundleId: '', nodeIndex: 0, bundleParent: ''});
                    })
                }
            })
        }
    }
    queue.reverse();
    let nodeIndexes = new Map();
    for (let i = 0; i < queue.length; i++)
        nodeIndexes.set(queue[i].nodeId, i);
    console.log('----------------------------------------------------------------------------------------------');
    console.log('Updating Compilation Artifacts in Repository ...');
    registerModels(0, queue, nodeIndexes, modelInfo, contracts, response);
};

let registerModels = (currentIndex, sortedElements, nodeIndexes, modelInfo, contracts, res) => {
    let nodeName = sortedElements[currentIndex].nodeName;
    let gNodeId = sortedElements[currentIndex].nodeId;
    let controlFlowInfo = modelInfo.controlFlowInfoMap.get(gNodeId);
    if (modelInfo.globalNodeMap.get(gNodeId).$type === 'bpmn:StartEvent')
        controlFlowInfo = modelInfo.controlFlowInfoMap.get(modelInfo.globalNodeMap.get(gNodeId).$parent.id);
    if (controlFlowInfo) {
        let indexToFunctionName = [];
        let childrenSubproc = [];
        controlFlowInfo.nodeList.forEach(nodeId => {
            let element = modelInfo.globalNodeMap.get(nodeId);
            if (controlFlowInfo.nodeList.indexOf(nodeId) >= 0) {
                let type = "None";
                if (controlFlowInfo.callActivities.has(nodeId) || controlFlowInfo.multiinstanceActivities.has(nodeId) || controlFlowInfo.nonInterruptingEvents.has(nodeId))
                    type = "Separate-Instance";
                else if (element.$type === 'bpmn:ServiceTask')
                    type = "Service";
                else if (element.$type === 'bpmn:UserTask' || element.$type === 'bpmn:ReceiveTask' || controlFlowInfo.catchingMessages.indexOf(nodeId) >= 0)
                    type = "Workitem";
                indexToFunctionName[controlFlowInfo.nodeIndexMap.get(nodeId)] = {
                    name: controlFlowInfo.nodeNameMap.get(nodeId),
                    id: nodeId,
                    type: type
                };
                if (controlFlowInfo.callActivities.has(nodeId) || controlFlowInfo.multiinstanceActivities.has(nodeId) || controlFlowInfo.nonInterruptingEvents.has(nodeId)) {
                    childrenSubproc.push(nodeId);
                    sortedElements[nodeIndexes.get(nodeId)].nodeIndex = controlFlowInfo.nodeIndexMap.get(nodeId);
                    if (controlFlowInfo.externalBundles.has(nodeId))
                        sortedElements[nodeIndexes.get(nodeId)].bundleId = controlFlowInfo.externalBundles.get(nodeId);
                }
            }
        });
        let bpmnModel = currentIndex < sortedElements.length - 1 ? 'empty' : modelInfo.bpmn;
        let worklistAbi = contracts[`${modelInfo.id}:${nodeName}_Worklist`] ? contracts[`${modelInfo.id}:${nodeName}_Worklist`].interface : 'undefined';
        repoSchema.create(
            {
                rootProcessID: gNodeId,
                rootProcessName: nodeName,
                bpmnModel: bpmnModel,
                solidityCode: modelInfo.solidity,
                abi: contracts[`${modelInfo.id}:${nodeName}_Contract`].interface,
                bytecode: contracts[`${modelInfo.id}:${nodeName}_Contract`].bytecode,
                indexToElement: indexToFunctionName,
                worklistAbi: worklistAbi
            },
            (err, repoData) => {
                if (err) {
                    console.log('Error ', err);
                    // registerModels(currentIndex, sortedElements, createdElementMap, modelInfo, contracts, res);
                }
                else {
                    let idAsString = repoData._id.toString();
                    sortedElements[currentIndex].bundleId = idAsString;
                    sortedElements[currentIndex].bundleParent = idAsString;
                    childrenSubproc.forEach(childId => {
                        sortedElements[nodeIndexes.get(childId)].bundleParent = idAsString;
                    });
                    console.log(`Compilation artifacts of ${nodeName} updated in repository with id ${idAsString}`);
                    continueRegistration(currentIndex, sortedElements, nodeIndexes, modelInfo, contracts, res);
                }
            })
    } else {
        continueRegistration(currentIndex, sortedElements, nodeIndexes, modelInfo, contracts, res);
    }
};

let continueRegistration = (currentIndex, sortedElements, nodeIndexes, modelInfo, contracts, res) => {
    if (currentIndex + 1 >= sortedElements.length) {
        console.log('----------------------------------------------------------------------------------------------');
        console.log('Binding BundleId from Parent to Nested Children ...');
        createParent2ChildRelation(0, sortedElements, contracts, modelInfo, res);
    }
    else
        registerModels(currentIndex + 1, sortedElements, nodeIndexes, modelInfo, contracts, res);
};

let createParent2ChildRelation = (currentIndex, sortedElements, outputContracts, modelInfo, response) => {
    processRegistryContract.addChildBundleId(sortedElements[currentIndex].bundleParent, sortedElements[currentIndex].bundleId, sortedElements[currentIndex].nodeIndex, {
            from: web3.eth.accounts[0],
            gas: 4700000
        },
        (error, result) => {
            if (result) {
                console.log(`${sortedElements[currentIndex].nodeName} : ${sortedElements[currentIndex].bundleParent} => (${sortedElements[currentIndex].nodeIndex}), ${sortedElements[currentIndex].bundleId}`);
                if (currentIndex + 1 < sortedElements.length) {
                    createParent2ChildRelation(currentIndex + 1, sortedElements, outputContracts, modelInfo, response);
                } else {
                    console.log('----------------------------------------------------------------------------------------------');
                    let removedCallActivities = [];
                    sortedElements.forEach(element => {
                        if (modelInfo.controlFlowInfoMap.has(element.nodeId) || modelInfo.globalNodeMap.get(element.nodeId).$type === 'bpmn:StartEvent') {
                            removedCallActivities.push(element);
                        }
                    });
                    if (removedCallActivities.length > 0) {
                        console.log('Creating and Updating Worklist Instances in Process Registry ...');
                        createWorklistInstances(0, removedCallActivities, outputContracts, modelInfo, response);
                    }
                }
            }
            else
                console.log('ERROR ', error);
        })
};

let createWorklistInstances = (currentIndex, sortedElements, outputContracts, modelInfo, response) => {
    let entryWorklistName = `${modelInfo.id}:${sortedElements[currentIndex].nodeName}_Worklist`;
    if (outputContracts[entryWorklistName]) {
        let WorklistContract = web3.eth.contract(JSON.parse(outputContracts[entryWorklistName].interface));
        WorklistContract.new(
            {from: web3.eth.accounts[0], data: "0x" + outputContracts[entryWorklistName].bytecode, gas: 4700000},
            (errW, contractW) => {
                if (errW) {
                    console.log(`${sortedElements[currentIndex].nodeName}_Worklist instance creation failed`);
                    console.log('ERROR: ', errW);
                    response.status(400).send(errW);
                }
                else if (contractW.address) {
                    console.log(`${sortedElements[currentIndex].nodeName}_Worklist running at address ${contractW.address.toString()}`);
                    processRegistryContract.registerWorklist(sortedElements[currentIndex].bundleId, contractW.address, {
                            from: web3.eth.accounts[0],
                            gas: 4700000
                        },
                        (error1, result1) => {
                            if (result1) {
                                console.log(`${sortedElements[currentIndex].nodeName}_Worklist registered SUCCESSFULLY in Process Registry`);
                                sortedElements[currentIndex] = {
                                    nodeId: sortedElements[currentIndex].nodeId,
                                    nodeName: sortedElements[currentIndex].nodeName,
                                    bundleId: sortedElements[currentIndex].bundleId,
                                    worklist: contractW.address
                                };
                                continueWorklistCreation(currentIndex, sortedElements, outputContracts, modelInfo, response);
                            }
                            else
                                console.log('ERROR ', error1);
                        })
                }
            }
        )
    } else {
        continueWorklistCreation(currentIndex, sortedElements, outputContracts, modelInfo, response);
    }
};

let continueWorklistCreation = (currentIndex, sortedElements, outputContracts, modelInfo, response) => {
    if (currentIndex + 1 < sortedElements.length) {
        createWorklistInstances(currentIndex + 1, sortedElements, outputContracts, modelInfo, response);
    } else {
        console.log('----------------------------------------------------------------------------------------------');
        console.log('Creating and Updating Factory Instances in Process Registry ...');
        registerFactory(0, sortedElements, outputContracts, modelInfo, response);
    }
};

let registerFactory = (currentIndex, sortedElements, outputContracts, modelInfo, response) => {
    let entryFactoryName = `${modelInfo.id}:${sortedElements[currentIndex].nodeName}_Factory`;
    let FactoryContract = web3.eth.contract(JSON.parse(outputContracts[entryFactoryName].interface));
    FactoryContract.new(
        {from: web3.eth.accounts[0], data: "0x" + outputContracts[entryFactoryName].bytecode, gas: 4700000},
        (errF, contractF) => {
            if (errF) {
                console.log(`ERROR: ${sortedElements[currentIndex].nodeName}_Factory instance creation failed`);
                console.log('RESULT ', errF);
                response.status(400).send(errF);
            } else if (contractF.address) {
                console.log(`${sortedElements[currentIndex].nodeName}_Factory running at address ${contractF.address.toString()}`);
                if (sortedElements[currentIndex].worklist) {
                    contractF.setWorklist(sortedElements[currentIndex].worklist, {
                            from: web3.eth.accounts[0],
                            gas: 4700000
                        },
                        (err, res) => {
                            if (res) {
                                continueFactoryRegistration(currentIndex, sortedElements, outputContracts, contractF, modelInfo, response);
                            } else {
                                console.log('ERORR ', err);
                            }
                        })
                } else {
                    continueFactoryRegistration(currentIndex, sortedElements, outputContracts, contractF, modelInfo, response);
                }
            }
        });
};

let continueFactoryRegistration = (currentIndex, sortedElements, outputContracts, contractF, modelInfo, response) => {
    processRegistryContract.registerFactory(sortedElements[currentIndex].bundleId, contractF.address, {
            from: web3.eth.accounts[0],
            gas: 4700000
        },
        (error1, result1) => {
            if (result1) {
                console.log(`${sortedElements[currentIndex].nodeName}_Factory registered SUCCESSFULLY in Process Registry`);
                if (currentIndex + 1 < sortedElements.length) {
                    registerFactory(currentIndex + 1, sortedElements, outputContracts, modelInfo, response);
                } else {
                    let bundleId = '';
                    for (let i = 0; i < sortedElements.length; i++) {
                        if (sortedElements[i].nodeName === modelInfo.name) {
                            bundleId = sortedElements[i].bundleId;
                            break;
                        }
                    }
                    response.status(200).send({
                        id: bundleId,
                        name: modelInfo.name,
                        bpmn: modelInfo.bpmn,
                        solidity: modelInfo.solidity
                    });
                    console.log('----------------------------------------------------------------------------------------------');
                }
            }
            else
                console.log('Error ', error1);
        })
};
/////////////////////////////////////////////////////////////////////

let instanceStateFor = (currentIndex, nestedContracts, bpmnModel, workitems, serviceTasks, res) => {
    let contractAddress = nestedContracts[currentIndex];
    let bundleId = web3.toAscii(processRegistryContract.bundleFor.call(contractAddress)).toString().substr(0, 24);
    repoSchema.find({_id: bundleId},
        (err, repoData) => {
            if (err) {
                console.log('ERROR ', err);
                return [];
            } else {
                let contractInstance = web3.eth.contract(JSON.parse(repoData[0].abi)).at(contractAddress);
                let worklistAddress = contractInstance.getWorklistAddress.call();
                let worklistInstance: any;
                if (worklistAddress.toString() !== '0x0000000000000000000000000000000000000000')
                    worklistInstance = web3.eth.contract(JSON.parse(repoData[0].worklistAbi)).at(worklistAddress);
                let dictionary = repoData[0].indexToElement;

                let startedActivities = contractInstance.startedActivities.call().toString(2).split('').reverse();
                for (let index = 0; index < startedActivities.length; index++) {
                    if (startedActivities[index] === '1') {
                        if (dictionary[index].type === 'Workitem') {
                            let reqInd = worklistInstance.workItemsFor.call(index, contractAddress).toString(2).split('').reverse();
                            for (let i = 0; i < reqInd.length; i++) {
                                if (reqInd[i] === '1') {
                                    let notFound = true;
                                    for (let j = 0; j < workitems.length; j++) {
                                        if (workitems[j].elementId === dictionary[index].id && workitems[j].bundleId === bundleId) {
                                            workitems[j].hrefs.push(`/workitems/${worklistAddress}/${i}`);
                                            notFound = false;
                                            break;
                                        }
                                    }
                                    if (notFound) {
                                        workitems.push({
                                            elementId: dictionary[index].id,
                                            elementName: dictionary[index].name,
                                            input: findParameters(repoData[0].worklistAbi, dictionary[index].name),
                                            bundleId: bundleId,
                                            processAddress: contractAddress,
                                            hrefs: [`/workitems/${worklistAddress}/${i}`]
                                        });
                                    }
                                }
                            }
                        } else if (dictionary[index].type === 'Service') {
                            // PENDING
                        } else if (dictionary[index].type === 'Separate-Instance') {
                            let startedInstances = contractInstance.startedInstanceIndexFor.call(index).toString(2).split('').reverse();
                            let allInstances = contractInstance.allInstanceAddresses.call();
                            for (let i = 0; i < startedInstances.length; i++)
                                if (startedInstances[i] === '1')
                                    nestedContracts.push(allInstances[i]);
                        }
                    }
                }
                if (currentIndex + 1 < nestedContracts.length)
                    instanceStateFor(currentIndex + 1, nestedContracts, bpmnModel, workitems, serviceTasks, res);
                else {
                    if (workitems.length == 0 && serviceTasks.length == 0)
                        console.log('No started elements ...');
                    else {
                        workitems.forEach(elem => {
                            console.log("Element ID: ", elem.elementId);
                            console.log("Element Name: ", elem.elementName);
                            console.log("Input Parameters: ", elem.input);
                            console.log("bundleId: ", elem.bundleId);
                            console.log("hrefs: ", elem.hrefs);
                            console.log("...............................................................");
                        })
                    }
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(200).send({bpmn: bpmnModel, workitems: workitems, serviceTasks: serviceTasks});
                }
            }
        });
};

let findParameters = (contractAbi, functionName) => {
    let jsonAbi = JSON.parse(contractAbi);
    let candidates = [];
    jsonAbi.forEach(element => {
        if (element.name === functionName) {
            candidates = element.inputs;
        }
    });
    let res = [];
    candidates.forEach(element => {
        if (element.name && element.name !== 'workitemId')
            res.push(element);
    });
    return res;
};

export default models;

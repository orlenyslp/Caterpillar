
import {Router} from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';
import BigNumber from "bignumber.js";

import {ModelInfo} from './definitions';
import {parseModel} from './models.parsers';
import {repoSchema} from '../repo/procModelData';
import {registrySchema} from '../repo/procModelData';
import {policySchema} from '../repo/procModelData';
import {roleTaskSchema} from '../repo/procModelData';

import {generatePolicy} from './dynamic_binding/validation_code_gen/BindingPolicyGenerator';
import {generateRoleTaskContract} from './dynamic_binding/validation_code_gen/ProcessRoleGenerator';

// import * as mongoose from 'mongoose';

// let app = require('express')();
// let http = require('http').Server(app);

// let io = require('socket.io')(http);
// let ObjectId = mongoose.Types.ObjectId;

/* http.listen(8090, () => {
    // console.log('started on port 8090');
}); */

import fs = require('fs');


////// ANTLR Runtime Requirements //////////////////////////



////////////////////////////////////////////////////////////

const models: Router = Router();
let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
// var web3 = new Web3(new Web3.providers.HttpProvider("http://193.40.11.64:80"));

const WebSocket = require('ws');
let mws;
const wss = new WebSocket.Server({port: 8090});
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        // console.log('received: %s', message);
    });
    ws.on('error', () => {});
    mws = ws;
});


let executionAccount = 0

web3.eth.filter("latest", function (error, result) {
    if (!error) {
        try {
            let info = web3.eth.getBlock(result);
            if (info.transactions.length > 0) {
                //  // console.log('----------------------------------------------------------------------------------------------');
                //  // console.log('NEW BLOCK MINED');
                let toNotify = [];
                info.transactions.forEach(transactionHash => {
                    // // console.log("TRANSACTION ", transRec);
                   //// console.log(web3.eth.estimateGas({from: web3.eth.accounts[0], to: transactionHash, amount: web3.toWei(1, "ether")}))
    
                    let transRec = web3.eth.getTransactionReceipt(transactionHash);
                    let tranInfo = { 'hash': transactionHash,
                                      'blockNumber': transRec.blockNumber,
                                      'gas': transRec.gasUsed,
                                      'cumulGas': transRec.cumulativeGasUsed }
                   toNotify.push(tranInfo)

                 //  if(toPrint.length > 0 && toPrint === transactionHash) {
                 //      // console.log('Gas :' + tI + " " + transRec.gasUsed);
                 //      toPrint = '';
                 //      tI = 0;
                 //  }
    
                  if(!bindingOpTransactions.has(tranInfo.hash)) {
                    transRec.logs.forEach(logElem => {
                        if (workListInstances.has(logElem.address) && toNotify.indexOf(logElem.address) < 0) {
                            //// console.log("LOG ELEMENT ", logElem);
                            // console.log('WorkList', workListInstances);
                            toNotify.push(workListInstances.get(logElem.address));
                        }
                    })
                } 
                    //// console.log('----------------------------------------------------------------------------------------------');
                });
                if (toNotify.length > 0) {
                    //// console.log("Message sent through socket running on port 8090");
                    toNotify.forEach(add => {
                        if (mws)
                            mws.send(JSON.stringify(add), function ack(error) {
                            });
                    });
                    //io.emit('message', { type: 'new-message', text: "Updates in Server" });
                } else {
                    //// console.log("Nothing to notify");
                }
            }
        } catch(ex) {  }
    }
});

let workListInstances: Map<string, string> = new Map();
let bindingOpTransactions: Map<string, number> = new Map();

let processRegistryContract: any = undefined;

// Querying for every contract all the created instances

models.get('/processes', (req, res) => {
    console.log('QUERYING ALL ACTIVE CONTRACTS');
    let actives = [];
    if(processRegistryContract) {
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
     } else {
        res.status(404).send([]);
     }
});

// Querying all registered (root) process in the repository

models.get('/models', (req, res) => {
    console.log('QUERYING REGISTERED MODELS');
    let actives = [];
    if(processRegistryContract) {
    repoSchema.find({'bpmnModel': {$ne: 'empty'}},
        (err, repoData) => {
            if (err)
                res.send([]);
            else {
                repoData.forEach(data => {
                    if(web3.toAscii(processRegistryContract.childrenFor(data._id.toString(), 0)).toString().substr(0, 24) === data._id.toString()) {
                        console.log({id: data._id, name: data.rootProcessName});
                        actives.push({
                            id: data._id,
                            name: data.rootProcessName,
                            bpmn: data.bpmnModel,
                            solidity: data.solidityCode
                        })
                    }
                });
                console.log('----------------------------------------------------------------------------------------------');
                res.send(actives);
            }
        });
    } else {
        res.send([]);
        console.log('----------------------------------------------------------------------------------------------');
    }
});


//////////////////////////////////////////////////////////////////////
///    CONFIGURATION (ProcessRegistry) REGISTRATION operations     ///
//////////////////////////////////////////////////////////////////////

models.post('/registry', (req, res) => {
    console.log('DEPLOYING PROCESS RUNTIME REGISTRY ...');
    try {
        let input = {
            'AbstractFactory': fs.readFileSync('./src/models/abstract/AbstractFactory.sol', 'utf8'),
            'ProcessRegistry': fs.readFileSync('./src/models/abstract/ProcessRegistry.sol', 'utf8')
        };
            
        console.log('=============================================');
        console.log("SOLIDITY CODE");
        console.log('=============================================');
        console.log(input['ProcessRegistry']);
        console.log('....................................................................');
    
        let output = solc.compile({sources: input}, 1);
        if (Object.keys(output.contracts).length === 0) {
            res.status(400).send('COMPILATION ERROR IN RUNTIME REGISTRY SMART CONTRACTS');
            console.log('COMPILATION ERROR IN SMART CONTRACTS');
            console.log(output.errors);
            console.log('----------------------------------------------------------------------------------------------');
            return;
        }

        console.log('PROCESS RUNTIME REGISTRY COMPILED SUCCESSFULLY');           
        console.log('CREATING RUNTIME REGISTRY INSTANCE ... ');

        let ProcContract = web3.eth.contract(JSON.parse(output.contracts['ProcessRegistry:ProcessRegistry'].interface));
            ProcContract.new(
                {
                    from: web3.eth.accounts[executionAccount],
                    data: "0x" + output.contracts['ProcessRegistry:ProcessRegistry'].bytecode,
                    gas: 4700000
                },
                (err, contract) => {
                    if (err) {
                        console.log(`ERROR: ProcessRegistry instance creation failed`);
                        console.log('RESULT ', err);
                        res.status(403).send(err);
                    } else if (contract.address) {
                        registrySchema.create(
                            {
                                address: contract.address,
                                solidityCode: input['ProcessRegistry'],
                                abi: output.contracts['ProcessRegistry:ProcessRegistry'].interface,
                                bytecode: output.contracts['ProcessRegistry:ProcessRegistry'].bytecode,
                            },
                            (err, repoData) => {
                                if (err) {
                                    console.log('Error ', err);
                                    console.log('----------------------------------------------------------------------------------------------');
                                    // registerModels(currentIndex, sortedElements, createdElementMap, modelInfo, contracts, res);
                                }
                                else {
                                    processRegistryContract = contract;
                                    let registryGas = web3.eth.getTransactionReceipt(contract.transactionHash).gasUsed;
                                    let idAsString = repoData._id.toString();
                                    console.log("Process Registry DEPLOYED and RUNNING at " + processRegistryContract.address.toString());
                                    console.log('GAS USED: ', registryGas);
                                    console.log('REPO ID: ', idAsString);
                                    res.status(200).send({ 'address': processRegistryContract.address.toString(), gas: registryGas, repoId: idAsString});
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                            })
                    }
                });
    } catch (e) {
        console.log("Error: ", e);
        console.log('----------------------------------------------------------------------------------------------');
        res.status(400).send(e);
    }
});

models.post('/registry/load', (req, res) => {
    console.log('LOADING PROCESS RUNTIME REGISTRY ...');
    if(web3.isAddress(req.body.from)) {
        registrySchema.find({address: req.body.from},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    processRegistryContract = web3.eth.contract(JSON.parse(repoData[0].abi)).at(req.body.from);
                    console.log('Registry Loaded Successfully');
                    res.status(200).send('Registry Loaded Successfully');
                    console.log('----------------------------------------------------------------------------------------------');
                } else {
                    console.log("Error: Registry NOT Found");
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(400).send('Registry NOT Found');
                    return;
                }
            })
    } else {
        registrySchema.find({_id: req.body.from},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    processRegistryContract = web3.eth.contract(JSON.parse(repoData[0].abi)).at(repoData[0].address);
                    console.log('Registry Loaded Successfully');
                    res.status(200).send('Registry Loaded Successfully');
                    console.log('----------------------------------------------------------------------------------------------');
                } else {
                    console.log("Error: Registry NOT Found");
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(400).send('Registry NOT Found');
                    return;
                }
            })
    }
});


//////////////////////////////////////////////////////////////////////
///               ROLE DYNAMIC BINDING operations                  ///
//////////////////////////////////////////////////////////////////////

models.post('/resources/policy', (req, res) => {
    console.log('GENERATING AND DEPLOYING BINDING POLICY CONTRACTS ...');
    if (processRegistryContract === undefined) {
        console.log('ERROR: No Runtime Registry Available');
        console.log('----------------------------------------------------------------------------------------------');
        res.status(404).send('Error: Runtime Registry Not Found');
    } else {
        console.log('GENERATING SMART CONTRACTS FROM BINDING POLICY ...');
        let resourceModel = req.body.model;
        let parsingResult = generatePolicy(resourceModel, 'BindingPolicy');
        parsingResult
        .then((policy) => {
            let input = {
                'BindingAccessControl': fs.readFileSync('./src/models/dynamic_binding/runtime_solidity/BindingAccessControl.sol', 'utf8')
            };

            input['BindingPolicy'] = policy.solidity;
            
            console.log('=============================================');
            console.log("SOLIDITY CODE");
            console.log('=============================================');
            Object.keys(input).forEach(key => {
                console.log(input[key]);
            });
            console.log('....................................................................');

            let output = solc.compile({sources: input}, 1);

            if (Object.keys(output.contracts).length === 0) {
                res.status(400).send('COMPILATION ERROR IN POLICY CONTRACTS');
                console.log('COMPILATION ERROR IN POLICY CONTRACTS');
                console.log(output.errors);
                console.log('----------------------------------------------------------------------------------------------');
                return;
            }

            console.log('POLICY CONTRACTS GENERATED AND COMPILED SUCCESSFULLY');
            
            let ProcContract = web3.eth.contract(JSON.parse(output.contracts['BindingPolicy:BindingPolicy_Contract'].interface));
            ProcContract.new(
                {
                    from: web3.eth.accounts[executionAccount],
                    data: "0x" + output.contracts['BindingPolicy:BindingPolicy_Contract'].bytecode,
                    gas: 4700000
                },
                (err, contract) => {
                    if (err) {
                        console.log(`ERROR: PolicyContract instance creation failed`);
                        console.log('RESULT ', err);
                        res.status(403).send(err);
                    } else if (contract.address) {

                        let indexToRole = [];
                        for (let [role, index] of policy.roleIndexMap) {
                            indexToRole[index] = role;
                        }
                        policySchema.create(
                            {
                                address: contract.address,
                                model: req.body.model,
                                solidityCode: input['BindingPolicy'],
                                abi: output.contracts['BindingPolicy:BindingPolicy_Contract'].interface,
                                bytecode: output.contracts['BindingPolicy:BindingPolicy_Contract'].bytecode,
                                indexToRole: indexToRole,
                                accessControlAbi: output.contracts['BindingAccessControl:BindingAccessControl'].interface,
                                accessControlBytecode: output.contracts['BindingAccessControl:BindingAccessControl'].bytecode,
                            },
                            (err, repoData) => {
                                if (err) {
                                    console.log('Error ', err);
                                    console.log('----------------------------------------------------------------------------------------------');
                                    // registerModels(currentIndex, sortedElements, createdElementMap, modelInfo, contracts, res);
                                }
                                else {
                                    let idAsString = repoData._id.toString();
                                    let policyGas = web3.eth.getTransactionReceipt(contract.transactionHash).gasUsed;
                                    console.log("Policy CREATED and RUNNING at " + contract.address.toString());
                                    console.log('GAS USED: ', policyGas);
                                    console.log('Policy Id: ',  idAsString);
                                    console.log('Role\'s indexes: ', policy.roleIndexMap);
                                    console.log(".............................................");
                                    res.status(200).send({address: contract.address.toString(), gas: policyGas, repoId: idAsString });
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                        })
                    }
                });
        })
        .catch((err) => {
            res.status(200).send({ 'Error': 'Error Parsing' });
            console.log('----------------------------------------------------------------------------------------------');
        })
    }
});

models.post('/resources/task-role', (req, res) => {
    if(processRegistryContract === undefined) {
        console.log('ERROR: Runtime Registry NOT FOUND.');
        res.status(404).send({ 'Error': 'Runtime Registry NOT FOUND. Please, Create/Load a Registry.' });
        console.log('----------------------------------------------------------------------------------------------');
    } else {
        if(web3.isAddress(req.body.policyId)) {
            policySchema.find({address: req.body.policyId},
                (err, repoData) => {
                    if (!err && repoData && repoData.length > 0) {
                        let processData: Map<string, Array<any>> = new Map();
                        searchRepository(0, [req.body.rootProc], processData, res, req.body.policyId, findRoleMap(repoData[0].indexToRole));
                    } else {
                        console.log("Error: Binding Policy NOT Found");
                        console.log('----------------------------------------------------------------------------------------------');
                        res.status(400).send('Binding Policy NOT Found');
                        return;
                    }
                })
        } else {
            policySchema.find({_id: req.body.policyId},
                (err, repoData) => {
                    if (!err && repoData && repoData.length > 0) {
                        let processData: Map<string, Array<any>> = new Map();
                        searchRepository(0, [req.body.rootProc], processData, res, req.body.policyId, findRoleMap(repoData[0].indexToRole));
                    } else {
                        console.log("Error: Binding Policy NOT Found");
                        console.log('----------------------------------------------------------------------------------------------');
                        res.status(400).send('Binding Policy NOT Found');
                        return;
                    }
                })
        }
    }
});

models.get('/resources/:role/:procAddress', (req, res) => {
   if (!web3.isAddress(req.params.procAddress)) {
        res.status(200).send({'state' : 'INVALID INPUT PROCESS ADDRESS'});
   } else if(processRegistryContract === undefined) {
        res.status(200).send({'state' : 'UNDEFINED PROCESS REGISTRY'});
   } else {
        let _policyId = web3.toAscii(processRegistryContract.bindingPolicyFor.call(req.params.procAddress)).toString().substr(0, 24);
        policySchema.find({_id: _policyId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let roleIndexMap = findRoleMap(repoData[0].indexToRole);
                    if(!roleIndexMap.has(req.params.role)) {
                        console.log('UNDEFINED INPUT ROLE');
                        res.status(200).send({'state' : 'UNDEFINED INPUT ROLE'});
                    } else {
                        let accessControlAddr =  processRegistryContract.findRuntimePolicy.call(req.params.procAddress);
                        if(accessControlAddr.toString() === '0x0000000000000000000000000000000000000000') {
                            console.log('UNDEFINED ACESS CONTROL CONTRACT');
                            res.status(200).send({'state' : 'UNDEFINED ACESS CONTROL CONTRACT'});
                        } else {
                            let _runtimePolicyContract = web3.eth.contract(JSON.parse(repoData[0].accessControlAbi)).at(accessControlAddr);
                            let result = _runtimePolicyContract.roleState.call(roleIndexMap.get(req.params.role), req.params.procAddress);
                            if(result.c[0] === 0) {
                                console.log(`${req.params.role} is UNBOUND`)
                                res.status(200).send({'state' : 'UNBOUND'});
                            } else if(result.c[0] === 1) {
                                console.log(`${req.params.role} is RELEASING`)
                                res.status(200).send({'state' : 'RELEASING'});
                            } else if(result.c[0] === 2) {
                                console.log(`${req.params.role} is NOMINATED`)
                                res.status(200).send({'state' : 'NOMINATED'});
                            } else if(result.c[0] === 3) {
                                console.log(`${req.params.role} is BOUND`)
                                res.status(200).send({'state' : 'BOUND'});
                            } else {
                                console.log('UNDEFINED STATE');
                                res.status(200).send({'state' : 'UNDEFINED'});
                            }
                        }
                    }
                } else {
                    console.log('UNDEFINED POLICY CONTRACT');
                    res.status(200).send({'state' : 'UNDEFINED POLICY CONTRACT'});
                    return;
                }
            });
   }
   console.log('----------------------------------------------------------------------------------------------');
});

let validateInput = (rNominator: string, rNominee: string, roleIndexMap, res: any) => {
    if(!roleIndexMap.has(rNominee)) {
        console.log(`Error Nominee Role [${rNominee}] NOT FOUND`);
        res.status(404).send({ 'Error': `Nominee Role [${rNominee}] NOT FOUND` });
        console.log('----------------------------------------------------------------------------------------------');
        return false;
    } else if(!roleIndexMap.has(rNominator)) {
        console.log(`Error Nominee Role [${rNominee}] NOT FOUND`);
        res.status(404).send({ 'Error': `Nominee Role [${rNominee}] NOT FOUND` });
        console.log('----------------------------------------------------------------------------------------------');
        return false;
    }
    return true;
}

let findRoleMap = (repoArr) => {
    let roleInedexMap: Map<string, number> = new Map();
    for (let i = 1; i < repoArr.length; i++)
        if(repoArr[i]) 
            roleInedexMap.set(repoArr[i], i);
    return roleInedexMap;    
}

let verifyAddress = (address: string, actor: string, res: any) => {
    if (!web3.isAddress(address)) {
        console.log('Error: ', `Invalid ${actor} Address [${address}]`);
        res.status(400).send(`Invalid Nominator Address [${address}]`);
        console.log('----------------------------------------------------------------------------------------------');
        return false;
    }
    return true;
}


models.post('/resources/nominate', (req, res) => {
    if(processRegistryContract === undefined) {
        res.status(404).send({'state' : 'UNDEFINED PROCESS REGISTRY'});
   } else {
        let _policyId = web3.toAscii(processRegistryContract.bindingPolicyFor.call(req.body.pCase)).toString().substr(0, 24);
        policySchema.find({_id: _policyId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let roleIndexMap = findRoleMap(repoData[0].indexToRole);
                    if(validateInput(req.body.rNominator, req.body.rNominee, roleIndexMap, res)) {
                        if (verifyAddress(req.body.nominator, 'Nominator', res) && 
                            verifyAddress(req.body.nominee, 'Nominee', res) && 
                            verifyAddress(req.body.pCase, 'Process Case', res)) {
                                let accessControlAddr =  processRegistryContract.findRuntimePolicy.call(req.body.pCase);
                                if(accessControlAddr.toString() !== '0x0000000000000000000000000000000000000000') {
                                    console.log(`${req.body.rNominator}[${req.body.nominator}] is nominating ${req.body.rNominee}[${req.body.nominee}]`);
                                    console.log(`Process Case: ${req.body.pCase}`);
                                    let _runtimePolicyContract = web3.eth.contract(JSON.parse(repoData[0].accessControlAbi)).at(accessControlAddr);
                                    _runtimePolicyContract.nominate(
                                        roleIndexMap.get(req.body.rNominator),
                                        roleIndexMap.get(req.body.rNominee),
                                        req.body.nominator,
                                        req.body.nominee,
                                        req.body.pCase, 
                                        {
                                            from: req.body.nominator,
                                            gas: 4700000
                                        },
                                        (error, result) => {
                                            if (result) {
                                                console.log(`SUCCESS: ${req.body.nominator} nominated ${req.body.nominee}`);
                                                console.log(`Transaction Hash: ${result}`)
                                                console.log('----------------------------------------------------------------------------------------------');
                                                bindingOpTransactions.set(result, 0);
                                                res.status(200).send({'transactionHash': result});
                                            }
                                            else {
                                                console.log('ERROR', 'Nomination REJECTED by the Binding Policy');
                                                console.log('----------------------------------------------------------------------------------------------');
                                                res.status(404).send({'ERROR': error});
                                            }
                                        })
                                } else {
                                    console.log(`Process Instance NOT FOUND.`);
                                    res.status(404).send({ 'Error': `Process Instance NOT FOUND. The nomination of an actor must occurr afterthe process deployment.` });
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                        }
                    }
                } else {
                    console.log('UNDEFINED POLICY CONTRACT');
                    res.status(400).send({'state' : 'UNDEFINED POLICY CONTRACT'});
                    return;
                }
            })
   }
})

models.post('/resources/release', (req, res) => {
    if(processRegistryContract === undefined) {
        res.status(404).send({'state' : 'UNDEFINED PROCESS REGISTRY'});
   } else {
        let _policyId = web3.toAscii(processRegistryContract.bindingPolicyFor.call(req.body.pCase)).toString().substr(0, 24);
        policySchema.find({_id: _policyId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let roleIndexMap = findRoleMap(repoData[0].indexToRole);
                    if(validateInput(req.body.rNominator, req.body.rNominee, roleIndexMap, res)) {
                        if (verifyAddress(req.body.nominator, 'Nominator', res) && 
                            verifyAddress(req.body.pCase, 'Process Case', res)) {
                                let accessControlAddr =  processRegistryContract.findRuntimePolicy.call(req.body.pCase);
                                if(accessControlAddr.toString() !== '0x0000000000000000000000000000000000000000') {
                                    console.log(`${req.body.rNominator}[${req.body.nominator}] is releasing ${req.body.rNominee}[${req.body.nominee}]`);
                                    console.log(`Process Case: ${req.body.pCase}`);
                                    let _runtimePolicyContract = web3.eth.contract(JSON.parse(repoData[0].accessControlAbi)).at(accessControlAddr);
                                    _runtimePolicyContract.release(
                                        roleIndexMap.get(req.body.rNominator),
                                        roleIndexMap.get(req.body.rNominee),
                                        req.body.nominator,
                                        req.body.pCase, 
                                        {
                                            from: req.body.nominator,
                                            gas: 4700000
                                        },
                                        (error, result) => {
                                            if (result) {
                                                console.log(`SUCCESS: ${req.body.nominator} released ${req.body.nominee}`);
                                                console.log(`Transaction Hash: ${result}`)
                                                console.log('----------------------------------------------------------------------------------------------');
                                                bindingOpTransactions.set(result, 0);
                                                res.status(200).send({'transactionHash': result});
                                            }
                                            else {
                                                console.log('ERROR', 'Release REJECTED by the Binding Policy');
                                                res.status(400).send({'ERROR': error});
                                            }
                                        })
                                } else {
                                    console.log(`Process Instance NOT FOUND.`);
                                    res.status(404).send({ 'Error': `Process Instance NOT FOUND. The release of an actor must occurr afterthe process deployment.` });
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                            }
                    }
                } else {
                    console.log('UNDEFINED POLICY CONTRACT');
                    res.status(400).send({'state' : 'UNDEFINED POLICY CONTRACT'});
                    return;
                }
            })
   }
})

let verifyEndorser = (rEndorser: string, endorser: string, roleIndexMap, res: any) => {
    if(!roleIndexMap.has(rEndorser)) {
        console.log(`Error Endorser Role [${rEndorser}] NOT FOUND`);
        res.status(404).send({ 'Error': `Nominee Role [${rEndorser}] NOT FOUND` });
        console.log('----------------------------------------------------------------------------------------------');
        return false;
    }
    return verifyAddress(endorser, 'Endorser', res);
}

models.post('/resources/vote', (req, res) => {
   if(processRegistryContract === undefined) {
        res.status(404).send({'state' : 'UNDEFINED PROCESS REGISTRY'});
   } else {
        let _policyId = web3.toAscii(processRegistryContract.bindingPolicyFor.call(req.body.pCase)).toString().substr(0, 24);
        policySchema.find({_id: _policyId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let roleIndexMap = findRoleMap(repoData[0].indexToRole);
                    if(validateInput(req.body.rNominator, req.body.rNominee, roleIndexMap, res)) {
                        if (verifyEndorser(req.body.rEndorser, req.body.endorser, roleIndexMap, res) && 
                            verifyAddress(req.body.pCase, 'Process Case', res)) {
                                let accessControlAddr =  processRegistryContract.findRuntimePolicy.call(req.body.pCase);
                                if(accessControlAddr.toString() !== '0x0000000000000000000000000000000000000000') {
                                    let _runtimePolicyContract = web3.eth.contract(JSON.parse(repoData[0].accessControlAbi)).at(accessControlAddr);
                                    if(req.body.onNomination) {
                                        let voteResult = req.body.isAccepted === "true" ? 'endorsing' : 'rejecting';
                                        console.log(`${req.body.rEndorser}[${req.body.endorser}] is ${voteResult} nomination of ${req.body.rNominee} by ${req.body.rNominator}`)
                                        console.log(`Process Case: ${req.body.pCase}`)
                                        _runtimePolicyContract.voteN (
                                            roleIndexMap.get(req.body.rNominator),
                                            roleIndexMap.get(req.body.rNominee),
                                            roleIndexMap.get(req.body.rEndorser),
                                            req.body.endorser,
                                            req.body.pCase,
                                            req.body.isAccepted,
                                            {
                                                from: req.body.endorser,
                                                gas: 4700000
                                            },
                                            (error, result) => {
                                                if (result) {
                                                    let tp = req.body.isAccepted === 'true' ? 'endorsed' : 'rejected'; 
                                                    console.log(`SUCCESS: ${req.body.endorser} ${tp} the nomination of ${req.body.nominee}`);
                                                    console.log(`Transaction Hash: ${result}`)
                                                    console.log('----------------------------------------------------------------------------------------------');
                                                    bindingOpTransactions.set(result, 0);
                                                    res.status(200).send({'transactionHash': result});
                                                }
                                                else {
                                                    console.log('ERROR', 'Vote REJECTED by the Binding Policy');
                                                    console.log('----------------------------------------------------------------------------------------------');
                                                    res.status(400).send({'ERROR': error});
                                                }
                                            })
                                    } else {
                                        let voteResult = req.body.isAccepted === "true" ? 'endorsing' : 'rejecting';
                                        console.log(`${req.body.rEndorser}[${req.body.endorser}] is ${voteResult} release of ${req.body.rNominee} by ${req.body.rNominator}`)
                                        console.log(`Process Case: ${req.body.pCase}`)
                                        _runtimePolicyContract.voteR (
                                            roleIndexMap.get(req.body.rNominator),
                                            roleIndexMap.get(req.body.rNominee),
                                            roleIndexMap.get(req.body.rEndorser),
                                            req.body.endorser,
                                            req.body.pCase,
                                            req.body.isAccepted,
                                            {
                                                from: req.body.endorser,
                                                gas: 4700000
                                            },
                                            (error, result) => {
                                                if (result) {
                                                    let tp = req.body.isAccepted === 'true' ? 'endorsed' : 'rejected'; 
                                                    console.log(`VOTE ACCEPTED: ${req.body.endorser} ${tp} the release of ${req.body.nominee}`);
                                                    console.log(`Transaction Hash: ${result}`)
                                                    console.log('----------------------------------------------------------------------------------------------');
                                                    bindingOpTransactions.set(result, 0);
                                                    res.status(200).send({'transactionHash': result});
                                                }
                                                else {
                                                    console.log('ERROR', 'Vote REJECTED by the Binding Policy');
                                                    console.log('----------------------------------------------------------------------------------------------');
                                                    res.status(400).send({'ERROR': error});
                                                }
                                            })
                                    }
                                } else {
                                    console.log(`Process Instance NOT FOUND.`);
                                    res.status(404).send({ 'Error': `Process Instance NOT FOUND. The voting of an operation must occurr afterthe process deployment.` });
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                            }
                    } 
                } else {
                    console.log('UNDEFINED POLICY CONTRACT');
                    res.status(400).send({'state' : 'UNDEFINED POLICY CONTRACT'});
                    return;
                }
            })
   }
})

let searchRepository = (top: number, queue: Array<string>, processData: Map<string, Array<any>>, response, policyId, roleIndexMap) => {
    processData.set(queue[top], new Array());
    repoSchema.find({_id: queue[top]},
        (err, repoData) => {
            if (err) {
                return;
            } else {
              if(repoData.length > 0) {
                let dictionary = repoData[0].indexToElement;
                for (let i = 1; i < dictionary.length; i++) {
                    if(dictionary[i].type === 'Workitem') {
                        processData.get(queue[top]).push({taskIndex: i, roleIndex: roleIndexMap.get(dictionary[i].role)});
                    } else if (dictionary[i].type === 'Separate-Instance') {
                        queue.push(web3.toAscii(processRegistryContract.childrenFor.call(queue[top], i)).toString().substr(0, 24));
                    } 
                }
                if(top < queue.length - 1)
                    searchRepository(top + 1, queue, processData, response, policyId, roleIndexMap);
                else {
                    let procesRoleContract = generateRoleTaskContract(processData, 'TaskRoleContract', true);
                    procesRoleContract
                    .then((solidity) => {
                        let input = {}
                        input['TaskRoleContract'] = solidity;

                        console.log('=============================================');
                        console.log("SOLIDITY CODE");
                        console.log('=============================================');
                        console.log(solidity)

                        let output = solc.compile({sources: input}, 1);

                        if (Object.keys(output.contracts).length === 0) {
                            response.status(400).send('COMPILATION ERROR IN TASK-ROLE CONTRACT');
                            console.log('COMPILATION ERROR IN TASK-ROLE CONTRACT');
                            console.log(output.errors);
                            console.log('----------------------------------------------------------------------------------------------');
                            return;
                        }

                        let ProcContract = web3.eth.contract(JSON.parse(output.contracts['TaskRoleContract:TaskRoleContract_Contract'].interface));
                        ProcContract.new(
                            {
                                from: web3.eth.accounts[executionAccount],
                                data: "0x" + output.contracts['TaskRoleContract:TaskRoleContract_Contract'].bytecode,
                                gas: 4700000
                            },
                            (err, contract) => {
                                if (err) {
                                    console.log(`ERROR: TASK-ROLE-MAP instance creation failed`);
                                    console.log('RESULT ', err);
                                    response.status(403).send(err);
                                } else if (contract.address) {
                                    roleTaskSchema.create(
                                        {
                                            address: contract.address,
                                            solidityCode: input['TaskRoleContract'],
                                            abi: output.contracts['TaskRoleContract:TaskRoleContract_Contract'].interface,
                                            bytecode: output.contracts['TaskRoleContract:TaskRoleContract_Contract'].bytecode,
                                        },
                                        (err, repoData) => {
                                            if (err) {
                                                console.log('Error ', err);
                                                console.log('----------------------------------------------------------------------------------------------');
                                            }
                                            else {
                                                let idAsString = repoData._id.toString();
                                                processRegistryContract.relateProcessToPolicy(queue[0], policyId, idAsString, {
                                                    from: web3.eth.accounts[0],
                                                    gas: 4700000
                                                },
                                                (error, result) => {
                                                    if (result) {
                                                        let gas = web3.eth.getTransactionReceipt(contract.transactionHash).gasUsed;
                                                        console.log("TaskRoleMap CREATED and RUNNING at " + contract.address.toString());
                                                        console.log('GAS USED: ', gas);
                                                        console.log('Repo Id: ',  idAsString);
                                                        response.status(200).send({ address: contract.address.toString(), gas: gas, repoId: idAsString });
                                                        console.log('----------------------------------------------------------------------------------------------');
                                                    }
                                                    else {
                                                         console.log('ERROR ', error);
                                                         response.status(400).send(error);
                                                    }
                                                })
                                            }
                                    })
                                }
                            });
                    })
                    .catch((err) => {
                        console.log('Error: process ID ' + queue[top] + ' not found');
                        response.status(404).send({ 'Error': 'Process ID not found' });
                        console.log('----------------------------------------------------------------------------------------------');
                    })
                }
              }
            }
        })
}

//////////////////////////////////////////////////////////////////////
///    PROCESS MODEL CONTROL FLOW + WORKLIST operations            ///
//////////////////////////////////////////////////////////////////////

models.post('/models', (req, res) => {
    if (processRegistryContract === undefined) {
        console.log('ERROR: Runtime Registry NOT FOUND');
        res.status(404).send({'Error': 'Runtime Registry NOT FOUND'});
        console.log('----------------------------------------------------------------------------------------------');
    } else {
        console.log('GENERATING SMART CONTRACTS FROM PROCESS MODEL ...');
        let modelInfo: ModelInfo = req.body as ModelInfo;
        try {
            let cont = parseModel(modelInfo);
            cont.then(() => {
                let input = {
                    'AbstractFactory': fs.readFileSync('./src/models/abstract/AbstractFactory.sol', 'utf8'),
                    'AbstractRegistry': fs.readFileSync('./src/models/abstract/AbstractRegistry.sol', 'utf8'),
                    'AbstractWorklist': fs.readFileSync('./src/models/abstract/AbstractWorklist.sol', 'utf8'),
                    'ProcessRegistry': fs.readFileSync('./src/models/abstract/ProcessRegistry.sol', 'utf8'),
                    'AbstractProcess': fs.readFileSync('./src/models/abstract/AbstractProcess.sol', 'utf8'),
                    'BindingAccessControl' : fs.readFileSync('./src/models/dynamic_binding/runtime_solidity/BindingAccessControl.sol', 'utf8')
                };
                input[modelInfo.id] = modelInfo.solidity;
    
                console.log('=============================================');
                console.log("SOLIDITY CODE");
                console.log('=============================================');
                console.log(modelInfo.solidity);
                console.log('....................................................................');
    
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
                    var gasEstimate = web3.eth.estimateGas({data: bytecode});
                    // console.log(".............................................");
                    // console.log("Contract Name: " + key.split(':')[1]);
                    // console.log("Gas Estimation: " + gasEstimate);
                    
                });
                console.log('....................................................................');
                console.log('STARTING PROCESS MODEL REGISTRATION ...');
                registerModel(modelInfo, output.contracts, res);
            })
        } catch (e) {
            console.log("ERROR: ", e);
            res.status(400).send(e);
            console.log('----------------------------------------------------------------------------------------------');
        }
    }
});

// Creating a new instance of a registered (root) process

let caseCreatorMap: Map<string, string> = new Map();

models.post('/models/:bundleId', (req, res) => {
    if (verifyAddress(req.body.caseCreator, 'Case Creator', res) && processRegistryContract !== undefined) {
        let _taskRoleId = web3.toAscii(processRegistryContract.taskRoleMapFromId.call(req.params.bundleId)).toString().substr(0, 24);
        roleTaskSchema.find({_id: _taskRoleId},
            (err, repoDataTaskRole) => {
                if (!err && repoDataTaskRole && repoDataTaskRole.length > 0) {
                    let _policyId = web3.toAscii(processRegistryContract.bindingPolicyFromId.call(req.params.bundleId)).toString().substr(0, 24);
                    policySchema.find({_id: _policyId},
                        (err, repoDataPolicy) => {
                            if (!err && repoDataPolicy && repoDataPolicy.length > 0) {
                                let roleIndexMap = findRoleMap(repoDataPolicy[0].indexToRole);
                                if (!roleIndexMap.has(req.body.creatorRole)) {
                                    console.log('Case Creator Role NOT found');
                                    res.status(404).send('Case Creator Role NOT found');
                                    console.log('----------------------------------------------------------------------------------------------');
                                } else {
                                    repoSchema.find({_id: req.params.bundleId},
                                        (err, repoData) => {
                                            if (err)
                                                res.status(404).send('Process model not found');
                                            else {
                                                console.log("TRYING TO CREATE INSTANCE OF CONTRACT: ", repoData[0].rootProcessID);
                                                let AccessControlContract = web3.eth.contract(JSON.parse(repoDataPolicy[0].accessControlAbi));
                                                AccessControlContract.new(processRegistryContract.address, repoDataPolicy[0].address, repoDataTaskRole[0].address,
                                                    {
                                                        from: req.body.caseCreator,
                                                        data: "0x" + repoDataPolicy[0].accessControlBytecode,
                                                        gas: 4700000
                                                    },
                                                    (err, contract) => {
                                                        if (err) {
                                                            console.log(`ERROR: BindingAccessControl instance creation failed`);
                                                            console.log('RESULT ', err);
                                                            res.status(403).send(err);
                                                        } else if (contract.address) {                                                   
                                                            let policyGas = web3.eth.getTransactionReceipt(contract.transactionHash).gasUsed;
                                                            console.log("BindingAccessControl Contract DEPLOYED and RUNNING at " + contract.address.toString());
                                                            console.log('Gas Used: ', policyGas);
                                                            console.log('....................................................................');
                                                            
                                                            processRegistryContract.newBundleInstanceFor(repoData[0]._id.toString(), 0, contract.address, {
                                                                    from: web3.eth.accounts[executionAccount],
                                                                    gas: 4500000
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
                                                                                    console.log('Root Process Contract DEPLOYED and RUNNING !!! AT ADDRESS: ', processAddress);
                                                                                    console.log('GAS USED: ', web3.eth.getTransactionReceipt(resEvt.transactionHash).gasUsed);
                                                                                    console.log('....................................................................');
                                                                                    
                                                                                    contract.nominateCaseCreator(roleIndexMap.get(req.body.creatorRole), req.body.caseCreator, processAddress, {
                                                                                        from: req.body.caseCreator,
                                                                                        gas: 4700000
                                                                                    },
                                                                                    (error1, result1) => {
                                                                                        if (result1) {
                                                                                            console.log("Case-creator nominated ");
                                                                                            caseCreatorMap.set(result1, processAddress);
                                                                                            console.log('----------------------------------------------------------------------------------------------');
                                                                                            res.status(200).send({
                                                                                                address: processAddress, 
                                                                                                gas: web3.eth.getTransactionReceipt(resEvt.transactionHash).gasUsed,
                                                                                                runtimeAddress: contract.address.toString(),
                                                                                                runtimeGas: policyGas,
                                                                                                transactionHash: result1,
                                                                                            });
                                                                                        }
                                                                                        else {
                                                                                            console.log('ERROR ', error1);
                                                                                            console.log('----------------------------------------------------------------------------------------------');
                                                                                            res.status(200).send({ERROR: error1});
                                                                                        }
                                                                                    })
                                                                                }
                                                                            } else {
                                                                                console.log('ERROR ', errEvt);
                                                                                console.log('----------------------------------------------------------------------------------------------');
                                                                                res.status(400).send(errEvt);
                                                                            }
                                                                        });
                                                                    } else {
                                                                        console.log('ERROR ', errNew);
                                                                        console.log('----------------------------------------------------------------------------------------------');
                                                                        res.status(400).send(errNew);
                                                                    }
                                                                });
                                                        }
                                                    });   
                                            }
                                        });
                                }
                            } else {
                                console.log('UNDEFINED POLICY CONTRACT');
                                res.status(400).send({'state' : 'UNDEFINED POLICY CONTRACT'});
                                return;
                            }
                        })

                } else {
                    console.log('Task-Role Contract NOT found');
                    res.status(404).send('Task-Role Contract NOT found');
                    console.log('----------------------------------------------------------------------------------------------');
                }
        })
    } else
        res.status(404).send('Process model not found');
});

// Querying activation for a given process (repository ID provided)

models.get('/processes/:procAddress', (req, res) => {
    let contractAddress = req.params.procAddress;
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
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(400).send({});
                }
            })
    } else {
        console.log('Instance Not Found');
        res.status(400).send({});
    }
});

// Performing an operation on a started workitem: Execute, Allocate, Revoke.
models.post('/workitems/:worklistAddress/:reqId', (req, res) => {
    let worklistAddress = req.params.worklistAddress;
    let reqId = req.params.reqId;
    if(! web3.isAddress(req.body.user)) {
        console.log('Error: ', `Invalid Addres '${req.body.user}' of user trying to perform the operation.`);
        console.log('----------------------------------------------------------------------------------------------');
        res.status(400).send(`Invalid Addres '${req.body.user}' of user trying to perform the operation.`);
    } else if (processRegistryContract) {
        let bundleId = web3.toAscii(processRegistryContract.worklistBundleFor.call(worklistAddress)).toString().substr(0, 24);
        repoSchema.find({_id: bundleId},
            (err, repoData) => {
                if (!err && repoData && repoData.length > 0) {
                    let worklistInstance = web3.eth.contract(JSON.parse(repoData[0].worklistAbi)).at(worklistAddress);
                    let nodeIndex = worklistInstance.elementIndexFor.call(reqId);
                    let node = repoData[0].indexToElement[nodeIndex];
                    let inputParams = req.body.inputParameters;
                    let realParameters = [];
                    let functionName = '';

                    realParameters = inputParams.length > 0 ? [reqId].concat(inputParams) : [reqId];
                    console.log(`WANT TO EXECUTE TASK: ${node.name}, ON WORKLIST: ${worklistAddress}`);
                    functionName = node.name;

                    worklistInstance[functionName].apply(this, realParameters.concat({
                        from: req.body.user,
                        gas: 4700000
                     }, (error, result) => {
                       if (error) {
                         console.log('ERROR: ' + error);
                         console.log('----------------------------------------------------------------------------------------------');
                         res.status(400).send('Error');
                       } else {
                         console.log(`TRANSACTION: ${result}, PENDING !!!`);
                         console.log('----------------------------------------------------------------------------------------------');
                         res.status(200).send({transactionHash: result});
                       }
                     }));
                } else {
                    console.log('Error: ', err);
                    console.log('----------------------------------------------------------------------------------------------');
                    res.status(400).send('Error');
                }
            })
    } else {
        console.log('Error: ', 'Process Registry Undefined');
        res.status(400).send('Process Registry Undefined');
    }
});

/////////////// Methods for deploying model //////////////////////

// Step 1. Model Registration: Collects the compilation artifacts of the produced models, 
//         and saves all these metadata as an entry in the Process Repository.

let registerModel = (modelInfo, contracts, response) => {
    // Sorting elements such that children are created first
    let queue = [{nodeId: modelInfo.id, nodeName: modelInfo.name, bundleId: '', nodeIndex: 0, bundleParent: '', factoryContract: ''}];
    for (let i = 0; i < queue.length; i++) {
        if (modelInfo.controlFlowInfoMap.has(queue[i].nodeId)) {
            let cfInfo = modelInfo.controlFlowInfoMap.get(queue[i].nodeId);
            let candidates = [cfInfo.multiinstanceActivities, cfInfo.nonInterruptingEvents, cfInfo.callActivities];
            candidates.forEach(children => {
                if (children) {
                    children.forEach((value, key) => {
                        queue.push({nodeId: key, nodeName: value, bundleId: '', nodeIndex: 0, bundleParent: '', factoryContract: '' });
                    })
                }
            })
        }
    }
    queue.reverse();
    let nodeIndexes = new Map();
    for (let i = 0; i < queue.length; i++)
        nodeIndexes.set(queue[i].nodeId, i);
    console.log('....................................................................');
    console.log('UPDATING COMPILATION ARTIFACTS IN REPOSITORY ...');
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
                let role = "None";
                let indexRole = 0;
                if (controlFlowInfo.callActivities.has(nodeId) || controlFlowInfo.multiinstanceActivities.has(nodeId) || controlFlowInfo.nonInterruptingEvents.has(nodeId))
                    type = "Separate-Instance";
                else if (element.$type === 'bpmn:ServiceTask')
                    type = "Service";
                else if (element.$type === 'bpmn:UserTask' || element.$type === 'bpmn:ReceiveTask' || controlFlowInfo.catchingMessages.indexOf(nodeId) >= 0) {
                    type = "Workitem";
                    if(!controlFlowInfo.taskRoleMap.has(nodeId))
                        throw 'No role related to User Task: ' + controlFlowInfo.nodeNameMap.get(nodeId);
                    role = controlFlowInfo.taskRoleMap.get(nodeId);
                }
                indexToFunctionName[controlFlowInfo.nodeIndexMap.get(nodeId)] = {
                    name: controlFlowInfo.nodeNameMap.get(nodeId),
                    id: nodeId,
                    type: type,
                    role: role
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
        console.log('....................................................................');
        console.log('RELATING PARENT TO NESTED CHILDREN IN REGISTRY  ...');
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
                    console.log('....................................................................');
                    let removedCallActivities = [];
                    sortedElements.forEach(element => {
                        if (modelInfo.controlFlowInfoMap.has(element.nodeId) || modelInfo.globalNodeMap.get(element.nodeId).$type === 'bpmn:StartEvent') {
                            removedCallActivities.push(element);
                        }
                    });
                    if (removedCallActivities.length > 0) {
                        console.log('DEPLOYING FACTORIES AND UPDATING PROCESS-FACTORY RELATION IN REGISTRY ...');
                        registerFactory(0, removedCallActivities, outputContracts, modelInfo, response);
                    }
                }
            }
            else {
                 console.log('ERROR ', error);
                 response.status(400).send(error);
            }
        })
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
                continueFactoryRegistration(currentIndex, sortedElements, outputContracts, contractF, modelInfo, response);
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
                console.log('....................................................................');
                if (currentIndex + 1 < sortedElements.length) {
                    registerFactory(currentIndex + 1, sortedElements, outputContracts, modelInfo, response);
                } else {
                    console.log('....................................................................');
                    console.log('DEPLOYONG WORKLIST CONTRACTS AND UPDATING PROCESS REGISTRY ...');
                    createWorklistInstances(0, sortedElements, outputContracts, modelInfo, response);
                }
            }
            else {
                 console.log('Error ', error1);
                 response.status(400).send(error1); 
            }
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
                                console.log('....................................................................');
                                sortedElements[currentIndex] = {
                                    nodeId: sortedElements[currentIndex].nodeId,
                                    nodeName: sortedElements[currentIndex].nodeName,
                                    bundleId: sortedElements[currentIndex].bundleId,
                                    bundleParent: sortedElements[currentIndex].bundleParent,
                                    worklist: contractW.address
                                };
                                continueWorklistCreation(currentIndex, sortedElements, outputContracts, modelInfo, response);
                            }
                            else {
                                console.log('ERROR ', error1);
                                response.status(400).send(error1);
                            }
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
        let bundleId = '';
        for (let i = 0; i < sortedElements.length; i++) {
            if (sortedElements[i].nodeName === modelInfo.name) {
                bundleId = sortedElements[i].bundleId;
                    break;
            }
        }
        console.log('----------------------------------------------------------------------------------------------');
        response.status(200).send({
            id: bundleId,
            name: modelInfo.name,
            bpmn: modelInfo.bpmn,
            solidity: modelInfo.solidity
        });
    }
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
                                            workitems[j].pCases.push(worklistInstance.processInstanceFor.call(i));
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
                                            pCases: [contractAddress],
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
                             console.log("pCases: ", elem.pCases)
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

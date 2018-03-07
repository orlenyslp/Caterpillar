
import * as BpmnModdle from 'bpmn-moddle';
import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import * as BigNumber from 'bignumber.js';
import { ControlFlowInfo, ModelInfo, ParameterInfo, OracleInfo } from './definitions';

const bpmn2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/bpmn2sol.ejs', 'utf-8');
let bpmn2solTemplate = ejs.compile(bpmn2solEJS);

const workList2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/workList2sol.ejs', 'utf-8');
let workList2solTemplate = ejs.compile(workList2solEJS);

let moddle = new BpmnModdle();
let parseBpmn = (bpmnDoc) => {
    return new Promise((resolve, reject) => {
        moddle.fromXML(bpmnDoc, (err, definitions) => {
            if (!err)
                resolve(definitions);
            else
                reject(err);
        });
    });
};

let is = (element, type) => element.$instanceOf(type);
let collectControlFlowInfo = (proc: any, globalNodeMap: Map<string, any>,
    globalControlFlowInfo: Array<ControlFlowInfo>): ControlFlowInfo => {
    let nodeList: Array<string> = new Array();
    let edgeList: Array<string> = new Array();
    let boundaryEvents: Array<string> = new Array();
    let nonBlockingBoundaryEvents: Array<string> = new Array();
    let controlFlowInfo: ControlFlowInfo;

    for (let node of proc.flowElements.filter((e) => is(e, "bpmn:FlowNode"))) {
        if (is(node, "bpmn:BoundaryEvent")) {
            boundaryEvents.push(node.id);
            if (node.cancelActivity == false)
                nonBlockingBoundaryEvents.push(node.id);
        } else {
            nodeList.push(node.id);
        }
        globalNodeMap.set(node.id, node);
    }

    var sources = [...nodeList];

    for (let flowEdge of proc.flowElements.filter((e) => is(e, "bpmn:SequenceFlow"))) {
        if (sources.indexOf(flowEdge.targetRef.id) > -1) {
            sources.splice(sources.indexOf(flowEdge.targetRef.id), 1);
        }
        edgeList.push(flowEdge.id);
    }

    // Let us remove all source elements from the node list
    nodeList = nodeList.filter((node: string) => sources.indexOf(node) < 0);

    if (nonBlockingBoundaryEvents.length > 0) {
        let dfs = (sources: string[]) => {
            let open = [...sources];
            let nodeList: Array<string> = new Array();
            let edgeList: Array<string> = new Array();
            while (open.length > 0) {
                let currId = open.pop();
                let curr = globalNodeMap.get(currId);
                nodeList.push(currId);
                if (curr.outgoing && curr.outgoing.length > 0)
                    for (let succEdge of curr.outgoing) {
                        let succ = succEdge.targetRef;
                        edgeList.push(succEdge.id);
                        if (open.indexOf(succ.id) < 0 && nodeList.indexOf(succ.id) < 0)
                            open.push(succ.id);
                    }
            }
            return [nodeList, edgeList];
        }
        let [mainPathNodeList, mainPathEdgeList] = dfs(sources);
        var localBoundary = [];
        boundaryEvents.forEach(evtId => {
            if (nonBlockingBoundaryEvents.indexOf(evtId) < 0)
                localBoundary.push(evtId);
        })
        if (localBoundary.length > 0) {
            let [boundaryNodePath, boundaryEdgePath] = dfs(localBoundary);
            boundaryNodePath = boundaryNodePath.filter((node: string) => localBoundary.indexOf(node) < 0);
            mainPathNodeList = mainPathNodeList.concat(boundaryNodePath);
            mainPathEdgeList = mainPathEdgeList.concat(boundaryEdgePath);
        }

        // Let us remove all source elements from the node list
        mainPathNodeList = mainPathNodeList.filter((node: string) => sources.indexOf(node) < 0);

        controlFlowInfo = new ControlFlowInfo(proc, mainPathNodeList, mainPathEdgeList, sources, boundaryEvents);
        globalControlFlowInfo.push(controlFlowInfo);
        for (let eventId of nonBlockingBoundaryEvents) {
            let event = globalNodeMap.get(eventId);
            if (!mainPathNodeList.find((e: string) => event.attachedToRef.id === e)) {
                throw new Error('ERROR: Found non-interrupting event which is not attached to a subprocess in the main process path');
            }

            let [localNodeList, localEdgeList] = dfs([eventId]);
            if (mainPathNodeList.filter((nodeId: string) => localNodeList.indexOf(nodeId) >= 0).length > 0)
                throw new Error('ERROR: Non-interrupting event outgoing path is not synchronized and merges with main process path');

            // Let us remove all source elements from the node list
            localNodeList = localNodeList.filter((node: string) => sources.indexOf(node) < 0);

            let childControlFlowInfo = new ControlFlowInfo(event, localNodeList, localEdgeList, [eventId], []);
            childControlFlowInfo.parent = proc;
            globalControlFlowInfo.push(childControlFlowInfo);
        }
    } else {
        controlFlowInfo = new ControlFlowInfo(proc, nodeList, edgeList, sources, boundaryEvents);
        globalControlFlowInfo.push(controlFlowInfo);
    }

    for (let subprocess of proc.flowElements.filter((e) => is(e, "bpmn:SubProcess"))) {
        let subprocessControlFlowInfo =
            collectControlFlowInfo(subprocess, globalNodeMap, globalControlFlowInfo);
        subprocessControlFlowInfo.parent = proc;

        if (!(subprocess.loopCharacteristics &&
            subprocess.loopCharacteristics.$type === 'bpmn:MultiInstanceLoopCharacteristics')) {
            // Subprocess is embedded ... then copy all nodes and edges to the parent process
            subprocessControlFlowInfo.isEmbedded = true;

            controlFlowInfo.nodeList = controlFlowInfo.nodeList.concat(subprocessControlFlowInfo.nodeList);
            controlFlowInfo.edgeList = controlFlowInfo.edgeList.concat(subprocessControlFlowInfo.edgeList);
        }
    }
    if (proc.documentation) {
        controlFlowInfo.globalParameters = proc.documentation[0].text;
    }

    return controlFlowInfo;
};

let extractParameters = (cad, nodeId, controlFlowInfo) => {
    // Extracting Information of Oracle from Service Tasks (if aplicable) 
    var oracle_Data = '';
    for (let j = 0, first = false; j < cad.length; j++) {
        if (cad.charAt(j) === '(') {
            if (!first) first = true;
            else {
                cad = cad.substr(j);
                break;
            }
        }
        if (cad.charAt(j) === ':') {
            oracle_Data = '';
            break;
        }
        oracle_Data += cad.charAt(j);
    }
    // Processing Information of function parameters (both service and user tasks) 
    cad = cad.replace("(", " ").replace(")", " ").trim();
    cad = cad.replace("(", " ").replace(")", " ").trim();
    var firstSplit = cad.split(":");
    var secondSplit = firstSplit[firstSplit.length - 1].trim().split("->");
    var resMap: Map<string, Array<string>> = new Map();

    var inputOutput = [firstSplit[0].trim(), secondSplit[0].trim()];
    var parameterType = ['input', 'output'];
    var bodyString = secondSplit[secondSplit.length - 1].trim();
    resMap.set('body', [secondSplit[secondSplit.length - 1].trim()]);

    for (let i = 0; i < inputOutput.length; i++) {
        var temp = inputOutput[i].split(",");
        var res = [];
        temp.forEach(subCad => {
            var aux = subCad.trim().split(" ");
            if (aux[0].trim().length > 0) {
                res.push(aux[0].trim());
                res.push(aux[aux.length - 1].trim());
            }
        })
        resMap.set(parameterType[i], res);
    }
    // Updating Information of Oracle in controlFlowInfo
    if (controlFlowInfo != null) {
        let parameters: Array<ParameterInfo> = new Array();
        var toIterate = resMap.get('input');
        for (let i = 0; i < toIterate.length; i += 2)
            parameters.push(new ParameterInfo(toIterate[i], toIterate[i + 1]));
        if (oracle_Data.length > 0) {
            oracle_Data = oracle_Data = oracle_Data.trim().replace(" ", "_");
            oracle_Data = oracle_Data.replace("(", " ").replace(").", " ").trim();
            var splitResult = oracle_Data.split(" ");
            if (!controlFlowInfo.oracleInfo.has(splitResult[0])) {
                controlFlowInfo.oracleInfo.set(splitResult[0], new OracleInfo(splitResult[0]));
            }
            controlFlowInfo.oracleTaskMap.set(nodeId, splitResult[0]);
            var localOracle = controlFlowInfo.oracleInfo.get(splitResult[0]);
            localOracle.address = splitResult[1];
            localOracle.functionName = splitResult[2];
            localOracle.functionParameters = parameters;
        } else
            controlFlowInfo.localParameters.set(nodeId, parameters);
    }
    return resMap;
};

let getNodeName = (node: any) => node.name ? node.name.replace(/\s+/g, '_') : node.id;



export let parseModel = (modelInfo: ModelInfo) => new Promise((resolve, reject) => {
    parseBpmn(modelInfo.bpmn).then((definitions: any) => {
        modelInfo.solidity = 'pragma solidity ^0.4.14;\n';
        modelInfo.controlFlowInfoMap = new Map();

        // Sanity checks
        if (!definitions.diagrams || definitions.diagrams.length == 0)
            throw new Error('ERROR: No diagram found in BPMN file');
        let proc = definitions.diagrams[0].plane.bpmnElement;
        if (proc.$type !== 'bpmn:Process')
            throw new Error('ERROR: No root process model found');

        // BPMN to Solidity parsing

        let globalNodeMap: Map<string, any> = new Map(),
            globalNodeIndexMap: Map<string, number> = new Map(),
            globalEdgeIndexMap: Map<string, number> = new Map(),
            globalControlFlowInfo: Array<ControlFlowInfo> = new Array();

        globalNodeMap.set(proc.id, proc);
        let mainControlFlowInfo = collectControlFlowInfo(proc, globalNodeMap, globalControlFlowInfo);
        let globalControlFlowInfoMap: Map<string, ControlFlowInfo> = new Map();
        globalControlFlowInfo.forEach(controlFlowInfo => globalControlFlowInfoMap.set(controlFlowInfo.self.id, controlFlowInfo));

        // Event sub-processes appear in the source list, and not in the nodeList
        // In addition, all the elements of a non interrupting subprocess event appears embedded on its parent process
        for (let controlFlowInfo of globalControlFlowInfo) {

            var indexesToRemove = [];
            controlFlowInfo.sources.forEach(nodeId => {
                if (globalNodeMap.get(nodeId).triggeredByEvent) {
                    controlFlowInfo.nodeList.push(nodeId);
                    indexesToRemove.push(controlFlowInfo.sources.indexOf(nodeId));
                    var nodeInfo = globalControlFlowInfoMap.get(nodeId);
                    if (!globalNodeMap.get(nodeInfo.sources[0]).isInterrupting)
                        nodeInfo.nodeList.forEach(childId => {
                            var index = controlFlowInfo.nodeList.indexOf(childId);
                            if (index >= 0)
                                controlFlowInfo.nodeList.splice(index, 1);
                        })
                }
            })
            indexesToRemove.sort((ind1, ind2) => { return ind2 - ind1; });
            indexesToRemove.forEach(index => {
                controlFlowInfo.sources.splice(index, 1);
            })
            if (is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:SubProcess") && controlFlowInfo.self.triggeredByEvent && globalNodeMap.get(controlFlowInfo.sources[0]).isInterrupting == false) {
                controlFlowInfo.isEmbedded = false;
            }
        }

        let hasExternalCall = (nodeId) => {
            var node = globalNodeMap.get(nodeId);
            return is(node, 'bpmn:UserTask') || is(node, 'bpmn:ServiceTask') || is(node, 'bpmn:ReceiveTask') || 
                    (node.eventDefinitions && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition") && 
                    !is(node, 'bpmn:IntermediateThrowEvent') && !is(node, 'bpmn:EndEvent'));
        }

        for (let controlFlowInfo of globalControlFlowInfo) {
            controlFlowInfo.activeMessages = [];
            if (!controlFlowInfo.isEmbedded) {
                var multiinstanceActivities = [], callActivities = [], nonInterruptingEvents = [], catchingMessages = [];

                controlFlowInfo.nodeList.map(nodeId => globalNodeMap.get(nodeId))
                    .forEach(e => {
                        if (((is(e, "bpmn:Task") || is(e, "bpmn:SubProcess")) && e.loopCharacteristics && e.loopCharacteristics.$type === 'bpmn:MultiInstanceLoopCharacteristics')) {
                            controlFlowInfo.multiinstanceActivities.set(e.id, modelInfo.name + ':' + getNodeName(e) + '_Contract');
                            multiinstanceActivities.push(e.id);
                            if (is(e, "bpmn:SubProcess"))
                                controlFlowInfo.childSubprocesses.set(e.id, modelInfo.name + ':' + getNodeName(e) + '_Contract');
                        } else if (is(e, "bpmn:CallActivity")) {
                            controlFlowInfo.callActivities.set(e.id, getNodeName(e));
                            callActivities.push(e.id);
                        } else if (is(e, 'bpmn:IntermediateCatchEvent') && is(e.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                            catchingMessages.push(e.id);
                        else if (is(e, 'bpmn:StartEvent') && is(e.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                            catchingMessages.push(e.id);
                    });

                // It is also necessary to add boundary events of embedded sub-processes

                controlFlowInfo.sources.forEach(nodeId => {
                    var start = globalNodeMap.get(nodeId);
                    if (start.eventDefinitions && start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition") && controlFlowInfo.nodeList.indexOf(nodeId) < 0) {
                        controlFlowInfo.nodeList.push(nodeId);
                        if (catchingMessages.indexOf(nodeId) < 0)
                            catchingMessages.push(nodeId);
                    }
                })

                controlFlowInfo.boundaryEvents.forEach(nodeId => {
                    let node = globalNodeMap.get(nodeId);
                    if (node.outgoing)
                        for (let outgoing of node.outgoing)
                            controlFlowInfo.edgeList.push(outgoing.id);
                    if (!node.cancelActivity) {
                        controlFlowInfo.nonInterruptingEvents.set(node.id, modelInfo.name + ':' + getNodeName(node) + '_Contract');
                        nonInterruptingEvents.push(node.id);
                        controlFlowInfo.nodeList.push(nodeId); // Eager reinsertion
                        if (node.eventDefinitions[0] && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                            if (controlFlowInfo.activeMessages.indexOf(nodeId) < 0)
                                controlFlowInfo.activeMessages.push(nodeId);
                            if (catchingMessages.indexOf(nodeId) < 0)
                                catchingMessages.push(nodeId);
                        }
                    } else if (node.eventDefinitions && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                        if (controlFlowInfo.nodeList.indexOf(nodeId) < 0)
                            controlFlowInfo.nodeList.push(nodeId);
                        if (catchingMessages.indexOf(nodeId) < 0)
                            catchingMessages.push(nodeId);
                    }
                });

                globalNodeMap.forEach(node => {
                    if (is(node, 'bpmn:SubProcess') && node.triggeredByEvent && controlFlowInfo.self.id === node.$parent.id) {
                        for (let start of node.flowElements.filter((e) => is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent"))) {
                            if (start.isInterrupting == false) {
                                var parent = globalNodeMap.get(start.$parent.id);
                                controlFlowInfo.nonInterruptingEvents.set(start.id, modelInfo.name + ':' + getNodeName(parent) + '_Contract');
                                nonInterruptingEvents.push(start.id);
                                controlFlowInfo.nodeList.push(start.id);
                                if (start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                                    if (controlFlowInfo.activeMessages.indexOf(start.id) < 0)
                                        controlFlowInfo.activeMessages.push(start.id);
                                    if (catchingMessages.indexOf(start.id) < 0)
                                        catchingMessages.push(start.id);
                                }
                            }
                            if (start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                                if (controlFlowInfo.nodeList.indexOf(start.id) < 0)
                                    controlFlowInfo.nodeList.push(start.id);
                                if (catchingMessages.indexOf(start.id) < 0)
                                    catchingMessages.push(start.id);
                            }

                            if (start.outgoing)
                                for (let outgoing of start.outgoing)
                                    controlFlowInfo.edgeList.push(outgoing.id);
                        }
                    }
                });

                let firstInd = 0, lastInd = controlFlowInfo.nodeList.length - 1;
                let part1: Array<string> = new Array();
                let part2: Array<string> = new Array();
                controlFlowInfo.nodeList.forEach(nodeId => {
                    if(hasExternalCall(nodeId))
                        part1.push(nodeId);
                    else
                        part2.push(nodeId)
                })
                controlFlowInfo.nodeList = part1.concat(part2);
                controlFlowInfo.nodeList.forEach((nodeId: string, index: number, array: string[]) => {
                    var node = globalNodeMap.get(nodeId);
                    controlFlowInfo.nodeIndexMap.set(nodeId, index);
                    globalNodeIndexMap.set(nodeId, index);
                    controlFlowInfo.nodeNameMap.set(nodeId, getNodeName(globalNodeMap.get(nodeId)));
                    if ((node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0))
                        extractParameters(node.documentation[0].text, node.id, controlFlowInfo);
                });
                controlFlowInfo.edgeList.forEach((edgeId: string, index: number, array: string[]) => {
                    controlFlowInfo.edgeIndexMap.set(edgeId, index + 1);
                    globalEdgeIndexMap.set(edgeId, index + 1);
                });

                let codeGenerationInfo = {
                    nodeList: controlFlowInfo.nodeList,
                    nodeMap: globalNodeMap,
                    activeMessages: controlFlowInfo.activeMessages,
                    multiinstanceActivities: multiinstanceActivities,
                    callActivities: callActivities,
                    nonInterruptingEvents: nonInterruptingEvents,
                    oracleInfo: controlFlowInfo.oracleInfo,
                    oracleTaskMap: controlFlowInfo.oracleTaskMap,
                    catchingMessages: catchingMessages,
                    processId: () => controlFlowInfo.self.id,
                    nodeName: (nodeId) => getNodeName(globalNodeMap.get(nodeId)),
                    eventType: (nodeId) => {
                        let node = globalNodeMap.get(nodeId);
                        if (node.eventDefinitions && node.eventDefinitions[0]) {
                            var cad = node.eventDefinitions[0].$type;
                            return cad.substring(5, cad.length - 15);
                        }
                        return 'Default';
                    },
                    allEventTypes: () => {
                        let taken = [];
                        globalNodeMap.forEach(node => {
                            if (node.eventDefinitions && node.eventDefinitions[0] && !is(node.eventDefinitions[0], 'bpmn:TerminateEventDefinition') && !is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition')) {
                                var cad = node.eventDefinitions[0].$type;
                                if (taken.indexOf(cad.substring(5, cad.length - 15)) < 0)
                                    taken.push(cad.substring(5, cad.length - 15));
                            }
                        })
                        return taken;
                    },
                    getMessages: () => {
                        let taken = [];
                        var candidates = controlFlowInfo.boundaryEvents;
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            if (is(globalNodeMap.get(nodeId), "bpmn:SubProcess")) {
                                var subP = globalControlFlowInfoMap.get(nodeId);
                                candidates = candidates.concat(subP.boundaryEvents);
                                subP.sources.forEach(id => {
                                    if (!is(globalNodeMap.get(id), "bpmn:Subprocess") && candidates.indexOf(id) < 0)
                                        candidates.push(id);
                                })
                            }
                        })
                        candidates.forEach(evtId => {
                            var evt = globalNodeMap.get(evtId);
                            if (evt.eventDefinitions && evt.eventDefinitions[0] && is(evt.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                taken.push(evt);
                        })
                        return taken;
                    },
                    getThrowingMessages: () => {
                        var res = [];
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            var node = globalNodeMap.get(nodeId);
                            if ((is(node, "bpmn:EndEvent") || is(node, "bpmn:IntermediateThrowEvent")) && node.eventDefinitions && node.eventDefinitions[0] && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                res.push(nodeId);
                        })
                        return res;
                    },
                    getThrowingEvents: (subprocId, evType) => {
                        let res = [];
                        globalNodeMap.forEach(node => {
                            if (node.eventDefinitions && node.eventDefinitions[0]) {
                                var cad = node.eventDefinitions[0].$type;
                                if (cad.substring(5, cad.length - 15) === evType) {
                                    if ((is(node, 'bpmn:EndEvent') || is(node, "bpmn:IntermediateThrowEvent")) && (node.$parent.id === subprocId || controlFlowInfo.nodeList.indexOf(node.id) >= 0)) {
                                        res.push(node.id);
                                    }
                                }
                            }
                        })
                        return res;
                    },
                    getCatchingEvents: (subprocId, evType) => {
                        let res = [];
                        globalNodeMap.forEach(node => {
                            if (node.eventDefinitions && node.eventDefinitions[0]) {
                                var cad = node.eventDefinitions[0].$type;
                                if (cad.substring(5, cad.length - 15) === evType) {
                                    if (is(node, 'bpmn:StartEvent')) {
                                        var parent = globalNodeMap.get(node.$parent.id);
                                        if (parent.triggeredByEvent && parent.$parent.id === subprocId)
                                            res.unshift(node.id);
                                        else if (!parent.triggeredByEvent && parent.id === subprocId)
                                            res.push(node.id);
                                    } else if (is(node, 'bpmn:BoundaryEvent') || is(node, 'bpmn:IntermediateCatchEvent')) {
                                        if (node.$parent.id === subprocId)
                                            res.push(node.id);
                                    }
                                }
                            }
                        })
                        return res;
                    },
                    getContracts2Call: () => {
                        var res = callActivities.concat(multiinstanceActivities);
                        nonInterruptingEvents.forEach(evtId => {
                            var node = globalNodeMap.get(evtId);
                            res.push(is(node, "bpmn:StartEvent") ? node.$parent.id : evtId);
                        })
                        return res;
                    },
                    getCountExternalTasks: () => {
                        var res = 0;
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            if(hasExternalCall(nodeId))
                                res++;
                        })
                        return res;
                    },
                    getStartedMessages: (processId) => {
                        var res = [];
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            var node = globalNodeMap.get(nodeId);
                            if (is(node, 'bpmn:StartEvent') && node.$parent.id === processId && node.eventDefinitions && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition') && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                                res.push(nodeId);
                        })
                        return res;
                    },
                    getParent: (nodeId) => {         // Retrieves the id of the parent
                        var node = globalNodeMap.get(nodeId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return globalNodeMap.get(node.$parent.id).$parent.id;
                        if (is(node, "bpmn:BoundaryEvent") && node.cancelActivity)
                            return node.attachedToRef.id;
                        return node.$parent ? node.$parent.id : nodeId;
                    },
                    getContractName: (nodeId) => {    // Retrieves the contract name related to the node.
                        var node = globalNodeMap.get(nodeId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return node.$parent.id;
                        if (is(node, "bpmn:BoundaryEvent"))
                            return node.id;
                        return controlFlowInfo.self.id;
                    },
                    getAllChildren: (subprocId, direct) => {
                        let taken = direct ? [] : [subprocId];
                        controlFlowInfo.nodeList.map(nodeId => globalNodeMap.get(nodeId))
                            .forEach(e => {
                                if (is(e, "bpmn:SubProcess") || callActivities.indexOf(e.id) >= 0 || (nonInterruptingEvents.indexOf(e.id) >= 0 && !is(e, "bpmn:StartEvent")))
                                    if (((direct && subprocId !== e.id && e.$parent.id === subprocId) || !direct) && taken.indexOf(e.id) < 0)
                                        taken.push(e.id);
                            });
                        return taken;
                    },
                    isStartingContractEvent: (eventId, processId) => {
                        var evt = globalNodeMap.get(eventId);
                        if (is(evt, "bpmn:StartEvent")) {
                            if (globalNodeMap.get(evt.$parent.id).triggeredByEvent)
                                return evt.$parent.id !== processId;
                            if (is(evt.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                return true;
                        } else if (is(evt, "bpmn:BoundaryEvent")) {
                            return eventId !== processId;
                        } else if (is(evt, 'bpmn:IntermediateCatchEvent') && is(evt.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                            return true;
                        return false;
                    },
                    isInterrupting: (eventId) => {  // True if an event is interrupting
                        var node = globalNodeMap.get(eventId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return node.isInterrupting != false;
                        if (is(node, "bpmn:BoundaryEvent"))
                            return node.cancelActivity != false;
                        return false;
                    },
                    isEmbeddedSubprocess: (subprocessId) => {
                        return globalControlFlowInfoMap.get(subprocessId).isEmbedded;
                    },
                    isBoundaryEvent: (evtId) => {
                        return controlFlowInfo.boundaryEvents.indexOf(evtId) >= 0;
                    },
                    preMarking: (nodeId) => {
                        let node = globalNodeMap.get(nodeId);
                        var bitarray = [];
                        if (node.incoming)
                            for (let incoming of node.incoming)
                                bitarray[controlFlowInfo.edgeIndexMap.get(incoming.id)] = 1;
                        else
                            bitarray[0] = 1;
                        var result = '0b';
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    postMarking: (nodeId) => {
                        let node = globalNodeMap.get(nodeId);
                        var bitarray = [];
                        var result = '0b';
                        if (node.outgoing)
                            for (let outgoing of node.outgoing) {
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        else
                            result = '0';
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    subprocessNodeMarking: (subprocessId) => {
                        var bitarray = [];
                        globalNodeMap.forEach(node => {
                            if (node.$parent && node.$parent.id === subprocessId) {
                                if (is(node, 'bpmn:Task'))
                                    bitarray[globalNodeIndexMap.get(node.id)] = 1;
                                else if (!globalNodeMap.get(subprocessId).triggeredByEvent && node.eventDefinitions && node.eventDefinitions[0] && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                    bitarray[globalNodeIndexMap.get(node.id)] = 1;
                            }
                        })
                        var result = bitarray.length > 0 ? '0b' : 0;
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    subprocessStartMarking: (subprocessId) => {
                        var toSearch = globalNodeMap.get(subprocessId);
                        var bitarray = [];
                        var result = '0b';
                        if (is(toSearch, 'bpmn:BoundaryEvent')) {
                            for (let outgoing of toSearch.outgoing)
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                        }
                        else {
                            for (let node of toSearch.flowElements.filter((e) => is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent"))) {
                                if (node.$parent.id === subprocessId)
                                    if (!globalNodeMap.get(node.$parent.id).triggeredByEvent && node.eventDefinitions && node.eventDefinitions[0] && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                        bitarray[0] = 1;
                                    else if (node.outgoing)
                                        for (let outgoing of node.outgoing)
                                            bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        }
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    subprocessMarking: (subprocessId) => {
                        var bitarray = [];
                        var result = '0b';
                        var localInfo = globalControlFlowInfoMap.get(subprocessId);
                        if (is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:BoundaryEvent") && multiinstanceActivities.indexOf(subprocessId) < 0) {
                            var parentInfo = globalControlFlowInfoMap.get(controlFlowInfo.self.$parent.id);
                            localInfo.edgeList.forEach(edgeId => {
                                bitarray[parentInfo.edgeIndexMap.get(edgeId)] = 1;
                            })
                        } else {
                            localInfo.edgeList.forEach(edgeId => {
                                bitarray[controlFlowInfo.edgeIndexMap.get(edgeId)] = 1;
                            })
                        }
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    extendedSubprocessMarking: (subprocessId, orCondition) => {
                        var candidates = callActivities.concat(multiinstanceActivities.concat(nonInterruptingEvents));
                        var res = orCondition ? "|| (" : "\u0026" + "\u0026" + "(";
                        candidates.forEach(nodeId => {
                            var node = globalNodeMap.get(nodeId);
                            if (node.$parent.id === subprocessId) {
                                res += getNodeName(node) + "_activeInstances != 0 || ";
                            }
                        })
                        return res.length < 10 ? '' : res.substring(0, res.length - 4) + ")";
                    },
                    flowEdgeIndex: (flowEdgeId) => {
                        var bitarray = [];
                        bitarray[controlFlowInfo.edgeIndexMap.get(flowEdgeId)] = 1;
                        var result = '0b';
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    flowNodeIndex: (flowNodeId) => {
                        var bitarray = [];
                        bitarray[globalNodeIndexMap.get(flowNodeId)] = 1;
                        var result = '0b';
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    nodeRealIndex: (nodeId) => {
                        return globalNodeIndexMap.get(nodeId);
                    },
                    isPartOfDeferredChoice: (eventId) => {
                        let event = globalNodeMap.get(eventId);
                        if (event.incoming) {
                            let node = event.incoming[0].sourceRef;
                            return is(node, 'bpmn:EventBasedGateway');
                        }
                        return false;
                    },
                    getDeferredChoiceElements: (nodeId) => {
                        let event = globalNodeMap.get(nodeId);
                        let res = [];
                        if (event.incoming) {
                            let node = event.incoming[0].sourceRef;
                            if (is(node, 'bpmn:EventBasedGateway')) {
                                for (let outgoing of node.outgoing) {
                                    if (outgoing.targetRef.id !== nodeId)
                                        res.push(outgoing.targetRef.id);
                                }
                            }
                        }
                        console.log(res);
                        return res;
                    },
                    deferredChoiceMarking: (eventId) => {
                        let event = globalNodeMap.get(eventId);
                        let node = event.incoming[0].sourceRef;
                        var bitarray = [];
                        var result = '0b';
                        if (node.outgoing)
                            for (let outgoing of node.outgoing) {
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        else
                            result = '0';
                        for (let i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    globalDeclarations: () => {
                        if (controlFlowInfo.globalParameters.length > 0)
                            return controlFlowInfo.globalParameters;
                        else
                            return '';
                    },
                    getOracleFunction: (nodeId) => {
                        if(controlFlowInfo.oracleTaskMap.has(nodeId))
                            return controlFlowInfo.oracleInfo.get(controlFlowInfo.oracleTaskMap.get(nodeId)).functionName;
                        return "";
                    },
                    nodeParameters: (nodeId) => {
                        var node = globalNodeMap.get(nodeId);
                        if ((node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0)) {
                            if (extractParameters(node.documentation[0].text, nodeId, null).get('input').length > 0)
                                return true;
                            return false;
                        }
                        return false;
                    },
                    typeParameters: (nodeId, isInput, hasPreviousParameter) => {
                        var node = globalNodeMap.get(nodeId);
                        var res = "";
                        if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                            var localParams = isInput ? extractParameters(node.documentation[0].text, nodeId, null).get('input') : extractParameters(node.documentation[0].text, nodeId, null).get('output');
                            if (localParams.length > 0) {
                                res = localParams[0];
                                for (let i = 2; i < localParams.length; i += 2)
                                    res += ', ' + (localParams[i]);
                            }
                        }
                        return hasPreviousParameter && res.length > 0 ? ', ' + res : res;
                    },
                    concatParameters: (nodeId, isInput, hasType, hasPreviousParameter) => {
                        var node = globalNodeMap.get(nodeId);
                        var res = "";
                        if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                            var localParams = isInput ? extractParameters(node.documentation[0].text, nodeId, null).get('input') : extractParameters(node.documentation[0].text, nodeId, null).get('output');
                            if (localParams.length > 0) {
                                res = hasType ? localParams[0] + " " + localParams[1] : localParams[1];
                                for (let i = 2; i < localParams.length; i += 2)
                                    res += ',' + (hasType ? localParams[i] + " " + localParams[i + 1] : localParams[i + 1]);
                            }
                        }
                        return hasPreviousParameter && res.length > 0 ? ', ' + res : res;
                    },
                    nodeFunctionBody: (nodeId) => {
                        let node = globalNodeMap.get(nodeId);
                        if (node.script) {
                            return node.script.split('->');
                        } else if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                            return extractParameters(node.documentation[0].text, nodeId, null).get('body');
                        } else
                            return '';
                    },
                    getCondition: (flowEdge) => flowEdge.conditionExpression ? flowEdge.conditionExpression.body : flowEdge.name ? flowEdge.name : flowEdge.id,
                    is: is
                };

                let localSolidity = bpmn2solTemplate(codeGenerationInfo);

                // Code for using the WorkList template
                var userTaskList = [];
                var parameterInfo: Map<string, Array<ParameterInfo>> = new Map();
                var hasDefault = false;
                controlFlowInfo.nodeList.forEach(nodeId => {
                    var node = globalNodeMap.get(nodeId);
                    if (is(node, 'bpmn:Task') && !is(node, 'bpmn:ServiceTask') && !is(node, 'bpmn:ScriptTask')) {
                        if (controlFlowInfo.localParameters.has(nodeId) && controlFlowInfo.localParameters.get(nodeId).length > 0) {
                            userTaskList.push(nodeId);
                            parameterInfo.set(nodeId, controlFlowInfo.localParameters.get(nodeId));
                        } else
                            hasDefault = true;
                    }
                })
                if (hasDefault || userTaskList.length == 0)
                    userTaskList.push('defaultId');

                let workListGenerationInfo = {
                    nodeList: userTaskList,
                    parameterInfo: parameterInfo,
                    nodeMap: globalNodeMap,
                    processId: () => controlFlowInfo.self.id,
                    nodeName: (nodeId) => {
                        if (nodeId === 'defaultId')
                            return 'DefaultTask';
                        return getNodeName(globalNodeMap.get(nodeId))
                    },
                    getParameterType: (nodeId, isType) => {
                        var res = "";
                        var localParams = parameterInfo.get(nodeId);
                        if (localParams && localParams.length > 0) {
                            res = isType ? localParams[0].type : localParams[0].name;
                            for (let i = 1; i < localParams.length; i++)
                                res += isType ? ", " + localParams[i].type : ", " + localParams[i].name;
                        }
                        return res.length > 0 ? ', ' + res : res;
                    },
                    getParameters: (nodeId, hasType) => {
                        var res = "";
                        var localParams = parameterInfo.get(nodeId);
                        if (localParams && localParams.length > 0) {
                            res = hasType ? localParams[0].type + " " + localParams[0].name : localParams[0].name;
                            for (let i = 1; i < localParams.length; i++)
                                res += hasType ? ", " + localParams[i].type + " " + localParams[i].name : ", " + localParams[i].name;
                        }
                        return res.length > 0 ? ', ' + res : res;
                    },
                    is: is
                }
                let workListSolidity = workList2solTemplate(workListGenerationInfo);

                modelInfo.solidity += localSolidity;
                modelInfo.solidity += workListSolidity;
                modelInfo.controlFlowInfoMap.set(getNodeName(controlFlowInfo.self), controlFlowInfo);

            } else {
                controlFlowInfo.nodeList.forEach(nodeId =>
                    controlFlowInfo.nodeIndexMap.set(nodeId, globalNodeIndexMap.get(nodeId)));
                controlFlowInfo.edgeList.forEach(edgeId =>
                    controlFlowInfo.edgeIndexMap.set(edgeId, globalEdgeIndexMap.get(edgeId)));
            }
        }

        //////////////////////////////////////////////////////////////////////////////////       

        let entryContractName = modelInfo.name + ':' + (proc.name ? proc.name.replace(/\s+/g, '_') : proc.id) + '_Contract';

        modelInfo.entryContractName = entryContractName;

        resolve();

    }).catch(err => { throw new Error(err); });
});


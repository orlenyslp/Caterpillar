import * as BpmnModdle from "bpmn-moddle";
import * as fs from "fs";
import * as path from "path";
import * as ejs from "ejs";
import BigNumber from "bignumber.js";
import {
    ControlFlowInfo,
    ModelInfo,
    ParameterInfo,
    OracleInfo
} from "./definitions";

const bpmn2solEJS = fs.readFileSync(
    path.join(__dirname, "../../templates") + "/bpmn2sol.ejs",
    "utf-8"
);
let bpmn2solTemplate = ejs.compile(bpmn2solEJS);

const workList2solEJS = fs.readFileSync(
    path.join(__dirname, "../../templates") + "/workList2sol.ejs",
    "utf-8"
);
let workList2solTemplate = ejs.compile(workList2solEJS);

let moddle = new BpmnModdle();
let parseBpmn = bpmnDoc => {
    return new Promise((resolve, reject) => {
        moddle.fromXML(bpmnDoc, (err, definitions) => {
            if (!err) resolve(definitions);
            else reject(err);
        });
    });
};

let is = (element, type) => element.$instanceOf(type);
let collectControlFlowInfo: (proc: any, globalNodeMap: Map<string, any>, globalControlFlowInfo: Array<ControlFlowInfo>) => ControlFlowInfo;
collectControlFlowInfo = (proc: any,
                          globalNodeMap: Map<string, any>,
                          globalControlFlowInfo: Array<ControlFlowInfo>): ControlFlowInfo => {
    let nodeList: Array<string> = [];
    let edgeList: Array<string> = [];
    let boundaryEvents: Array<string> = [];
    let nonBlockingBoundaryEvents: Array<string> = [];
    let controlFlowInfo: ControlFlowInfo;

    for (let node of proc.flowElements.filter(e => is(e, "bpmn:FlowNode"))) {
        if (is(node, "bpmn:BoundaryEvent")) {
            boundaryEvents.push(node.id);
            if (node.cancelActivity == false) nonBlockingBoundaryEvents.push(node.id);
        } else {
            nodeList.push(node.id);
        }
        globalNodeMap.set(node.id, node);
    }

    let sources = [...nodeList];

    for (let flowEdge of proc.flowElements.filter(e =>
        is(e, "bpmn:SequenceFlow")
    )) {
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
            let nodeList: Array<string> = [];
            let edgeList: Array<string> = [];
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
        };
        let [mainPathNodeList, mainPathEdgeList] = dfs(sources);
        let localBoundary = [];
        boundaryEvents.forEach(evtId => {
            if (nonBlockingBoundaryEvents.indexOf(evtId) < 0)
                localBoundary.push(evtId);
        });
        if (localBoundary.length > 0) {
            let [boundaryNodePath, boundaryEdgePath] = dfs(localBoundary);
            boundaryNodePath = boundaryNodePath.filter(
                (node: string) => localBoundary.indexOf(node) < 0
            );
            mainPathNodeList = mainPathNodeList.concat(boundaryNodePath);
            mainPathEdgeList = mainPathEdgeList.concat(boundaryEdgePath);
        }

        // Let us remove all source elements from the node list
        mainPathNodeList = mainPathNodeList.filter((node: string) => sources.indexOf(node) < 0);

        controlFlowInfo = new ControlFlowInfo(
            proc,
            mainPathNodeList,
            mainPathEdgeList,
            sources,
            boundaryEvents
        );
        globalControlFlowInfo.push(controlFlowInfo);
        for (let eventId of nonBlockingBoundaryEvents) {
            let event = globalNodeMap.get(eventId);
            if (!mainPathNodeList.find((e: string) => event.attachedToRef.id === e)) {
                throw new Error(
                    "ERROR: Found non-interrupting event which is not attached to a subprocess in the main process path"
                );
            }

            let [localNodeList, localEdgeList] = dfs([eventId]);
            if (
                mainPathNodeList.filter(
                    (nodeId: string) => localNodeList.indexOf(nodeId) >= 0
                ).length > 0
            )
                throw new Error(
                    "ERROR: Non-interrupting event outgoing path is not synchronized and merges with main process path"
                );

            // Let us remove all source elements from the node list
            localNodeList = localNodeList.filter((node: string) => sources.indexOf(node) < 0);

            let childControlFlowInfo = new ControlFlowInfo(
                event,
                localNodeList,
                localEdgeList,
                [eventId],
                []
            );
            childControlFlowInfo.parent = proc;
            globalControlFlowInfo.push(childControlFlowInfo);
        }
    } else {
        controlFlowInfo = new ControlFlowInfo(
            proc,
            nodeList,
            edgeList,
            sources,
            boundaryEvents
        );
        globalControlFlowInfo.push(controlFlowInfo);
    }

    for (let subprocess of proc.flowElements.filter(e => is(e, "bpmn:SubProcess"))) {
        let subprocessControlFlowInfo = collectControlFlowInfo(subprocess, globalNodeMap, globalControlFlowInfo);
        subprocessControlFlowInfo.parent = proc;

        if (!(subprocess.loopCharacteristics && subprocess.loopCharacteristics.$type === "bpmn:MultiInstanceLoopCharacteristics")) {
            // Subprocess is embedded ... then copy all nodes and edges to the parent process
            subprocessControlFlowInfo.isEmbedded = true;

            controlFlowInfo.nodeList = controlFlowInfo.nodeList.concat(subprocessControlFlowInfo.nodeList);
            controlFlowInfo.edgeList = controlFlowInfo.edgeList.concat(subprocessControlFlowInfo.edgeList);
            controlFlowInfo.boundaryEvents = controlFlowInfo.boundaryEvents.concat(subprocessControlFlowInfo.boundaryEvents);
        }
    }
    if (proc.documentation) {
        controlFlowInfo.globalParameters = proc.documentation[0].text;
    }
    return controlFlowInfo;
};

let restrictRelation: Map<string, any> = new Map();



let extractParameters = (cad, nodeId, controlFlowInfo) => {
        // Extracting Roles from UserTasks functionBody

    let arr = cad.split('@');
    if(arr.length >= 3) {
        if(controlFlowInfo != null)
            controlFlowInfo.taskRoleMap.set(nodeId, arr[1].trim());
        if(arr[2].length > 1)
            cad = arr[2];
        else
            return undefined;
    }

    // Extracting Information of Oracle from Service Tasks (if aplicable)
    let oracle_Data = "";
    for (let j = 0, first = false; j < cad.length; j++) {
        if (cad.charAt(j) === "(") {
            if (!first) first = true;
            else {
                cad = cad.substr(j);
                break;
            }
        }
        if (cad.charAt(j) === ":") {
            oracle_Data = "";
            break;
        }
        oracle_Data += cad.charAt(j);
    }

    // Processing Information of function parameters (both service and user tasks)
    cad = cad
        .replace("(", " ")
        .replace(")", " ")
        .trim();
    cad = cad
        .replace("(", " ")
        .replace(")", " ")
        .trim();

    let firstSplit = cad.split(":");
    if (firstSplit.length > 2) {
        let aux = '';
        for (let i = 1; i < firstSplit.length; i++) aux += firstSplit[i];
        firstSplit = [firstSplit[0], aux];
    }
    let secondSplit = firstSplit[firstSplit.length - 1].trim().split("->");
    let resMap: Map<string, Array<string>> = new Map();

    let inputOutput = [firstSplit[0].trim(), secondSplit[0].trim()];
    let parameterType = ["input", "output"];
    resMap.set("body", [secondSplit[secondSplit.length - 1].trim()]);

    for (let i = 0; i < inputOutput.length; i++) {
        let temp = inputOutput[i].split(",");
        let res = [];
        temp.forEach(subCad => {
            let aux = subCad.trim().split(" ");
            if (aux[0].trim().length > 0) {
                res.push(aux[0].trim());
                res.push(aux[aux.length - 1].trim());
            }
        });
        resMap.set(parameterType[i], res);
    }
    // Updating Information of Oracle in controlFlowInfo
    if (controlFlowInfo != null) {
        let inParameters: Array<ParameterInfo> = [];
        let outParameters: Array<ParameterInfo> = [];
        let toIterate = resMap.get('input');
        for (let i = 0; i < toIterate.length; i += 2)
            inParameters.push(new ParameterInfo(toIterate[i], toIterate[i + 1]));
        toIterate = resMap.get('output');
        let parameters: Map<string, Array<ParameterInfo>> = new Map();
        parameters.set('input', inParameters);
        parameters.set('output', outParameters);
        for (let i = 0; i < toIterate.length; i += 2)
            outParameters.push(new ParameterInfo(toIterate[i], toIterate[i + 1]));
        if (oracle_Data.length > 0) {
            oracle_Data = oracle_Data.trim().replace(" ", "_");
            oracle_Data = oracle_Data
                .replace("(", " ")
                .replace(").", " ")
                .trim();
            let splitResult = oracle_Data.split(" ");
            if (!controlFlowInfo.oracleInfo.has(splitResult[0])) {
                controlFlowInfo.oracleInfo.set(
                    splitResult[0],
                    new OracleInfo(splitResult[0])
                );
            }
            controlFlowInfo.oracleTaskMap.set(nodeId, splitResult[0]);
            let localOracle = controlFlowInfo.oracleInfo.get(splitResult[0]);
            localOracle.address = splitResult[1];
            localOracle.functionName = splitResult[2];
            localOracle.functionParameters = parameters.get('input');
        } else controlFlowInfo.localParameters.set(nodeId, parameters);
    }
    return resMap;
};

let getNodeName = (node: any) =>
    node.name ? node.name.replace(/\s+/g, "_") : node.id;

export let parseModel = (modelInfo: ModelInfo) => {
    return new Promise((resolve, reject) => {
        parseBpmn(modelInfo.bpmn)
            .then((definitions: any) => {
                modelInfo.solidity = "pragma solidity ^0.4.25;\n";
                modelInfo.controlFlowInfoMap = new Map();

                // Sanity checks
                if (!definitions.diagrams || definitions.diagrams.length == 0)
                    throw new Error("ERROR: No diagram found in BPMN file");
                let proc = definitions.diagrams[0].plane.bpmnElement;
                modelInfo.name = proc.name ? proc.name.replace(/\s+/g, "_") : proc.id;
                modelInfo.id = proc.id;
                if (proc.$type !== "bpmn:Process") {
                    if (proc.$type === "bpmn:Collaboration") {
                        for (let i = 0; i < definitions.rootElements.length; i++)
                            if (definitions.rootElements[i].$type === "bpmn:Process") {
                                proc = definitions.rootElements[i];
                                modelInfo.name = proc.name ? proc.name.replace(/\s+/g, "_") : proc.id;
                                modelInfo.id = proc.id;
                                break;
                            }
                    } else {
                        throw new Error("ERROR: No root process model found");
                    }
                }

                // BPMN to Solidity parsing

                let globalNodeMap: Map<string, any> = new Map(),
                    globalNodeIndexMap: Map<string, number> = new Map(),
                    globalEdgeIndexMap: Map<string, number> = new Map(),
                    globalControlFlowInfo: Array<ControlFlowInfo> = [];

                ////////////////////////////////////////////////////////////

                globalNodeMap.set(proc.id, proc);
                let mainControlFlowInfo = collectControlFlowInfo(proc, globalNodeMap, globalControlFlowInfo);
                let globalControlFlowInfoMap: Map<string, ControlFlowInfo> = new Map();
                globalControlFlowInfo.forEach(controlFlowInfo =>
                    globalControlFlowInfoMap.set(controlFlowInfo.self.id, controlFlowInfo)
                );

                // Event sub-processes appear in the source list, and not in the nodeList
                // In addition, all the elements of a non interrupting subprocess event appears embedded on its parent process
                for (let controlFlowInfo of globalControlFlowInfo) {
                    let indexesToRemove = [];
                    controlFlowInfo.sources.forEach(nodeId => {
                        if (globalNodeMap.get(nodeId).triggeredByEvent) {
                            controlFlowInfo.nodeList.push(nodeId);
                            indexesToRemove.push(controlFlowInfo.sources.indexOf(nodeId));
                            let nodeInfo = globalControlFlowInfoMap.get(nodeId);
                            if (!globalNodeMap.get(nodeInfo.sources[0]).isInterrupting)
                                nodeInfo.nodeList.forEach(childId => {
                                    let index = controlFlowInfo.nodeList.indexOf(childId);
                                    if (index >= 0) controlFlowInfo.nodeList.splice(index, 1);
                                });
                        }
                    });
                    indexesToRemove.sort((ind1, ind2) => {
                        return ind2 - ind1;
                    });
                    indexesToRemove.forEach(index => {
                        controlFlowInfo.sources.splice(index, 1);
                    });
                    if (is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:SubProcess") &&
                        controlFlowInfo.self.triggeredByEvent &&
                        globalNodeMap.get(controlFlowInfo.sources[0]).isInterrupting == false) {
                        controlFlowInfo.isEmbedded = false;
                    }
                }

                let hasExternalCall = nodeId => {
                    let node = globalNodeMap.get(nodeId);
                    return is(node, "bpmn:ServiceTask");
                };

                modelInfo.globalNodeMap = globalNodeMap;

                for (let controlFlowInfo of globalControlFlowInfo) {
                    if (!controlFlowInfo.isEmbedded) {
                        let multiinstanceActivities = [],
                            callActivities = [],
                            nonInterruptingEvents = [],
                            catchingMessages = [];

                        controlFlowInfo.nodeList
                            .map(nodeId => globalNodeMap.get(nodeId))
                            .forEach(e => {
                                if ((is(e, "bpmn:Task") || is(e, "bpmn:SubProcess")) && e.loopCharacteristics &&
                                    e.loopCharacteristics.$type === "bpmn:MultiInstanceLoopCharacteristics") {
                                    controlFlowInfo.multiinstanceActivities.set(e.id, getNodeName(e));
                                    multiinstanceActivities.push(e.id);
                                } else if (is(e, "bpmn:CallActivity")) {
                                    controlFlowInfo.callActivities.set(e.id, getNodeName(e));
                                    callActivities.push(e.id);
                                } else if (is(e, "bpmn:IntermediateCatchEvent") && is(e.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                    catchingMessages.push(e.id);
                                else if (is(e, "bpmn:StartEvent") && is(e.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                    catchingMessages.push(e.id);
                            });

                        // It is also necessary to add boundary events of embedded sub-processes

                        controlFlowInfo.sources.forEach(nodeId => {
                            let start = globalNodeMap.get(nodeId);
                            if (start.eventDefinitions && start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition") &&
                                controlFlowInfo.nodeList.indexOf(nodeId) < 0) {
                                controlFlowInfo.nodeList.push(nodeId);
                                if (catchingMessages.indexOf(nodeId) < 0)
                                    catchingMessages.push(nodeId);
                            }
                        });

                        controlFlowInfo.boundaryEvents.forEach(nodeId => {
                            let node = globalNodeMap.get(nodeId);
                            if (node.outgoing)
                                for (let outgoing of node.outgoing)
                                    controlFlowInfo.edgeList.push(outgoing.id);
                            if (!node.cancelActivity) {
                                controlFlowInfo.nonInterruptingEvents.set(node.id, getNodeName(node));
                                nonInterruptingEvents.push(node.id);
                                controlFlowInfo.nodeList.push(nodeId); // Eager reinsertion
                                if (node.eventDefinitions[0] && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition')) {
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
                            if (is(node, "bpmn:SubProcess") && node.triggeredByEvent && controlFlowInfo.nodeList.indexOf(node.id)) {
                                for (let start of node.flowElements.filter(e => is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent"))) {
                                    if (start.isInterrupting == false) {
                                        let parent = globalNodeMap.get(start.$parent.id);
                                        controlFlowInfo.nonInterruptingEvents.set(start.id, getNodeName(parent));
                                        nonInterruptingEvents.push(start.id);
                                        controlFlowInfo.nodeList.push(start.id);
                                        if (start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                                            if (catchingMessages.indexOf(start.id) < 0)
                                                catchingMessages.push(start.id);
                                        }
                                    }
                                    if (controlFlowInfo.boundaryEvents.indexOf(start.id) < 0) {
                                        controlFlowInfo.boundaryEvents.push(start.id);
                                        if (controlFlowInfo.nodeList.indexOf(start.$parent.id) < 0)
                                            controlFlowInfo.nodeList.push(start.$parent.id);
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

                        let part1: Array<string> = [];
                        let part2: Array<string> = [];
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            if (hasExternalCall(nodeId)) part1.push(nodeId);
                            else part2.push(nodeId);
                        });
                        controlFlowInfo.nodeList = part1.concat(part2);
                        controlFlowInfo.nodeList.forEach(
                            (nodeId: string, index: number) => {
                                let node = globalNodeMap.get(nodeId);
                                controlFlowInfo.nodeIndexMap.set(nodeId, index + 1);
                                globalNodeIndexMap.set(nodeId, index + 1);
                                controlFlowInfo.nodeNameMap.set(nodeId, getNodeName(globalNodeMap.get(nodeId)));
                                if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                                    if (is(node, 'bpmn:CallActivity'))
                                        controlFlowInfo.externalBundles.set(nodeId, node.documentation[0].text);
                                    else
                                        extractParameters(node.documentation[0].text, node.id, controlFlowInfo);
                                }
                            }
                        );
                        controlFlowInfo.edgeList.forEach(
                            (edgeId: string, index: number) => {
                                controlFlowInfo.edgeIndexMap.set(edgeId, index + 1);
                                globalEdgeIndexMap.set(edgeId, index + 1);
                            }
                        );
                        controlFlowInfo.catchingMessages = catchingMessages;

                        // ControlFlow Perspective: Generation of Smart Contracts
                        let codeGenerationInfo = {
                            nodeList: controlFlowInfo.nodeList,
                            nodeMap: globalNodeMap,
                            catchingMessages: controlFlowInfo.catchingMessages,
                            multiinstanceActivities: multiinstanceActivities,
                            callActivities: callActivities,
                            nonInterruptingEvents: nonInterruptingEvents,
                            oracleInfo: controlFlowInfo.oracleInfo,
                            oracleTaskMap: controlFlowInfo.oracleTaskMap,
                            processId: () => controlFlowInfo.self.id,
                            nodeName: nodeId => getNodeName(globalNodeMap.get(nodeId)),
                            eventType: nodeId => {
                                let node = globalNodeMap.get(nodeId);
                                if (node.eventDefinitions && node.eventDefinitions[0]) {
                                    let cad = node.eventDefinitions[0].$type;
                                    return cad.substring(5, cad.length - 15);
                                }
                                return "Default";
                            },
                            allEventTypes: () => {
                                let taken = [];
                                globalNodeMap.forEach(node => {
                                    if (node.eventDefinitions && node.eventDefinitions[0] && !is(node.eventDefinitions[0], "bpmn:TerminateEventDefinition") && !is(node.eventDefinitions[0], "bpmn:MessageEventDefinition")) {
                                        let cad = node.eventDefinitions[0].$type;
                                        if (taken.indexOf(cad.substring(5, cad.length - 15)) < 0)
                                            taken.push(cad.substring(5, cad.length - 15));
                                    }
                                });
                                return taken;
                            },
                            getMessages: () => {
                                let taken = [];
                                let candidates = controlFlowInfo.boundaryEvents;
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    if (is(globalNodeMap.get(nodeId), "bpmn:SubProcess")) {
                                        let subP = globalControlFlowInfoMap.get(nodeId);
                                        candidates = candidates.concat(subP.boundaryEvents);
                                        subP.sources.forEach(id => {
                                            if (!is(globalNodeMap.get(id), "bpmn:Subprocess") && candidates.indexOf(id) < 0)
                                                candidates.push(id);
                                        });
                                    }
                                });
                                candidates.forEach(evtId => {
                                    let evt = globalNodeMap.get(evtId);
                                    if (evt.eventDefinitions && evt.eventDefinitions[0] && is(evt.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                        taken.push(evtId);
                                });
                                return taken;
                            },
                            getThrowingMessages: () => {
                                let res = [];
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if ((is(node, "bpmn:EndEvent") || is(node, "bpmn:IntermediateThrowEvent")) &&
                                        node.eventDefinitions && node.eventDefinitions[0] && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                        res.push(nodeId);
                                });
                                return res;
                            },
                            getThrowingEvents: (subprocId, evType) => {
                                let res = [];
                                globalNodeMap.forEach(node => {
                                    if (node.eventDefinitions && node.eventDefinitions[0]) {
                                        let cad = node.eventDefinitions[0].$type;
                                        if (cad.substring(5, cad.length - 15) === evType) {
                                            if ((is(node, "bpmn:EndEvent") || is(node, "bpmn:IntermediateThrowEvent")) &&
                                                (node.$parent.id === subprocId || controlFlowInfo.nodeList.indexOf(node.id) >= 0)) {
                                                res.push(node.id);
                                            }
                                        }
                                    }
                                });
                                return res;
                            },
                            getCatchingEvents: (subprocId) => {
                                let res = [];
                                globalNodeMap.forEach(node => {
                                    if (node.eventDefinitions && node.eventDefinitions[0]) {
                                        if (is(node, "bpmn:StartEvent")) {
                                            let parent = globalNodeMap.get(node.$parent.id);
                                            if (parent.triggeredByEvent && parent.$parent.id === subprocId)
                                                res.unshift(node.id);
                                            else if (!parent.triggeredByEvent && (parent.id === subprocId || controlFlowInfo.nodeList.indexOf(parent.id) > -1))
                                                res.push(node.id);
                                        } else if (is(node, "bpmn:BoundaryEvent") || is(node, "bpmn:IntermediateCatchEvent")) {
                                            if (node.$parent.id === subprocId || controlFlowInfo.nodeList.indexOf(node.$parent.id) > -1)
                                                res.push(node.id);
                                        }
                                    }
                                });
                                return res;
                            },
                            getTerminateCandidates: (subprocId) => {
                              let res = [];
                              globalNodeMap.forEach(node => {
                                  if (node.eventDefinitions && node.eventDefinitions[0]) {
                                      if (is(node, "bpmn:BoundaryEvent") && node.cancelActivity == false) {
                                         if(globalControlFlowInfoMap.has(node.id)) {
                                           let localC = globalControlFlowInfoMap.get(node.id);
                                           localC.nodeList.forEach(elemId => {
                                              let elem = globalNodeMap.get(elemId);
                                              if(elem.eventDefinitions && is(elem.eventDefinitions[0], "bpmn:TerminateEventDefinition") && elem.$parent.id === node.$parent.id)
                                                  res.push(node.id);
                                           })

                                         } else {
                                           console.log('Missing Non Interrupting event');
                                         }
                                      }
                                  }
                              });
                              return res;
                            },
                            getProcessCandidatesMaskFrom: (evtId, evtType, evtCode, sourceProcesses, allEvents) => {
                                let eventList = [];
                                let bitarray = [];
                                allEvents.forEach(nodeId => {
                                    let cad = globalNodeMap.get(nodeId).eventDefinitions[0].$type;
                                    if (evtType === cad.substring(5, cad.length - 15) && evtCode === getNodeName(globalNodeMap.get(nodeId)))
                                        eventList.push(nodeId);
                                });
                                sourceProcesses.forEach(procId => {
                                    let parent = globalNodeMap.get(procId);
                                    let previousParent = parent;
                                    let res = [];
                                    let eventFound = false;
                                    while (!eventFound && res.length == 0 && parent.$parent && controlFlowInfo.self.id !== parent.id) {
                                        parent = globalNodeMap.get(parent.$parent.id);
                                        eventList.forEach(nodeId => {
                                            let node = globalNodeMap.get(nodeId);
                                            if (!eventFound && is(node, "bpmn:BoundaryEvent") && node.attachedToRef.id === previousParent.id) {
                                                eventFound = node.cancelActivity != false;
                                                if (eventFound) res = [nodeId];
                                                else res.push(nodeId);
                                            }
                                        });
                                        if (res.length == 0) {
                                            eventList.forEach(nodeId => {
                                                let node = globalNodeMap.get(nodeId);
                                                if (!eventFound && is(node, "bpmn:StartEvent") && node.$parent.triggeredByEvent && node.$parent.$parent.id === parent.id) {
                                                    eventFound = node.isInterrupting != false;
                                                    if (eventFound) res = [nodeId];
                                                    else res.push(nodeId);
                                                }
                                            })
                                        }
                                        previousParent = parent;
                                    }
                                    if (res.indexOf(evtId))
                                        bitarray[globalNodeIndexMap.get(procId)] = 1;
                                });
                                let result = "0b";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return result === "0b" ? 0 : new BigNumber(result).toFixed();
                            },
                            getCatchingEventsFrom: (procId, evtType, evtCode) => {
                                // Escalation and Error catching events.
                                // No intermediate events in normal flow allowed
                                let res = [];
                                let parent = globalNodeMap.get(procId);
                                let eventFound = false;
                                let candidates = controlFlowInfo.boundaryEvents.concat(controlFlowInfo.nodeList);
                                let eventList = [];
                                candidates.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (node.eventDefinitions) {
                                        let cad = node.eventDefinitions[0].$type;
                                        let type = cad.substring(5, cad.length - 15);
                                        if (type === evtType && evtCode === getNodeName(globalNodeMap.get(nodeId)) && eventList.indexOf(nodeId) < 0) {
                                            eventList.push(nodeId);
                                        }
                                    }
                                });
                                if (!parent.triggeredByEvent) {
                                    eventList.forEach(nodeId => {
                                        let node = globalNodeMap.get(nodeId);
                                        if (!eventFound && is(node, "bpmn:StartEvent") && node.$parent.triggeredByEvent && node.$parent.$parent.id === parent.id) {
                                            eventFound = node.isInterrupting != false;
                                            if (eventFound) res = [nodeId];
                                            else res.push(nodeId);
                                        }
                                    });
                                }
                                if (controlFlowInfo.self.id === procId || res.length > 0) {
                                    return res;
                                } else {
                                    if (parent.triggeredByEvent)
                                        parent = globalNodeMap.get(parent.$parent.id);
                                    let previousParent = parent;
                                    while (!eventFound && res.length == 0 && parent.$parent && controlFlowInfo.self.id !== parent.id) {
                                        parent = globalNodeMap.get(parent.$parent.id);
                                        eventList.forEach(nodeId => {
                                            let node = globalNodeMap.get(nodeId);
                                            if (!eventFound && is(node, "bpmn:BoundaryEvent") && node.attachedToRef.id === previousParent.id) {
                                                eventFound = node.cancelActivity != false;
                                                if (eventFound) res = [nodeId];
                                                else res.push(nodeId);
                                            }
                                        });
                                        if (res.length == 0) {
                                            eventList.forEach(nodeId => {
                                                let node = globalNodeMap.get(nodeId);
                                                if (!eventFound && is(node, "bpmn:StartEvent") && node.$parent.triggeredByEvent && node.$parent.$parent.id === parent.id) {
                                                    eventFound = node.isInterrupting != false;
                                                    if (eventFound) res = [nodeId];
                                                    else res.push(nodeId);
                                                }
                                            })
                                        }
                                        previousParent = parent;
                                    }
                                    return res;
                                }
                            },
                            getWorkItemsGroupByParameters: (isInput) => {
                                let name2Ids: Map<string, string[]> = new Map();
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (is(node, 'bpmn:UserTask') || is(node, 'bpmn:ReceiveTask') || catchingMessages.indexOf(nodeId) >= 0) {
                                        let params = "";
                                        if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0 && extractParameters(node.documentation[0].text, nodeId, null) !== undefined) {
                                            let localParams = isInput
                                                ? extractParameters(node.documentation[0].text, nodeId, null).get("input")
                                                : extractParameters(node.documentation[0].text, nodeId, null).get("output");
                                            if (localParams.length > 0) {
                                                params = localParams[0];
                                                for (let i = 2; i < localParams.length; i += 2) params += localParams[i];
                                            }
                                        }
                                        let name = getNodeName(globalNodeMap.get(nodeId)) + params;
                                        if (!name2Ids.has(name)) {
                                            name2Ids.set(name, []);
                                        }
                                        name2Ids.get(name).push(nodeId);
                                    }
                                });
                                return name2Ids;
                            },
                            getContracts2Call: () => {
                                let res = callActivities.concat(multiinstanceActivities);
                                nonInterruptingEvents.forEach(evtId => {
                                    let node = globalNodeMap.get(evtId);
                                    res.push(is(node, "bpmn:StartEvent") ? node.$parent.id : evtId);
                                });
                                return res;
                            },
                            getContracts2CallFrom: (subprocId, candidates) => {
                                let res = [subprocId];
                                if (!controlFlowInfo.callActivities.has(subprocId)) {
                                    candidates.forEach(nodeId => {
                                        let node = globalNodeMap.get(nodeId);
                                        while (node.$parent) {
                                            if (node.$parent.id === subprocId) {
                                                res.push(nodeId);
                                                break;
                                            }
                                            node = node.$parent;
                                        }
                                    });
                                }
                                return res;
                            },
                            getContracts2CallMaskFrom: (subprocId, candidates) => {
                                let bitarray = [];
                                candidates.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    while (node.$parent) {
                                        if (node.$parent.id === subprocId) {
                                            bitarray[globalNodeIndexMap.get(nodeId)] = 1;
                                            break;
                                        }
                                        node = node.$parent;
                                    }
                                });
                                let result = "0b";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return result === "0b" ? 0 : new BigNumber(result).toFixed();
                            },
                            getContracts2CallArray: (subprocId, candidates) => {
                                let res = '[uint(' + globalNodeIndexMap.get(candidates[0]) + ')';
                                for (let i = 1; i < candidates.length; i++)
                                    res += ', uint(' + globalNodeIndexMap.get(candidates[i]) + ')';
                                return res + ']';
                            },
                            getPossibleKillSubprocess: () => {
                                let res = [];
                                controlFlowInfo.boundaryEvents.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (node.$parent.triggeredByEvent && node.$parent.$parent.id !== controlFlowInfo.self.id) {
                                        if (node.isInterrupting != false && res.indexOf(node.$parent.$parent.id) < 0)
                                            res.push(node.$parent.$parent.id);
                                    } else if (node.attachedToRef) {
                                        let attachedTo = node.attachedToRef.id;
                                        if (node.cancelActivity != false && res.indexOf(attachedTo) < 0) {
                                            res.push(attachedTo);
                                        }
                                    }
                                });
                                globalNodeMap.forEach(node => {
                                    if (node.eventDefinitions && node.eventDefinitions[0]) {
                                        if (is(node, "bpmn:BoundaryEvent") && node.cancelActivity == false) {
                                           if(globalControlFlowInfoMap.has(node.id)) {
                                             let localC = globalControlFlowInfoMap.get(node.id);
                                             localC.nodeList.forEach(elemId => {
                                                let elem = globalNodeMap.get(elemId);
                                                if(elem.eventDefinitions && is(elem.eventDefinitions[0], "bpmn:TerminateEventDefinition") && elem.$parent.id === node.$parent.id && controlFlowInfo.nodeList.indexOf(node.$parent.id) >= 0 && res.indexOf(node.$parent.id) < 0 && node.$parent.id != controlFlowInfo.self.id) {
                                                    res.push(node.$parent.id);
                                                }
                                             })
                                           }
                                        }
                                    }
                                });
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (node.eventDefinitions && is(node.eventDefinitions[0], "bpmn:TerminateEventDefinition")) {
                                      if(res.indexOf(node.$parent.id) < 0 && node.$parent.id != controlFlowInfo.self.id && !is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:BoundaryEvent")) {
                                          console.log('I am here 2');
                                          res.push(node.$parent.id);
                                      }
                                    }
                                });
                                return res;
                            },
                            getCountExternalTasks: () => {
                                let res = 0;
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    if (hasExternalCall(nodeId)) res++;
                                });
                                return res;
                            },
                            getStartedMessages: processId => {
                                let res = [];
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (is(node, "bpmn:StartEvent") && node.$parent.id === processId && node.eventDefinitions
                                        && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition") && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                                        res.push(nodeId);
                                });
                                return res;
                            },
                            getParent: nodeId => {
                                // Retrieves the id of the parent
                                let node = globalNodeMap.get(nodeId);
                                if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                                    return globalNodeMap.get(node.$parent.id).$parent.id;
                                if (is(node, "bpmn:BoundaryEvent") && node.cancelActivity)
                                    return node.attachedToRef.id;
                                return node.$parent ? node.$parent.id : nodeId;
                            },
                            getContractName: nodeId => {
                                // Retrieves the contract name related to the node.
                                let node = globalNodeMap.get(nodeId);
                                if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                                    return node.$parent.id;
                                if (is(node, "bpmn:BoundaryEvent")) return node.id;
                                return controlFlowInfo.self.id;
                            },
                            getAllChildren: (subprocId, direct) => {
                                let taken = direct ? [] : [subprocId];
                                controlFlowInfo.nodeList
                                    .map(nodeId => globalNodeMap.get(nodeId))
                                    .forEach(e => {
                                        if (is(e, "bpmn:SubProcess") || callActivities.indexOf(e.id) >= 0 || (nonInterruptingEvents.indexOf(e.id) >= 0 && !is(e, "bpmn:StartEvent")))
                                            if (((direct && subprocId !== e.id && e.$parent.id === subprocId) || !direct) && taken.indexOf(e.id) < 0)
                                                taken.push(e.id);
                                    });
                                return taken;
                            },
                            isStartingContractEvent: (eventId, processId) => {
                                let evt = globalNodeMap.get(eventId);
                                if (is(evt, "bpmn:StartEvent")) {
                                    if (globalNodeMap.get(evt.$parent.id).triggeredByEvent)
                                        return evt.$parent.id !== processId;
                                    if (is(evt.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                        return true;
                                } else if (is(evt, "bpmn:BoundaryEvent")) {
                                    return eventId !== processId;
                                } else if (is(evt, "bpmn:IntermediateCatchEvent") && is(evt.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                    return true;
                                return false;
                            },
                            isInterrupting: eventId => {
                                // True if an event is interrupting
                                let node = globalNodeMap.get(eventId);
                                if (node.eventDefinitions && is(node.eventDefinitions[0], "bpmn:ErrorEventDefinition"))
                                    return true;
                                if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                                    return node.isInterrupting != false;
                                if (is(node, "bpmn:BoundaryEvent"))
                                    return node.cancelActivity != false;
                                return false;
                            },
                            isEmbeddedSubprocess: subprocessId => {
                                return globalControlFlowInfoMap.get(subprocessId).isEmbedded;
                            },
                            isBoundaryEvent: evtId => {
                                return controlFlowInfo.boundaryEvents.indexOf(evtId) >= 0;
                            },
                            preMarking: nodeId => {
                                let node = globalNodeMap.get(nodeId);
                                let bitarray = [];
                                if (node.incoming)
                                    for (let incoming of node.incoming)
                                        bitarray[controlFlowInfo.edgeIndexMap.get(incoming.id)] = 1;
                                else bitarray[0] = 1;
                                let result = "0b";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            postMarking: nodeId => {
                                let node = globalNodeMap.get(nodeId);
                                let bitarray = [];
                                let result = "0b";
                                if (node.outgoing)
                                    for (let outgoing of node.outgoing) {
                                        bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                                    }
                                else result = "0";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            subprocessNodeMarking: subprocessId => {
                                let bitarray = [];
                                globalNodeMap.forEach(node => {
                                    if (node.$parent && node.$parent.id === subprocessId) {
                                        if (is(node, "bpmn:Task") || is(node, 'bpmn:SubProcess'))
                                            bitarray[globalNodeIndexMap.get(node.id)] = 1;
                                        else if (!globalNodeMap.get(subprocessId).triggeredByEvent && node.eventDefinitions && node.eventDefinitions[0] &&
                                            is(node.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                            bitarray[globalNodeIndexMap.get(node.id)] = 1;
                                    }
                                });
                                let result = bitarray.length > 0 ? "0b" : 0;
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            subprocessNodeFullMarking: subprocId => {
                                let children = [subprocId];
                                let bitarray = [];
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (is(node, "bpmn:SubProcess") || callActivities.indexOf(node.id) >= 0 || (nonInterruptingEvents.indexOf(node.id) >= 0 && !is(node, "bpmn:StartEvent"))) {
                                        while (node.$parent) {
                                            if (node.$parent.id === subprocId) {
                                                if (multiinstanceActivities.indexOf(nodeId) >= 0 || callActivities.indexOf(node.id) >= 0 || nonInterruptingEvents.indexOf(node.id) >= 0) {
                                                    bitarray[globalNodeIndexMap.get(nodeId)] = 1;
                                                }
                                                else if (children.indexOf(nodeId) < 0) {
                                                    children.push(nodeId);
                                                }
                                                break;
                                            }
                                            node = node.$parent;
                                        }
                                    }
                                });
                                let result = "0b";
                                if (globalNodeIndexMap.get(subprocId))
                                    bitarray[globalNodeIndexMap.get(subprocId)] = 1;
                                controlFlowInfo.nodeList
                                    .map(nodeId => globalNodeMap.get(nodeId))
                                    .forEach(node => {
                                        if (node.$parent && children.indexOf(node.$parent.id) >= 0) {
                                            bitarray[globalNodeIndexMap.get(node.id)] = 1;
                                          }
                                    });
                                catchingMessages
                                    .map(evtId => globalNodeMap.get(evtId))
                                    .forEach(evt => {
                                        if (evt.attachedToRef && children.indexOf(evt.attachedToRef) >= 0) {
                                            bitarray[globalNodeIndexMap.get(evt.id)] = 1;
                                          }
                                    });
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return result === '0b' ? new BigNumber(0) : new BigNumber(result).toFixed();
                            },
                            subprocessStartMarking: subprocessId => {
                                let toSearch = globalNodeMap.get(subprocessId);
                                let bitarray = [];
                                let result = "0b";
                                if (is(toSearch, "bpmn:BoundaryEvent")) {
                                    for (let outgoing of toSearch.outgoing)
                                        bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                                } else {
                                    for (let node of toSearch.flowElements.filter(
                                        e => is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent")
                                    )) {
                                        if (node.$parent.id === subprocessId)
                                            if (!globalNodeMap.get(node.$parent.id).triggeredByEvent &&
                                                node.eventDefinitions && node.eventDefinitions[0] &&
                                                is(node.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                                bitarray[0] = 1;
                                            else if (node.outgoing)
                                                for (let outgoing of node.outgoing)
                                                    bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                                    }
                                }
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            getAllAncestorsMask: subprocId => {
                                let bitarray = [];
                                let result = "0b";
                                let node = globalNodeMap.get(subprocId);
                                while (node.$parent) {
                                    bitarray[controlFlowInfo.nodeIndexMap.get(node.id)] = 1;
                                    node = node.$parent;
                                }
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            subprocessMarking: subprocessId => {
                                let bitarray = [];
                                let result = "0b";
                                let localInfo = globalControlFlowInfoMap.get(subprocessId);
                                let edgeList = [];
                                localInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (node.$parent && node.$parent.id === subprocessId && node.incoming) {
                                        for (let incoming of node.incoming) {
                                            edgeList.push(incoming.id);
                                        }
                                    }
                                });
                                edgeList.forEach(edgeId => {
                                    bitarray[controlFlowInfo.edgeIndexMap.get(edgeId)] = 1;
                                });
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            subprocessFullMarking: subprocId => {
                                let bitarray = [];
                                let result = "0b";
                                let children = [subprocId];
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (is(node, "bpmn:SubProcess") && multiinstanceActivities.indexOf(nodeId) < 0) {
                                        while (node.$parent) {
                                            if (node.$parent.id === subprocId) {
                                                if (children.indexOf(nodeId) < 0)
                                                    children.push(nodeId);
                                                break;
                                            }
                                            node = node.$parent;
                                        }
                                    }
                                });
                                children.forEach(subprocessId => {
                                    let localInfo = globalControlFlowInfoMap.get(subprocessId);
                                    localInfo.edgeList.forEach(edgeId => {
                                        bitarray[controlFlowInfo.edgeIndexMap.get(edgeId)] = 1;
                                    });
                                });
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            flowEdgeIndex: flowEdgeId => {
                                let bitarray = [];
                                bitarray[controlFlowInfo.edgeIndexMap.get(flowEdgeId)] = 1;
                                let result = "0b";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            flowNodeIndex: flowNodeId => {
                                let bitarray = [];
                                bitarray[globalNodeIndexMap.get(flowNodeId)] = 1;
                                let result = "0b";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            nodeRealIndex: nodeId => {
                                return globalNodeIndexMap.get(nodeId);
                            },
                            isPartOfDeferredChoice: eventId => {
                                let event = globalNodeMap.get(eventId);
                                if (event.incoming) {
                                    let node = event.incoming[0].sourceRef;
                                    return is(node, "bpmn:EventBasedGateway");
                                }
                                return false;
                            },
                            getDeferredChoiceElements: nodeId => {
                                let event = globalNodeMap.get(nodeId);
                                let res = [];
                                if (event.incoming) {
                                    let node = event.incoming[0].sourceRef;
                                    if (is(node, "bpmn:EventBasedGateway")) {
                                        for (let outgoing of node.outgoing) {
                                            if (outgoing.targetRef.id !== nodeId)
                                                res.push(outgoing.targetRef.id);
                                        }
                                    }
                                }
                                return res;
                            },
                            deferredChoiceNodeMarking: nodeId => {
                                let event = globalNodeMap.get(nodeId);
                                let bitarray = [];
                                if (event.incoming) {
                                    let node = event.incoming[0].sourceRef;
                                    if (is(node, "bpmn:EventBasedGateway")) {
                                        for (let outgoing of node.outgoing) {
                                            bitarray[controlFlowInfo.nodeIndexMap.get(outgoing.targetRef.id)] = 1;
                                        }
                                    }
                                }
                                let result = "0";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            deferredChoiceMarking: eventId => {
                                let event = globalNodeMap.get(eventId);
                                let node = event.incoming[0].sourceRef;
                                let bitarray = [];
                                let result = "0b";
                                if (node.outgoing)
                                    for (let outgoing of node.outgoing) {
                                        bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                                    }
                                else result = "0";
                                for (let i = bitarray.length - 1; i >= 0; i--)
                                    result += bitarray[i] ? "1" : "0";
                                return new BigNumber(result).toFixed();
                            },
                            globalDeclarations: () => {
                                if (controlFlowInfo.globalParameters.length > 0)
                                    return controlFlowInfo.globalParameters;
                                else return "";
                            },
                            getOracleFunction: nodeId => {
                                if (controlFlowInfo.oracleTaskMap.has(nodeId))
                                    return controlFlowInfo.oracleInfo.get(
                                        controlFlowInfo.oracleTaskMap.get(nodeId)
                                    ).functionName;
                                return "";
                            },
                            nodeParameters: nodeId => {
                                let node = globalNodeMap.get(nodeId);
                                if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                                    let resDict = extractParameters(node.documentation[0].text, nodeId, null);
                                    return resDict !== undefined ? resDict.get("input").length > 0 || resDict.get("output").length > 0 : false;
                                }
                                return false;
                            },
                            typeParameters: (nodeId, isInput, hasPreviousParameter) => {
                                let node = globalNodeMap.get(nodeId);
                                let res = "";
                                if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0 && extractParameters(node.documentation[0].text, nodeId, null) !== undefined) {
                                    let localParams = isInput
                                        ? extractParameters(node.documentation[0].text, nodeId, null).get("input")
                                        : extractParameters(node.documentation[0].text, nodeId, null).get("output");
                                    if (localParams.length > 0) {
                                        res = localParams[0];
                                        for (let i = 2; i < localParams.length; i += 2)
                                            res += ", " + localParams[i];
                                    }
                                }
                                return hasPreviousParameter && res.length > 0
                                    ? ", " + res
                                    : res;
                            },
                            concatParameters: (nodeId, isInput, hasType, hasPreviousParameter) => {
                                let node = globalNodeMap.get(nodeId);
                                let res = "";
                                if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0 && extractParameters(node.documentation[0].text, nodeId, null) !== undefined) {
                                    let localParams = isInput
                                        ? extractParameters(node.documentation[0].text, nodeId, null).get("input")
                                        : extractParameters(node.documentation[0].text, nodeId, null).get("output");
                                    if (localParams.length > 0) {
                                        res = hasType
                                            ? localParams[0] + " " + localParams[1]
                                            : localParams[1];
                                        for (let i = 2; i < localParams.length; i += 2)
                                            res += "," + (hasType
                                                ? localParams[i] + " " + localParams[i + 1]
                                                : localParams[i + 1]);
                                    }
                                }
                                return hasPreviousParameter && res.length > 0 ? ", " + res : res;
                            },
                            nodeFunctionBody: nodeId => {
                                let node = globalNodeMap.get(nodeId);
                                if (node.script) {
                                    return node.script.split("->");
                                } else if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0 && extractParameters(node.documentation[0].text, nodeId, null) !== undefined) {
                                    return extractParameters(node.documentation[0].text, nodeId, null).get("body");
                                } else return "";
                            },
                            getCondition: flowEdge =>
                                flowEdge.conditionExpression
                                    ? flowEdge.conditionExpression.body
                                    : flowEdge.name ? flowEdge.name : flowEdge.id,
                            is: is
                        };

                        let localSolidity = bpmn2solTemplate(codeGenerationInfo);

                        // Code for using the WorkList template
                        let userTaskList = [];
                        let parameterInfo: Map<string, Map<string, Array<ParameterInfo>>> = new Map();
                        controlFlowInfo.nodeList.forEach(nodeId => {
                            let node = globalNodeMap.get(nodeId);
                            if (is(node, 'bpmn:UserTask') || is(node, 'bpmn:ReceiveTask')) {
                                userTaskList.push(nodeId);
                                if (controlFlowInfo.localParameters.has(nodeId) && (controlFlowInfo.localParameters.get(nodeId).get('input').length > 0 || controlFlowInfo.localParameters.get(nodeId).get('output').length > 0)) {
                                    parameterInfo.set(nodeId, controlFlowInfo.localParameters.get(nodeId));
                                }
                            }
                        });
                        if (controlFlowInfo.catchingMessages.length > 0)
                            userTaskList = userTaskList.concat(controlFlowInfo.catchingMessages);

                        // WorkList: Smart Contract Generation
                        let workListGenerationInfo = {
                            nodeList: userTaskList,
                            restrictRelation: restrictRelation,
                            parameterInfo: parameterInfo,
                            nodeIndex: globalNodeIndexMap,
                            nodeMap: globalNodeMap,
                            processId: () => controlFlowInfo.self.id,
                            nodeName: nodeId => {
                                return getNodeName(globalNodeMap.get(nodeId));
                            },
                            getParameterType: (nodeId, isInput, isType, hasPrevious) => {
                                let res = "";
                                if (parameterInfo.get(nodeId)) {
                                    let localParams = isInput
                                        ? parameterInfo.get(nodeId).get("input")
                                        : parameterInfo.get(nodeId).get("output");
                                    if (localParams && localParams.length > 0) {
                                        res = isType ? localParams[0].type : localParams[0].name;
                                        for (let i = 1; i < localParams.length; i++)
                                            res += isType
                                                ? ", " + localParams[i].type
                                                : ", " + localParams[i].name;
                                    }
                                }
                                return res.length > 0 && hasPrevious ? ", " + res : res;
                            },
                            getParameters: (nodeId, isInput, hasType, hasPrevious) => {
                                let res = "";
                                if (parameterInfo.get(nodeId)) {
                                    let localParams = isInput
                                        ? parameterInfo.get(nodeId).get("input")
                                        : parameterInfo.get(nodeId).get("output");
                                    if (localParams && localParams.length > 0) {
                                        res = hasType
                                            ? localParams[0].type + " " + localParams[0].name
                                            : localParams[0].name;
                                        for (let i = 1; i < localParams.length; i++)
                                            res += hasType
                                                ? ", " + localParams[i].type + " " + localParams[i].name
                                                : ", " + localParams[i].name;
                                    }
                                }
                                return res.length > 0 && hasPrevious ? ", " + res : res;
                            },
                            getWorkItemsGroupByParameters: (isInput) => {
                                let name2Ids: Map<string, string[]> = new Map();
                                controlFlowInfo.nodeList.forEach(nodeId => {
                                    let node = globalNodeMap.get(nodeId);
                                    if (is(node, 'bpmn:UserTask') || is(node, 'bpmn:ReceiveTask') || catchingMessages.indexOf(nodeId) >= 0) {
                                        let params = "";
                                        if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0 && extractParameters(node.documentation[0].text, nodeId, null) !== undefined) {
                                            let localParams = isInput
                                                ? extractParameters(node.documentation[0].text, nodeId, null).get("input")
                                                : extractParameters(node.documentation[0].text, nodeId, null).get("output");
                                            if (localParams.length > 0) {
                                                params = localParams[0];
                                                for (let i = 2; i < localParams.length; i += 2) params += localParams[i];
                                            }
                                        }
                                        let name = getNodeName(globalNodeMap.get(nodeId)) + params;
                                        if (!name2Ids.has(name)) {
                                            name2Ids.set(name, []);
                                        }
                                        name2Ids.get(name).push(nodeId);
                                    }
                                });
                                return name2Ids;
                            },
                            is: is
                        };
                        modelInfo.solidity += localSolidity;
                        if (userTaskList.length > 0) {
                            modelInfo.solidity += workList2solTemplate(workListGenerationInfo);
                        }
                        modelInfo.controlFlowInfoMap.set(controlFlowInfo.self.id, controlFlowInfo);
                    } else {
                        controlFlowInfo.nodeList.forEach(nodeId =>
                            controlFlowInfo.nodeIndexMap.set(nodeId, globalNodeIndexMap.get(nodeId))
                        );
                        controlFlowInfo.edgeList.forEach(edgeId =>
                            controlFlowInfo.edgeIndexMap.set(edgeId, globalEdgeIndexMap.get(edgeId))
                        );
                    }
                }

                //////////////////////////////////////////////////////////////////////////////////

                modelInfo.entryContractName = modelInfo.name + ":" + (proc.name ? proc.name.replace(/\s+/g, "_") : proc.id) + "_Contract";

                resolve();
            })
            .catch(err => {
                throw new Error(err);
                reject();
            });
    });
};

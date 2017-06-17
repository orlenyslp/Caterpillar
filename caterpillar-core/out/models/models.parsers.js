"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BpmnModdle = require("bpmn-moddle");
var fs = require("fs");
var path = require("path");
var ejs = require("ejs");
var BigNumber = require("bignumber.js");
var definitions_1 = require("./definitions");
var bpmn2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/bpmn2sol.ejs', 'utf-8');
var bpmn2solTemplate = ejs.compile(bpmn2solEJS);
var workList2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/workList2sol.ejs', 'utf-8');
var workList2solTemplate = ejs.compile(workList2solEJS);
var moddle = new BpmnModdle();
var parseBpmn = function (bpmnDoc) {
    return new Promise(function (resolve, reject) {
        moddle.fromXML(bpmnDoc, function (err, definitions) {
            if (!err)
                resolve(definitions);
            else
                reject(err);
        });
    });
};
var is = function (element, type) { return element.$instanceOf(type); };
var collectControlFlowInfo = function (proc, globalNodeMap, globalControlFlowInfo) {
    var nodeList = new Array();
    var edgeList = new Array();
    var boundaryEvents = new Array();
    var nonBlockingBoundaryEvents = new Array();
    var controlFlowInfo;
    for (var _i = 0, _a = proc.flowElements.filter(function (e) { return is(e, "bpmn:FlowNode"); }); _i < _a.length; _i++) {
        var node = _a[_i];
        if (is(node, "bpmn:BoundaryEvent")) {
            boundaryEvents.push(node.id);
            if (node.cancelActivity == false)
                nonBlockingBoundaryEvents.push(node.id);
        }
        else
            nodeList.push(node.id);
        globalNodeMap.set(node.id, node);
    }
    var sources = nodeList.slice();
    var sinks = nodeList.slice();
    for (var _b = 0, _c = proc.flowElements.filter(function (e) { return is(e, "bpmn:SequenceFlow"); }); _b < _c.length; _b++) {
        var flowEdge = _c[_b];
        sources.splice(sources.indexOf(flowEdge.targetRef.id), 1);
        if (!is(flowEdge.sourceRef, "bpmn:BoundaryEvent"))
            sinks.splice(sinks.indexOf(flowEdge.sourceRef.id), 1);
        edgeList.push(flowEdge.id);
    }
    // Let us remove all source elements from the node list
    nodeList = nodeList.filter(function (node) { return sources.indexOf(node) < 0; });
    if (nonBlockingBoundaryEvents.length > 0) {
        console.log('--------------------------------------------------------------');
        console.log('Will partition the graph due to presence of non-blocking boundary events');
        console.log('--------------------------------------------------------------');
        var dfs = function (sources) {
            var open = sources.slice();
            var nodeList = new Array();
            var edgeList = new Array();
            while (open.length > 0) {
                var currId = open.pop();
                var curr = globalNodeMap.get(currId);
                nodeList.push(currId);
                if (curr.outgoing && curr.outgoing.length > 0)
                    for (var _i = 0, _a = curr.outgoing; _i < _a.length; _i++) {
                        var succEdge = _a[_i];
                        var succ = succEdge.targetRef;
                        edgeList.push(succEdge.id);
                        if (open.indexOf(succ.id) < 0 && nodeList.indexOf(succ.id) < 0)
                            open.push(succ.id);
                    }
            }
            return [nodeList, edgeList];
        };
        var _d = dfs(sources), mainPathNodeList = _d[0], mainPathEdgeList = _d[1];
        // Let us remove all source elements from the node list
        mainPathNodeList = mainPathNodeList.filter(function (node) { return sources.indexOf(node) < 0; });
        //console.log('main path nodes', mainPathNodeList);
        controlFlowInfo = new definitions_1.ControlFlowInfo(proc, mainPathNodeList, mainPathEdgeList, sources, boundaryEvents);
        globalControlFlowInfo.push(controlFlowInfo);
        var _loop_1 = function (eventId) {
            var event = globalNodeMap.get(eventId);
            if (!mainPathNodeList.find(function (e) { return event.attachedToRef.id === e; })) {
                throw new Error('ERROR: Found non-interrupting event which is not attached to a subprocess in the main process path');
            }
            var _a = dfs([eventId]), localNodeList = _a[0], localEdgeList = _a[1];
            //console.log('non-interrupting event path nodes', localNodeList);
            if (mainPathNodeList.filter(function (nodeId) { return localNodeList.indexOf(nodeId) >= 0; }).length > 0)
                throw new Error('ERROR: Non-interrupting event outgoing path is not synchronized and merges with main process path');
            // Let us remove all source elements from the node list
            localNodeList = localNodeList.filter(function (node) { return sources.indexOf(node) < 0; });
            var childControlFlowInfo = new definitions_1.ControlFlowInfo(event, localNodeList, localEdgeList, [eventId], []);
            childControlFlowInfo.parent = proc;
            globalControlFlowInfo.push(childControlFlowInfo);
        };
        for (var _e = 0, nonBlockingBoundaryEvents_1 = nonBlockingBoundaryEvents; _e < nonBlockingBoundaryEvents_1.length; _e++) {
            var eventId = nonBlockingBoundaryEvents_1[_e];
            _loop_1(eventId);
        }
    }
    else {
        controlFlowInfo = new definitions_1.ControlFlowInfo(proc, nodeList, edgeList, sources, boundaryEvents);
        globalControlFlowInfo.push(controlFlowInfo);
    }
    for (var _f = 0, _g = proc.flowElements.filter(function (e) { return is(e, "bpmn:SubProcess"); }); _f < _g.length; _f++) {
        var subprocess = _g[_f];
        var subprocessControlFlowInfo = collectControlFlowInfo(subprocess, globalNodeMap, globalControlFlowInfo);
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
var extractParameters = function (cad) {
    cad = cad.replace("(", " ").replace(")", " ").trim();
    cad = cad.replace("(", " ").replace(")", " ").trim();
    var firstSplit = cad.split(":");
    var secondSplit = firstSplit[firstSplit.length - 1].trim().split("->");
    var resMap = new Map();
    var inputOutput = [firstSplit[0].trim(), secondSplit[0].trim()];
    var parameterType = ['input', 'output'];
    var bodyString = secondSplit[secondSplit.length - 1].trim();
    resMap.set('body', [secondSplit[secondSplit.length - 1].trim()]);
    for (var i = 0; i < inputOutput.length; i++) {
        var temp = inputOutput[i].split(",");
        var res = [];
        temp.forEach(function (subCad) {
            var aux = subCad.trim().split(" ");
            if (aux[0].trim().length > 0) {
                res.push(aux[0].trim());
                res.push(aux[aux.length - 1].trim());
            }
        });
        resMap.set(parameterType[i], res);
    }
    return resMap;
};
var getNodeName = function (node) { return node.name ? node.name.replace(/\s+/g, '_') : node.id; };
exports.parseModel = function (modelInfo, oracleAddresses) { return new Promise(function (resolve, reject) {
    parseBpmn(modelInfo.bpmn).then(function (definitions) {
        modelInfo.solidity = 'pragma solidity ^0.4.10;\n';
        modelInfo.controlFlowInfoMap = new Map();
        // Sanity checks
        if (!definitions.diagrams || definitions.diagrams.length == 0)
            throw new Error('ERROR: No diagram found in BPMN file');
        var proc = definitions.diagrams[0].plane.bpmnElement;
        if (proc.$type !== 'bpmn:Process')
            throw new Error('ERROR: No root process model found');
        // BPMN to Solidity parsing
        //console.log('about to start control flow analysis');
        var globalNodeMap = new Map(), globalNodeIndexMap = new Map(), globalEdgeIndexMap = new Map(), globalControlFlowInfo = new Array();
        globalNodeMap.set(proc.id, proc);
        var mainControlFlowInfo = collectControlFlowInfo(proc, globalNodeMap, globalControlFlowInfo);
        var globalControlFlowInfoMap = new Map();
        globalControlFlowInfo.forEach(function (controlFlowInfo) { return globalControlFlowInfoMap.set(controlFlowInfo.self.id, controlFlowInfo); });
        var _loop_2 = function (controlFlowInfo) {
            indexesToRemove = [];
            controlFlowInfo.sources.forEach(function (nodeId) {
                if (globalNodeMap.get(nodeId).triggeredByEvent) {
                    controlFlowInfo.nodeList.push(nodeId);
                    indexesToRemove.push(controlFlowInfo.sources.indexOf(nodeId));
                    var nodeInfo = globalControlFlowInfoMap.get(nodeId);
                    if (!globalNodeMap.get(nodeInfo.sources[0]).isInterrupting)
                        nodeInfo.nodeList.forEach(function (childId) {
                            var index = controlFlowInfo.nodeList.indexOf(childId);
                            if (index >= 0)
                                controlFlowInfo.nodeList.splice(index, 1);
                        });
                }
            });
            indexesToRemove.forEach(function (index) {
                controlFlowInfo.sources.splice(index, 1);
            });
            if (is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:SubProcess") && controlFlowInfo.self.triggeredByEvent && globalNodeMap.get(controlFlowInfo.sources[0]).isInterrupting == false) {
                controlFlowInfo.isEmbedded = false;
            }
        };
        var indexesToRemove;
        // Event sub-processes appear in the source list, and not in the nodeList
        // In addition, all the elements of a non interrupting subprocess event appears embedded on its parent process
        // So here I fix that as a temporal solution.
        for (var _i = 0, globalControlFlowInfo_1 = globalControlFlowInfo; _i < globalControlFlowInfo_1.length; _i++) {
            var controlFlowInfo = globalControlFlowInfo_1[_i];
            _loop_2(controlFlowInfo);
        }
        var _loop_3 = function (controlFlowInfo) {
            controlFlowInfo.activeMessages = [];
            if (!controlFlowInfo.isEmbedded) {
                nonInterruptingEvents = [], (callActivities = [], multiinstanceActivities = []);
                controlFlowInfo.nodeList.map(function (nodeId) { return globalNodeMap.get(nodeId); })
                    .forEach(function (e) {
                    if (((is(e, "bpmn:Task") || is(e, "bpmn:SubProcess")) && e.loopCharacteristics && e.loopCharacteristics.$type === 'bpmn:MultiInstanceLoopCharacteristics')) {
                        controlFlowInfo.multiinstanceActivities.set(e.id, modelInfo.name + ':' + getNodeName(e) + '_Contract');
                        multiinstanceActivities.push(e.id);
                        if (is(e, "bpmn:SubProcess"))
                            controlFlowInfo.childSubprocesses.set(e.id, modelInfo.name + ':' + getNodeName(e) + '_Contract');
                    }
                    else if (is(e, "bpmn:CallActivity")) {
                        controlFlowInfo.callActivities.set(e.id, getNodeName(e));
                        callActivities.push(e.id);
                    }
                });
                // It is also necessary to add boundary events of embedded sub-processes
                controlFlowInfo.boundaryEvents.forEach(function (nodeId) {
                    var node = globalNodeMap.get(nodeId);
                    if (!node.cancelActivity) {
                        controlFlowInfo.nonInterruptingEvents.set(node.id, modelInfo.name + ':' + getNodeName(node) + '_Contract');
                        nonInterruptingEvents.push(node.id);
                        controlFlowInfo.nodeList.push(nodeId); // Eager reinsertion
                        if (node.outgoing)
                            for (var _i = 0, _a = node.outgoing; _i < _a.length; _i++) {
                                var outgoing = _a[_i];
                                controlFlowInfo.edgeList.push(outgoing.id);
                            }
                        if (node.eventDefinitions[0] && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                            controlFlowInfo.activeMessages.push(nodeId);
                    }
                    else if (node.eventDefinitions[0] && is(node.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                        controlFlowInfo.nodeList.push(nodeId);
                });
                globalNodeMap.forEach(function (node) {
                    if (is(node, 'bpmn:SubProcess') && node.triggeredByEvent && controlFlowInfo.self.id === node.$parent.id) {
                        for (var _i = 0, _a = node.flowElements.filter(function (e) { return is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent"); }); _i < _a.length; _i++) {
                            var start = _a[_i];
                            if (start.isInterrupting == false) {
                                var parent = globalNodeMap.get(start.$parent.id);
                                controlFlowInfo.nonInterruptingEvents.set(start.id, modelInfo.name + ':' + getNodeName(parent) + '_Contract');
                                nonInterruptingEvents.push(start.id);
                                controlFlowInfo.nodeList.push(start.id);
                                if (start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                    controlFlowInfo.activeMessages.push(start.id);
                            }
                            if (start.eventDefinitions[0] && is(start.eventDefinitions[0], "bpmn:MessageEventDefinition"))
                                controlFlowInfo.nodeList.push(start.id);
                            if (start.outgoing)
                                for (var _b = 0, _c = start.outgoing; _b < _c.length; _b++) {
                                    var outgoing = _c[_b];
                                    controlFlowInfo.edgeList.push(outgoing.id);
                                }
                        }
                    }
                });
                controlFlowInfo.nodeList.forEach(function (nodeId, index, array) {
                    controlFlowInfo.nodeIndexMap.set(nodeId, index);
                    globalNodeIndexMap.set(nodeId, index);
                    controlFlowInfo.nodeNameMap.set(nodeId, getNodeName(globalNodeMap.get(nodeId)));
                    var node = globalNodeMap.get(nodeId);
                    if ((node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0)) {
                        var aux = extractParameters(node.documentation[0].text);
                        var toIterate = aux.get('input');
                        if (is(node, "bpmn:ServiceTask")) {
                            if (!controlFlowInfo.localOracleData.has(node.id))
                                controlFlowInfo.localOracleData.set(node.id, []);
                            var nodeName = getNodeName(globalNodeMap.get(nodeId));
                            if (oracleAddresses.has(nodeName))
                                controlFlowInfo.localOracleAddress.set(nodeId, oracleAddresses.get(nodeName));
                            var toIterate = aux.get('input');
                            for (var i = 0; i < toIterate.length; i += 2)
                                controlFlowInfo.localOracleData.get(node.id).push(new definitions_1.ParameterInfo(toIterate[i], toIterate[i + 1]));
                        }
                        else {
                            var parameters = [];
                            for (var i = 0; i < toIterate.length; i += 2)
                                parameters.push(new definitions_1.ParameterInfo(toIterate[i], toIterate[i + 1]));
                            controlFlowInfo.localParameters.set(nodeId, parameters);
                        }
                    }
                });
                controlFlowInfo.edgeList.forEach(function (edgeId, index, array) {
                    controlFlowInfo.edgeIndexMap.set(edgeId, index);
                    globalEdgeIndexMap.set(edgeId, index);
                });
                //   console.log(controlFlowInfo.nodeList);
                var codeGenerationInfo = {
                    nodeList: controlFlowInfo.nodeList,
                    nodeMap: globalNodeMap,
                    oracleInfo: controlFlowInfo.localOracleData,
                    oracleAddress: controlFlowInfo.localOracleAddress,
                    activeMessages: controlFlowInfo.activeMessages,
                    multiinstanceActivities: multiinstanceActivities,
                    callActivities: callActivities,
                    nonInterruptingEvents: nonInterruptingEvents,
                    processId: function () { return controlFlowInfo.self.id; },
                    nodeName: function (nodeId) { return getNodeName(globalNodeMap.get(nodeId)); },
                    eventType: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        if (node.eventDefinitions && node.eventDefinitions[0]) {
                            var cad = node.eventDefinitions[0].$type;
                            return cad.substring(5, cad.length - 15);
                        }
                        return 'Default';
                    },
                    allEventTypes: function () {
                        var taken = [];
                        globalNodeMap.forEach(function (node) {
                            if (node.eventDefinitions && node.eventDefinitions[0] && !is(node.eventDefinitions[0], 'bpmn:TerminateEventDefinition') && !is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition')) {
                                var cad = node.eventDefinitions[0].$type;
                                if (taken.indexOf(cad.substring(5, cad.length - 15)) < 0)
                                    taken.push(cad.substring(5, cad.length - 15));
                            }
                        });
                        return taken;
                    },
                    getMessages: function () {
                        var taken = [];
                        var candidates = controlFlowInfo.boundaryEvents;
                        controlFlowInfo.nodeList.forEach(function (nodeId) {
                            if (is(globalNodeMap.get(nodeId), "bpmn:SubProcess")) {
                                var subP = globalControlFlowInfoMap.get(nodeId);
                                candidates = candidates.concat(subP.boundaryEvents);
                                subP.sources.forEach(function (id) {
                                    if (!is(globalNodeMap.get(id), "bpmn:Subprocess") && candidates.indexOf(id) < 0)
                                        candidates.push(id);
                                });
                            }
                        });
                        candidates.forEach(function (evtId) {
                            var evt = globalNodeMap.get(evtId);
                            if (evt.eventDefinitions && evt.eventDefinitions[0] && is(evt.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                taken.push(evt);
                        });
                        return taken;
                    },
                    getThrowingMessages: function () {
                        var res = [];
                        controlFlowInfo.nodeList.forEach(function (nodeId) {
                            var node = globalNodeMap.get(nodeId);
                            if (is(node, "bpmn:EndEvent") && node.eventDefinitions && node.eventDefinitions[0] && is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition'))
                                res.push(nodeId);
                        });
                        return res;
                    },
                    getCatchingEvents: function (subprocId, evType) {
                        var res = [];
                        globalNodeMap.forEach(function (node) {
                            if (node.eventDefinitions && node.eventDefinitions[0] && !is(node.eventDefinitions[0], 'bpmn:MessageEventDefinition')) {
                                var cad = node.eventDefinitions[0].$type;
                                if (cad.substring(5, cad.length - 15) === evType) {
                                    if (is(node, 'bpmn:StartEvent')) {
                                        var parent = globalNodeMap.get(node.$parent.id);
                                        if (parent.triggeredByEvent && parent.$parent.id === subprocId)
                                            res.unshift(node.id);
                                    }
                                    else if (is(node, 'bpmn:BoundaryEvent')) {
                                        if (node.$parent.id === subprocId)
                                            res.push(node.id);
                                    }
                                }
                            }
                        });
                        return res;
                    },
                    getContracts2Call: function () {
                        var res = callActivities.concat(multiinstanceActivities);
                        nonInterruptingEvents.forEach(function (evtId) {
                            var node = globalNodeMap.get(evtId);
                            res.push(is(node, "bpmn:StartEvent") ? node.$parent.id : evtId);
                        });
                        return res;
                    },
                    getParent: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return globalNodeMap.get(node.$parent.id).$parent.id;
                        if (is(node, "bpmn:BoundaryEvent") && node.cancelActivity)
                            return node.attachedToRef.id;
                        if (is(node, "bpmn:BoundaryEvent") && !node.cancelActivity)
                            return node.$parent.id;
                        return nodeId;
                    },
                    getContractName: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return node.$parent.id;
                        if (is(node, "bpmn:BoundaryEvent"))
                            return node.id;
                        return false;
                    },
                    concatParameters: function (nodeId, isInput, hasType, hasPreviousParameter) {
                        var node = globalNodeMap.get(nodeId);
                        var res = "";
                        if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                            var localParams = isInput ? extractParameters(node.documentation[0].text).get('input') : extractParameters(node.documentation[0].text).get('output');
                            if (localParams.length > 0) {
                                res = hasType ? localParams[0] + " " + localParams[1] : localParams[1];
                                for (var i = 2; i < localParams.length; i += 2)
                                    res += ',' + (hasType ? localParams[i] + " " + localParams[i + 1] : localParams[i + 1]);
                            }
                        }
                        return hasPreviousParameter && res.length > 0 ? ', ' + res : res;
                    },
                    getAllChildren: function (subprocId, direct) {
                        var taken = direct ? [] : [subprocId];
                        controlFlowInfo.nodeList.map(function (nodeId) { return globalNodeMap.get(nodeId); })
                            .forEach(function (e) {
                            if (is(e, "bpmn:SubProcess") || callActivities.indexOf(e.id) >= 0 || (nonInterruptingEvents.indexOf(e.id) >= 0 && !is(e, "bpmn:StartEvent")))
                                if (((direct && subprocId !== e.id && e.$parent.id === subprocId) || !direct) && taken.indexOf(e.id) < 0)
                                    taken.push(e.id);
                        });
                        return taken;
                    },
                    isInterrupting: function (eventId) {
                        var node = globalNodeMap.get(eventId);
                        if (is(node, "bpmn:StartEvent") && node.$parent && globalNodeMap.get(node.$parent.id).triggeredByEvent)
                            return node.isInterrupting != false;
                        if (is(node, "bpmn:BoundaryEvent"))
                            return node.cancelActivity != false;
                        return false;
                    },
                    isEmbeddedSubprocess: function (subprocessId) {
                        return globalControlFlowInfoMap.get(subprocessId).isEmbedded;
                    },
                    hasInternalElements: function () {
                        var res = false;
                        if (callActivities.length > 0 || multiinstanceActivities.length > 0)
                            return true;
                        controlFlowInfo.nodeList.map(function (nodeId) { return globalNodeMap.get(nodeId); })
                            .forEach(function (e) {
                            if (is(e, "bpmn:ExclusiveGateway") || is(e, 'bpmn:ParallelGateway') || is(e, "bpmn:EventBasedGateway") || is(e, 'bpmn:ServiceTask') || is(e, 'bpmn:ScriptTask')) {
                                res = true;
                            }
                        });
                        return res;
                    },
                    preMarking: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        var bitarray = [];
                        if (node.incoming)
                            for (var _i = 0, _a = node.incoming; _i < _a.length; _i++) {
                                var incoming = _a[_i];
                                bitarray[controlFlowInfo.edgeIndexMap.get(incoming.id)] = 1;
                            }
                        else
                            bitarray[0] = 1;
                        var result = '0b';
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    postMarking: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        var bitarray = [];
                        var result = '0b';
                        if (node.outgoing)
                            for (var _i = 0, _a = node.outgoing; _i < _a.length; _i++) {
                                var outgoing = _a[_i];
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        else
                            result = '0';
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    subprocessStartMarking: function (subprocessId) {
                        var toSearch = globalNodeMap.get(subprocessId);
                        var bitarray = [];
                        var result = '0b';
                        if (is(toSearch, 'bpmn:BoundaryEvent')) {
                            for (var _i = 0, _a = toSearch.outgoing; _i < _a.length; _i++) {
                                var outgoing = _a[_i];
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        }
                        else {
                            for (var _b = 0, _c = toSearch.flowElements.filter(function (e) { return is(e, "bpmn:FlowNode") && is(e, "bpmn:StartEvent"); }); _b < _c.length; _b++) {
                                var node = _c[_b];
                                if (node.$parent.id === subprocessId && node.outgoing)
                                    for (var _d = 0, _e = node.outgoing; _d < _e.length; _d++) {
                                        var outgoing = _e[_d];
                                        bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                                    }
                            }
                        }
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    subprocessMarking: function (subprocessId) {
                        var bitarray = [];
                        var result = '0b';
                        var localInfo = globalControlFlowInfoMap.get(subprocessId);
                        if (is(globalNodeMap.get(controlFlowInfo.self.id), "bpmn:BoundaryEvent") && multiinstanceActivities.indexOf(subprocessId) < 0) {
                            var parentInfo = globalControlFlowInfoMap.get(controlFlowInfo.self.$parent.id);
                            localInfo.edgeList.forEach(function (edgeId) {
                                bitarray[parentInfo.edgeIndexMap.get(edgeId)] = 1;
                            });
                        }
                        else {
                            localInfo.edgeList.forEach(function (edgeId) {
                                bitarray[controlFlowInfo.edgeIndexMap.get(edgeId)] = 1;
                            });
                        }
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    extendedSubprocessMarking: function (subprocessId, orCondition) {
                        var candidates = callActivities.concat(multiinstanceActivities.concat(nonInterruptingEvents));
                        var res = orCondition ? "|| (" : "\u0026" + "\u0026" + "!(";
                        candidates.forEach(function (nodeId) {
                            var node = globalNodeMap.get(nodeId);
                            if (node.$parent.id === subprocessId) {
                                res += getNodeName(node) + "_activeInstances != 0 || ";
                            }
                        });
                        return res.length < 10 ? '' : res.substring(0, res.length - 4) + ")";
                    },
                    flowEdgeIndex: function (flowEdgeId) {
                        var bitarray = [];
                        bitarray[controlFlowInfo.edgeIndexMap.get(flowEdgeId)] = 1;
                        var result = '0b';
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    flowNodeIndex: function (flowNodeId) {
                        var bitarray = [];
                        bitarray[globalNodeIndexMap.get(flowNodeId)] = 1;
                        var result = '0b';
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    isPartOfDeferredChoice: function (eventId) {
                        var event = globalNodeMap.get(eventId);
                        if (event.incoming) {
                            var node = event.incoming[0].sourceRef;
                            return is(node, 'bpmn:EventBasedGateway');
                        }
                        return false;
                    },
                    deferredChoiceMarking: function (eventId) {
                        var event = globalNodeMap.get(eventId);
                        var node = event.incoming[0].sourceRef;
                        var bitarray = [];
                        var result = '0b';
                        if (node.outgoing)
                            for (var _i = 0, _a = node.outgoing; _i < _a.length; _i++) {
                                var outgoing = _a[_i];
                                bitarray[controlFlowInfo.edgeIndexMap.get(outgoing.id)] = 1;
                            }
                        else
                            result = '0';
                        for (var i = bitarray.length - 1; i >= 0; i--)
                            result += bitarray[i] ? '1' : '0';
                        return new BigNumber(result).toFixed();
                    },
                    globalDeclarations: function () {
                        if (controlFlowInfo.globalParameters.length > 0)
                            return controlFlowInfo.globalParameters;
                        else
                            return '';
                    },
                    nodeParameters: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        if ((node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0)) {
                            if (extractParameters(node.documentation[0].text).get('input').length > 0)
                                return true;
                            return false;
                        }
                        return false;
                    },
                    nodeFunctionBody: function (nodeId) {
                        var node = globalNodeMap.get(nodeId);
                        if (node.script) {
                            return node.script.split('->');
                        }
                        else if (node.documentation && node.documentation[0].text && node.documentation[0].text.length > 0) {
                            return extractParameters(node.documentation[0].text).get('body');
                        }
                        else
                            return '';
                    },
                    getCondition: function (flowEdge) { return flowEdge.conditionExpression ? flowEdge.conditionExpression.body : flowEdge.name ? flowEdge.name : flowEdge.id; },
                    is: is
                };
                var localSolidity = bpmn2solTemplate(codeGenerationInfo);
                // Code for using the WorkList template
                userTaskList = [];
                parameterInfo = new Map();
                hasDefault = false;
                controlFlowInfo.nodeList.forEach(function (nodeId) {
                    var node = globalNodeMap.get(nodeId);
                    if (is(node, 'bpmn:Task') && !is(node, 'bpmn:ServiceTask') && !is(node, 'bpmn:ScriptTask')) {
                        if (controlFlowInfo.localParameters.has(nodeId) && controlFlowInfo.localParameters.get(nodeId).length > 0) {
                            userTaskList.push(nodeId);
                            parameterInfo.set(nodeId, controlFlowInfo.localParameters.get(nodeId));
                        }
                        else
                            hasDefault = true;
                    }
                });
                if (hasDefault)
                    userTaskList.push('defaultId');
                var workListGenerationInfo = {
                    nodeList: userTaskList,
                    parameterInfo: parameterInfo,
                    nodeMap: globalNodeMap,
                    processId: function () { return controlFlowInfo.self.id; },
                    nodeName: function (nodeId) {
                        if (nodeId === 'defaultId')
                            return 'DefaultTask';
                        return getNodeName(globalNodeMap.get(nodeId));
                    },
                    getParameterType: function (nodeId, isType) {
                        var res = "";
                        var localParams = parameterInfo.get(nodeId);
                        if (localParams && localParams.length > 0) {
                            res = isType ? localParams[0].type : localParams[0].name;
                            for (var i = 1; i < localParams.length; i++)
                                res += isType ? ", " + localParams[i].type : ", " + localParams[i].name;
                        }
                        return res.length > 0 ? ', ' + res : res;
                    },
                    getParameters: function (nodeId, hasType) {
                        var res = "";
                        var localParams = parameterInfo.get(nodeId);
                        if (localParams && localParams.length > 0) {
                            res = hasType ? localParams[0].type + " " + localParams[0].name : localParams[0].name;
                            for (var i = 1; i < localParams.length; i++)
                                res += hasType ? ", " + localParams[i].type + " " + localParams[i].name : ", " + localParams[i].name;
                        }
                        return res.length > 0 ? ', ' + res : res;
                    },
                    is: is
                };
                var workListSolidity = workList2solTemplate(workListGenerationInfo);
                modelInfo.solidity += localSolidity;
                modelInfo.solidity += workListSolidity;
                modelInfo.controlFlowInfoMap.set(getNodeName(controlFlowInfo.self), controlFlowInfo);
            }
            else {
                controlFlowInfo.nodeList.forEach(function (nodeId) {
                    return controlFlowInfo.nodeIndexMap.set(nodeId, globalNodeIndexMap.get(nodeId));
                });
                controlFlowInfo.edgeList.forEach(function (edgeId) {
                    return controlFlowInfo.edgeIndexMap.set(edgeId, globalEdgeIndexMap.get(edgeId));
                });
            }
        };
        var multiinstanceActivities, callActivities, nonInterruptingEvents, userTaskList, parameterInfo, hasDefault;
        for (var _a = 0, globalControlFlowInfo_2 = globalControlFlowInfo; _a < globalControlFlowInfo_2.length; _a++) {
            var controlFlowInfo = globalControlFlowInfo_2[_a];
            _loop_3(controlFlowInfo);
        }
        //console.log('-----------------------------------');
        //console.log('              SOLIDITY');
        //console.log('-----------------------------------');
        //console.log(modelInfo.solidity);
        //////////////////////////////////////////////////////////////////////////////////       
        var entryContractName = modelInfo.name + ':' + (proc.name ? proc.name.replace(/\s+/g, '_') : proc.id) + '_Contract';
        modelInfo.entryContractName = entryContractName;
        resolve();
        // console.log(globalControlFlowInfo);
    }).catch(function (err) { throw new Error(err); });
}); };
//# sourceMappingURL=models.parsers.js.map
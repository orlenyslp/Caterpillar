import * as BpmnModdle from "bpmn-moddle";
import * as fs from "fs";
import * as path from "path";
import * as ejs from "ejs";
import BigNumber from "bignumber.js";

import { SubProcessInfo, IFlowInfo, ElementIFlow, IDataInfo, ParamInfo, EdgeScript } from './ParsingInfo';


const bpmn2solIDataEJS = fs.readFileSync(
     path.join(__dirname, "../../../templates") + "/bpmn2solIData.ejs",
    "utf-8"
);

const factory2solEJS = fs.readFileSync(
    path.join(__dirname, "../../../templates") + "/factory2Solidity.ejs",
   "utf-8"
);

let bpmn2solIDataTemplate = ejs.compile(bpmn2solIDataEJS);
let factory2solTemplate = ejs.compile(factory2solEJS);

let moddle = new BpmnModdle();
let parseBpmn = bpmnDoc => {
    return new Promise((resolve, reject) => {
        moddle.fromXML(bpmnDoc, (err, definitions) => {
            if (!err) resolve(definitions);
            else reject(err);
        });
    });
};

export let parseBpmnModel = (bpmnModel: string) => {
    return new Promise<SubProcessInfo>((resolve, reject) => {
        parseBpmn(bpmnModel)
            .then((definitions: any) => { 
                
                if (!definitions.diagrams || definitions.diagrams.length == 0)
                    throw new Error("ERROR: No diagram found in BPMN file");
                
                let proc = definitions.rootElements[0];
                
                let processInfo: SubProcessInfo = buildProcessTree(proc, 1, false);
                
                resolve(processInfo);

               // reject(new SubProcessInfo());

            });
        });
    };

    let buildProcessTree = (proc: any, instCount: number, eventSubProc: boolean) => {
        
        let processNode: SubProcessInfo = new SubProcessInfo(instCount);
        processNode.procId = getNodeName(proc);
        
        let iFlow: IFlowInfo = new IFlowInfo();
        let iData: IDataInfo = new IDataInfo();
        
        let arcCount = 1;
        let elemCount = 1;

        let preCMap: Map<number, Array<number>> = new Map();
        let postCMap: Map<number, Array<number>> = new Map();
        let nextMap: Map<number, Array<number>> = new Map();
        let prevMap: Map<number, Array<number>> = new Map();
        let typeInfoMap: Map<number, Array<number>> = new Map();
        let isEvtGateway: Array<boolean> = new Array();
        let eNames: Map<number, string> = new Map();
        let isExternal: Array<boolean> = new Array();

        // Numbering the elements/arcs in the current Sub-process
        proc.flowElements.forEach(element => {
            switch(element.$type) { 
                case 'bpmn:SequenceFlow': { 
                   iFlow.edgeIndexMap.set(element.id, arcCount++);
                   break; 
                } 
                default: {
                    if(element.$type === 'bpmn:UserTask' || element.$type === 'bpmn:ReceiveTask' || element.$type === 'bpmn:ServiceTask')
                        isExternal[elemCount] = true;
                    iFlow.nodeIndexMap.set(element.id, elemCount);
                    eNames.set(elemCount, getNodeName(element));
                    preCMap.set(elemCount, new Array());
                    postCMap.set(elemCount, new Array());
                    nextMap.set(elemCount, new Array());
                    prevMap.set(elemCount++, new Array());
                    break;
                }
             } 
        });

        if(proc.documentation)
            updateGlobalFields(proc.documentation[0].text, iData);

        proc.flowElements.forEach(element => {
            let eInd: number = iFlow.nodeIndexMap.get(element.id);
            let typeInfo: Array<number> = []
            let cardinality: number = 1;
            
            if(is(element.$type, 'task')) {
                typeInfo[0] = 1;  // Activity
                typeInfo[3] = 1;  // Task
            } else if(is(element.$type, 'gateway' )) {
                typeInfo[1] = 1;
            } else if(is(element.$type, 'event' )) {
                typeInfo[2] = 1;
                iFlow.eventCodeMap.set(eInd, getNodeName(element));
                setEventType(typeInfo, element);
            }
            // Multi-Instances
            if(element.loopCharacteristics) {
                if(element.loopCharacteristics.isSequential)
                    typeInfo[7] = 1;  // Sequential
                else 
                    typeInfo[6] = 1;  // Parallel
                if(element.loopCharacteristics.loopCardinality)
                     cardinality = parseInt(element.loopCharacteristics.loopCardinality.body);
            }
            switch(element.$type) { 
                case 'bpmn:SequenceFlow': {
                    let prevInd: number = iFlow.nodeIndexMap.get(element.sourceRef.id);
                    let nextInd: number = iFlow.nodeIndexMap.get(element.targetRef.id);
                    let arcInd: number = iFlow.edgeIndexMap.get(element.id);
                    postCMap.get(prevInd)[arcInd] = 1;
                    if(!(isExternal[nextInd] === true))
                        nextMap.get(prevInd).push(nextInd);
                    preCMap.get(nextInd)[arcInd] = 1;
                    prevMap.get(nextInd).push(prevInd);
                    if(element.conditionExpression) {
                        if(!iData.gatewayScripts.has(prevInd))
                            iData.gatewayScripts.set(prevInd, new Array());
                        iData.gatewayScripts.get(prevInd).push(new EdgeScript(iFlow.edgeIndexMap.get(element.id), element.conditionExpression.body));
                    }
                    break;
                }
                case 'bpmn:UserTask': { 
                   typeInfo[11] = 1;
                   if(element.documentation)
                       updateParameters(element.documentation[0].text, eInd, iData);
                    checkEmptyParameters(eInd, iData);
                   break; 
                }
                case 'bpmn:ScriptTask': {
                    typeInfo[12] = 1;
                    if(element.script)
                        iData.scripts.set(eInd, element.script);
                   break; 
                } 
                case 'bpmn:ServiceTask': { 
                    typeInfo[13] = 1;
                    if(element.documentation)
                       updateParameters(element.documentation[0].text, eInd, iData);
                    checkEmptyParameters(eInd, iData);
                    break; 
                } 
                case 'bpmn:ReceiveTask': { 
                   typeInfo[14] = 1;
                   checkEmptyParameters(eInd, iData);
                   break; 
                } 
                case 'bpmn:Task': { 
                    typeInfo[10] = 1;
                    break; 
                }
                case 'bpmn:ExclusiveGateway': { 
                    typeInfo[4] = 1;
                    break; 
                }
                case 'bpmn:ParallelGateway': { 
                    typeInfo[5] = 1;
                    break; 
                }
                case 'bpmn:EventBasedGateway': { 
                    typeInfo[7] = 1;
                    isEvtGateway[eInd] = true;
                    break; 
                }
                case 'bpmn:InclusiveGateway': { 
                    typeInfo[6] = 1;
                    break; 
                }
                case 'bpmn:CallActivity': { 
                    typeInfo[0] = 1;
                    typeInfo[4] = 1;
                    break; 
                }
                case 'bpmn:SubProcess': { 
                    typeInfo[0] = 1;
                    typeInfo[5] = 1;
                    let evtSubP: boolean = false;
                    if(element.triggeredByEvent) {
                        // Event- SubProcess
                        typeInfo[12] = 1;
                        evtSubP = true;
                    } else {
                        // Expanded SubProcess
                        typeInfo[10] = 1;
                    }
                    let childProc: SubProcessInfo = buildProcessTree(element, cardinality, evtSubP);
                    childProc.parent = processNode;
                    processNode.children.push(childProc);
                    break; 
                }
                case 'bpmn:StartEvent': { 
                    if(eventSubProc) {
                        typeInfo[6] = 1;
                        if(!element.isInterrupting === false)
                            typeInfo[4] = 1;  // Interrupting Event
                    } else
                        typeInfo[5] = 1;
                    setEventType(typeInfo, element);
                    break; 
                }
                case 'bpmn:EndEvent': { 
                    typeInfo[3] = 1; // Always Throw 
                    typeInfo[9] = 1;
                    break; 
                }
                case 'bpmn:IntermediateThrowEvent': { 
                    typeInfo[3] = 1;
                    typeInfo[7] = 1;
                    break; 
                }
                case 'bpmn:IntermediateCatchEvent': { 
                    typeInfo[7] = 1;
                    break; 
                }
                case 'bpmn:BoundaryEvent': { 
                    typeInfo[8] = 1;
                    let subPInd: number = iFlow.nodeIndexMap.get(element.attachedToRef.id)
                    console.log(subPInd);
                    if(!iFlow.attachedEvents.has(subPInd))
                        iFlow.attachedEvents.set(subPInd, new Array());
                    iFlow.attachedEvents.get(subPInd).push(eInd);
                    if(!(element.cancelActivity === false)) {
                        typeInfo[4] = 1;
                        console.log(element)
                    }
                    break; 
                }
                default: {
                    break;
                }
             }
             typeInfoMap.set(eInd, typeInfo);  
        });

        proc.flowElements.forEach(element => {
            if(is(element.$type, 'gateway' )) {
                let eInd: number = iFlow.nodeIndexMap.get(element.id);
                if(prevMap.get(eInd).length > 1)
                    typeInfoMap.get(eInd)[3] = 1;
            }
        });

        iFlow.nodeIndexMap.forEach((eInd, eId) => {
            let elementInfo: ElementIFlow = new ElementIFlow(eInd, eNames.get(eInd));
            elementInfo.typeInfo = toStrDecimal(typeInfoMap.get(eInd));
            elementInfo.postC = toStrDecimal(postCMap.get(eInd));
            elementInfo.next = nextMap.get(eInd);
            if(prevMap.get(eInd).length > 0 && isEvtGateway[prevMap.get(eInd)[0]])
                elementInfo.preC = toStrDecimal(postCMap.get(prevMap.get(eInd)[0]))
            else 
                elementInfo.preC = toStrDecimal(preCMap.get(eInd));
            iFlow.elementInfo.set(eInd, elementInfo);
        });

        let codeGenerationInfo = { 
            contractName: getNodeName(proc),
            globalFields: iData.globalFields,
            elementBitMask: eInd => {
                let bitarray = [];
                bitarray[eInd] = 1;
                let result = "0b";
                for (let i = bitarray.length - 1; i >= 0; i--)
                    result += bitarray[i] ? "1" : "0";
                return new BigNumber(result).toFixed();
            },
            indexArrayToBitSet: (indexArray: Array<number>) => { return arrToStrDecimal(indexArray); },
            gatewayScript: iData.gatewayScripts,
            taskScripts: iData.scripts,
            postC: (eInd: number) => { return iFlow.elementInfo.get(eInd).postC },
            checkOutList: groupOutParam(iData.outParams),
            checkOutReturn: (params: Array<string>, returnType: string) => { 
                let res = '';
                for(let i = 0; i < params.length - 1; i++)
                    res += ' ' + params[i] + ','
                if(params.length > 0)
                    res = returnType + '(' + res  + params[params.length - 1] + ')';
                return res;
            }, 
            checkInList: groupInParam(iData.inParams, iData.userScripts),
            checkInParams: (params: Array<ParamInfo>, renamedParams: Array<string>) => {
                let res = '';
                for(let i = 0; i < params.length; i++)
                    res += ', ' + params[i].type + ' ' + renamedParams[i];
                return res;
            }
        }
        iData.iDataSolidity = bpmn2solIDataTemplate(codeGenerationInfo);
        iData.factorySolidity = factory2solTemplate(codeGenerationInfo);
        
        processNode.iData = iData;
        processNode.iflow = iFlow;
        
        return processNode;
    }

    let groupOutParam = (candidates: Map<number, Array<ParamInfo>>) => {
        
        let resMap: Map<string, number> = new Map();
        let resArray: Array<any> = new Array();

        candidates.forEach((params: Array<ParamInfo>, eInd: number) => {
            let joinKey: string = 'e';
            let types: Array<String> = new Array();
            let names: Array<String> = new Array();
            let funcName: string = 'checkOut';
            
            params.forEach(param => {
                funcName += param.type.charAt(0).toLocaleUpperCase() + param.type.charAt(1);
                joinKey += param.type;
                types.push(param.type);
                names.push(param.name);
            });
            if(!resMap.has(joinKey)) {
                resMap.set(joinKey, resArray.length);
                resArray.push(
                    {
                        funcName: funcName,
                        types: types,
                        eIndexes: new Array(),
                        paramNames: new Array()
                    }
                )
            }
            let arrInd: number = resMap.get(joinKey);
            resArray[arrInd].eIndexes.push(eInd);
            resArray[arrInd].paramNames.push(names);
        });
        return resArray;
    };

    let groupInParam = (candidates: Map<number, Array<ParamInfo>>, scripts: Map<number, string>) => {
        let resMap: Map<string, number> = new Map();
        let resArray: Array<any> = new Array();
        
        candidates.forEach((params: Array<ParamInfo>, eInd: number) => {
            
            let joinKey: string = 'e';
            let renamedParams: Array<string> = new Array();
            let renamedScript: string = scripts.get(eInd);
            
            let i: number = 1;
            
            params.forEach(param => {
                joinKey += param.type;
                renamedParams.push('i' + i);
                if(renamedScript)
                    renamedScript = renamedScript.replace(param.name, 'i' + i++);
            });

            if(!resMap.has(joinKey)) {
                resMap.set(joinKey, resArray.length);
                resArray.push(
                    {
                        params: params,
                        renamedParams: renamedParams,
                        eIndexes: new Array(),
                        scripts: new Array()
                    }
                )
            }
            let arrInd: number = resMap.get(joinKey);
            resArray[arrInd].eIndexes.push(eInd);
            resArray[arrInd].scripts.push(renamedScript);
        })
        return resArray;
    }

    let sortParameters = (params: Array<ParamInfo>) => {
        params.sort(compareTo);
    }

    let compareTo = (a:ParamInfo, b:ParamInfo) => {
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }

    let toStrDecimal = (bitArray => {
        let result = '0b';
        for (let i = bitArray.length - 1; i >= 0; i--)
            result += bitArray[i] ? '1' : '0';
        return result === '0b' ? '0' : new BigNumber(result).toFixed();
    })

    let arrToStrDecimal = ((indexArray: Array<number>) => {
        let bitarray: Array<number> = new Array();
        for(let i = 0; i < indexArray.length; i++)
            bitarray[indexArray[i]] = 1;
        return toStrDecimal(bitarray);
    });

    let is = (element: string, type: string) => {
        return element.toLocaleLowerCase().includes(type.toLocaleLowerCase());
    }

    let setEventType = (typeInfo: Array<Number>, element: any) => {
        if(element.eventDefinitions) {
            switch(element.eventDefinitions[0].$type) {
                case 'bpmn:ErrorEventDefinition': {
                    typeInfo[13] = 1;
                    break;
                }
                case 'bpmn:EscalationEventDefinition': {
                    typeInfo[14] = 1;
                    break;
                }
                case 'bpmn:MessageEventDefinition': {
                    typeInfo[12] = 1;
                    break;
                }
                case 'bpmn:SignalEventDefinition': {
                    typeInfo[15] = 1;
                    break;
                }
                case 'bpmn:TerminateEventDefinition': {
                    typeInfo[11] = 1;
                    break;
                } 
            }
        } else {
            // Default (None) event
            typeInfo[10] = 1;
        }

    }

    let getNodeName = (node: any) => node.name ? node.name.replace(/\s+/g, "_") : node.id;

    let updateGlobalFields = (cad: string, iData: IDataInfo) => {
        if(!cad)
            return;
        let arr = cad.split(';');
        arr.forEach( gField => {
            if(gField.trim().length > 0) {
                let arr1 = gField.trim().split(' ');
                iData.globalFields.push(new ParamInfo(arr1[0], arr1[arr1.length -1]));
            }
        })
    }

    let checkEmptyParameters = (eInd: number, iData: IDataInfo) => {
        if(!iData.inParams.has(eInd))
            iData.inParams.set(eInd, new Array());
        if(!iData.outParams.has(eInd))
            iData.outParams.set(eInd, new Array());
    }

    let updateParameters = (cad: string, eInd: number, iData: IDataInfo) => {
        let arr = cad.split('@');
        if(arr.length >= 3) {
            // if(controlFlowInfo != null)
            //    controlFlowInfo.taskRoleMap.set(nodeId, arr[1].trim());
            if(arr[2].length > 1)
               cad = arr[2];
            else 
              return;
        // else
        //    return undefined;
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
            for (let i = 1; i < firstSplit.length; i++) 
                aux += firstSplit[i];
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

        let inParameters: Array<ParamInfo> = [];
        let outParameters: Array<ParamInfo> = [];
            
        let toIterate = resMap.get('output');
        for (let i = 0; i < toIterate.length; i += 2)
            inParameters.push(new ParamInfo(toIterate[i], toIterate[i + 1]));
        
        sortParameters(inParameters);
        iData.inParams.set(eInd, inParameters);
        iData.userScripts.set(eInd, resMap.get("body")[0]);
        toIterate = resMap.get('input');

        for (let i = 0; i < toIterate.length; i += 2)
            outParameters.push(new ParamInfo(toIterate[i], toIterate[i + 1]));
        
        sortParameters(outParameters);
        iData.outParams.set(eInd, outParameters)
    };

    




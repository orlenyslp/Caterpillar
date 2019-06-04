
export class SubProcessInfo {
    procId: string;

    iflow: IFlowInfo;
    
    iData: IDataInfo;

    parent: SubProcessInfo;

    children: Array<SubProcessInfo> = new Array();

    constructor(public instCount: number) {}
}

export class IFlowInfo { 
    nodeIndexMap: Map<string, number> = new Map();
    edgeIndexMap: Map<string, number> = new Map();
    elementInfo: Map<number, ElementIFlow> = new Map();
    attachedEvents: Map<number, Array<number>> = new Map();
    eventCodeMap: Map<number, string> = new Map();
}

export class ElementIFlow {
    preC: string;
    postC: string;
    typeInfo: string;
    next: Array<number>;
    constructor(public eInd: number, public eName: string){}
}

export class IDataInfo {
    globalFields: Array<ParamInfo> = new Array();

    scripts: Map<number, string> = new Map();

    userScripts: Map<number, string> = new Map();

    gatewayScripts: Map<number, Array<EdgeScript>> = new Map();

    inParams: Map<number, Array<ParamInfo>> = new Map();

    outParams: Map<number, Array<ParamInfo>> = new Map();

    iDataSolidity: string;

    factorySolidity: string
}

export class EdgeScript {
    constructor(public edgeInd: number, public script: string) {}
}

export class ParamInfo {
    constructor(public type: string, public name: string) {}
}
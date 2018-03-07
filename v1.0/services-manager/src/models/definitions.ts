
export class ParameterInfo {
    constructor(public type: string, public name: string) {}
}

export class OracleInfo {
    solidity: string;
    address: string;
    entryContractName: string;
    contract: any;
    constructor(public oracleName: string, public parameterInfo: Array<ParameterInfo>) {}
}
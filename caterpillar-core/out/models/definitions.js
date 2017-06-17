"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ModelInfo = (function () {
    function ModelInfo() {
    }
    return ModelInfo;
}());
exports.ModelInfo = ModelInfo;
var ParameterInfo = (function () {
    function ParameterInfo(type, name) {
        this.type = type;
        this.name = name;
    }
    return ParameterInfo;
}());
exports.ParameterInfo = ParameterInfo;
var ControlFlowInfo = (function () {
    function ControlFlowInfo(self, nodeList, edgeList, sources, boundaryEvents) {
        this.self = self;
        this.nodeList = nodeList;
        this.edgeList = edgeList;
        this.sources = sources;
        this.boundaryEvents = boundaryEvents;
        this.parent = null;
        this.isEmbedded = false;
        this.nodeNameMap = new Map();
        this.nodeIndexMap = new Map();
        this.edgeIndexMap = new Map();
        this.multiinstanceActivities = new Map();
        this.nonInterruptingEvents = new Map();
        this.callActivities = new Map();
        this.childSubprocesses = new Map();
        this.globalParameters = "";
        this.localParameters = new Map();
        this.localOracleData = new Map();
        this.localOracleAddress = new Map();
    }
    return ControlFlowInfo;
}());
exports.ControlFlowInfo = ControlFlowInfo;
//# sourceMappingURL=definitions.js.map
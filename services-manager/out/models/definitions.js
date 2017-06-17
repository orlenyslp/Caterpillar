"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ParameterInfo = (function () {
    function ParameterInfo(type, name) {
        this.type = type;
        this.name = name;
    }
    return ParameterInfo;
}());
exports.ParameterInfo = ParameterInfo;
var OracleInfo = (function () {
    function OracleInfo(oracleName, parameterInfo) {
        this.oracleName = oracleName;
        this.parameterInfo = parameterInfo;
    }
    return OracleInfo;
}());
exports.OracleInfo = OracleInfo;
//# sourceMappingURL=definitions.js.map
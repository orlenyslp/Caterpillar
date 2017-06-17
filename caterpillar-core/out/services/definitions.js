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
var ServiceInfo = (function () {
    function ServiceInfo(serviceName, parameterInfo) {
        this.serviceName = serviceName;
        this.parameterInfo = parameterInfo;
    }
    return ServiceInfo;
}());
exports.ServiceInfo = ServiceInfo;
//# sourceMappingURL=definitions.js.map
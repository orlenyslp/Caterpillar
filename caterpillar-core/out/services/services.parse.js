"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var ejs = require("ejs");
var service2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/service2sol.ejs', 'utf-8');
var service2solTemplate = ejs.compile(service2solEJS);
exports.parseService = function (serviceInfo) {
    var codeGenerationInfo = {
        oracleInfo: serviceInfo,
        concatServiceParameters: function (serviceId, hasType) {
            console.log("Service ", serviceId);
            var res = "";
            serviceInfo.parameterInfo.forEach(function (info) {
                res += hasType ? info.type + " " + info.name + "," : " " + info.name + ",";
            });
            return res;
        },
    };
    serviceInfo.solidity = service2solTemplate(codeGenerationInfo);
    console.log(serviceInfo.solidity);
};
//# sourceMappingURL=services.parse.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var ejs = require("ejs");
var oracle2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') + '/oracle2sol.ejs', 'utf-8');
var oracle2solTemplate = ejs.compile(oracle2solEJS);
exports.parseOracle = function (oracleInfo) {
    var codeGenerationInfo = {
        oracleInfo: oracleInfo,
        concatOracleParameters: function (oracleId, hasType) {
            var res = "";
            oracleInfo.parameterInfo.forEach(function (info) {
                res += hasType ? info.type + " " + info.name + "," : " " + info.name + ",";
            });
            return res;
        },
    };
    oracleInfo.solidity = oracle2solTemplate(codeGenerationInfo);
};
//# sourceMappingURL=models.parsers.js.map
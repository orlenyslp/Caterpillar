"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var processes = express_1.Router();
/* GET processes listing. */
processes.get('/', function (req, res, next) {
    res.send('respond with a resource');
});
exports.default = processes;
//# sourceMappingURL=processes.controller.js.map
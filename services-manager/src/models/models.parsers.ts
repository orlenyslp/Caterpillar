import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import * as BigNumber from 'bignumber.js';
import { OracleInfo } from "./definitions";

const oracle2solEJS = fs.readFileSync(path.join(__dirname, '../../templates') +'/oracle2sol.ejs', 'utf-8');
let oracle2solTemplate = ejs.compile(oracle2solEJS);


export let parseOracle = (oracleInfo: OracleInfo) => {

    let codeGenerationInfo = {
        oracleInfo: oracleInfo,
        concatOracleParameters: (oracleId, hasType) => {
            var res = "";
            oracleInfo.parameterInfo.forEach(info => {
                res += hasType ? info.type + " " + info.name + "," : " " + info.name + ",";      
            })
            return res;
        },
    };

    oracleInfo.solidity = oracle2solTemplate(codeGenerationInfo);
}
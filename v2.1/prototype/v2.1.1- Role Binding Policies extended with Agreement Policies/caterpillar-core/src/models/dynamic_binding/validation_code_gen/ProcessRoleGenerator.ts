import * as fs from "fs";
import * as path from "path";
import * as ejs from "ejs";

const procesRole2solEJS = fs.readFileSync(
    path.join(__dirname, "../../../../templates") + "/procesRole2sol.ejs",
    "utf-8"
);

const procesRole2ArrsolEJS = fs.readFileSync(
    path.join(__dirname, "../../../../templates") + "/processRole2solArray.ejs",
    "utf-8"
);

let procesRole2solTemplate = ejs.compile(procesRole2solEJS);
let procesRole2solArrTemplate = ejs.compile(procesRole2ArrsolEJS);

export let generateRoleTaskContract = (processData: Map<string, Array<any>>, contractName: string, isArray: boolean)  => {
    return new Promise<string>((resolve, reject) => {
        try {
            /////////////////////////////////////////////
            ///     SMART CONTRACT GENERATION        ///
            ////////////////////////////////////////////

            let sortedMaping: Map<string, Array<number>> = new Map();
            if(isArray) {
                for (let [key, indexes] of processData) {
                    let maxTaskInd = 0;  
                    indexes.forEach( index => { 
                        maxTaskInd = index.taskIndex > maxTaskInd ? index.taskIndex : maxTaskInd; 
                    })
                    let sorted: Array<number> = new Array();
                    for(let i = 0; i <= maxTaskInd; i++) {
                        let toPush = 0;
                        indexes.forEach( index => { 
                            if(index.taskIndex === i) 
                                toPush = index.roleIndex; 
                        })
                        sorted.push(toPush);
                    }
                    sortedMaping.set(key, sorted);
                }
            } else {
                sortedMaping = processData;
            }

            let codeGenerationInfo = {
                contractName: contractName,
                processData: sortedMaping
            }
            let policySolidity = isArray ? procesRole2solArrTemplate(codeGenerationInfo) : procesRole2solTemplate(codeGenerationInfo);
            resolve(policySolidity);
        } catch(ex) {
            console.log('Error: ', ex);
            reject('Error on the contract creation');
        }
    })
}


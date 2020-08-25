import { IContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { ProcessCEMetadata } from "../../adapters/mongo-db/repo-models";
import { PromiseError, Component } from "./../../adapters/errors/promise-error";
import { AccountInfo } from "../../adapters/ethereum-blockchain/structs/account-info";
import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";

import {
  TypeMessage,
  print,
  printSeparator,
} from "../../adapters/logs/console-log";

import { ContractInfo } from "../../adapters/ethereum-blockchain/structs/contract-info";

import * as ethereumAdapter from "../../adapters/ethereum-blockchain/ethereum-adapter";
import * as mongoDBAdapper from "../../adapters/mongo-db/mongo-db-adapter";
import { RepoType } from "../../adapters/mongo-db/repo-types";

let defaultAccount: AccountInfo;

export let createProcessInstance = async (
  processId: string,
  runtimeRegistry: ContractInfo,
  accessCtrolAddr: string,
  rbPolicyAddr: string,
  taskRoleMapAddr: string
) => {
  if (!defaultAccount)
    defaultAccount = await ethereumAdapter.defaultDeployment();

  return await ethereumAdapter.execContractFunctionAsync(
    runtimeRegistry.address,
    runtimeRegistry.abi,
    new FunctionInfo("newRestrictedCInstanceFor", ["bytes32", "address", "address", "address", "address"]),
    defaultAccount,
    [
      processId,
      "0x0000000000000000000000000000000000000000",
      accessCtrolAddr,
      rbPolicyAddr,
      taskRoleMapAddr
    ]
  );
};

export let handleNewInstance = (
  contractName: string,
  repoId: string,
  transactionHash: string,
  processAddress: string,
  gasUsed: number
) => {
  print(
    `New Instance of contract ${contractName} (ID: ${repoId}) Created`,
    TypeMessage.success
  );
  print(`  TransactionHash: ${transactionHash}`, TypeMessage.info);
  print(`  Address: ${processAddress}`, TypeMessage.info);
  print(`  GasUsed: ${gasUsed} units`, TypeMessage.info);
  printSeparator();
};

export let handleWorkitemExecuted = (
  taskName: string,
  workitemIndex: number,
  worklistAddress: string,
  transactionHash: string,
  gasUsed: number
) => {
  print(
    `Task ${taskName} (Workitem: ${workitemIndex} in worklist at ${worklistAddress}) executed successfully`,
    TypeMessage.success
  );
  print(`  TransactionHash: ${transactionHash}`, TypeMessage.info);
  print(`  GasUsed: ${gasUsed} units`, TypeMessage.info);
  printSeparator();
};

export let queryProcessState = async (
  pAddress: string,
  runtimeRegistry: ContractInfo
) => {
  if (!ethereumAdapter.isValidBlockchainAddress(pAddress))
    return Promise.reject(`Invalid Process Instance Address ${pAddress}`);
  try {
    let defaultAccount = await ethereumAdapter.defaultDeployment();
    let nestedContractsQueue = [pAddress];
    let enabledWorkitems = [];

    for (let i = 0; i < nestedContractsQueue.length; i++) {
      pAddress = nestedContractsQueue[i];

      let pId = await ethereumAdapter.callContractFunction(
        runtimeRegistry.address,
        runtimeRegistry.abi,
        new FunctionInfo("bundleFor", ["address"], "bytes32"),
        defaultAccount,
        [pAddress]
      );

      let processInfo = await mongoDBAdapper.findModelMetadataById(
        RepoType.ProcessCompiledEngine,
        pId
      );

      let worklistAddress = await ethereumAdapter.callContractFunction(
        pAddress,
        processInfo.contractInfo.abi,
        new FunctionInfo("getWorklistAddress", [], "address"),
        defaultAccount,
        []
      );

      let startedActivities = ethereumAdapter.toBinaryArray(
        await ethereumAdapter.callContractFunction(
          pAddress,
          processInfo.contractInfo.abi,
          new FunctionInfo("startedActivities", [], "uint"),
          defaultAccount,
          []
        )
      );
      let dictionary = (processInfo as ProcessCEMetadata).indexToElementMap;
      let worklistAbi = (processInfo as ProcessCEMetadata).worklistABI;

      for (let bit = 0; bit < startedActivities.length; bit++) {
        if (startedActivities[bit] === "1") {
          if (dictionary[bit].type === "Workitem") {
            let reqInd = ethereumAdapter.toBinaryArray(
              await ethereumAdapter.callContractFunction(
                worklistAddress,
                worklistAbi,
                new FunctionInfo(
                  "workItemsFor",
                  ["uint256", "address"],
                  "uint256"
                ),
                defaultAccount,
                [bit, pAddress]
              )
            );

            for (let l = 0; l < reqInd.length; l++) {
              if (reqInd[l] === "1") {
                let notFound = true;
                for (let m = 0; m < enabledWorkitems.length; m++) {
                  if (
                    enabledWorkitems[m].elementId === dictionary[bit].id &&
                    enabledWorkitems[m].bundleId === pId
                  ) {
                    enabledWorkitems[m].hrefs.push(
                      `/worklists/${worklistAddress}/workitems/${l}`
                    );
                    enabledWorkitems[m].pCases.push(
                      await ethereumAdapter.callContractFunction(
                        worklistAddress,
                        worklistAbi,
                        new FunctionInfo(
                          "processInstanceFor",
                          ["uint"],
                          "address"
                        ),
                        defaultAccount,
                        [l]
                      )
                    );
                    notFound = false;
                    break;
                  }
                }
                if (notFound) {
                  enabledWorkitems.push({
                    elementId: dictionary[bit].id,
                    elementName: dictionary[bit].name,
                    input: findParameters(worklistAbi, dictionary[bit].name),
                    bundleId: pId,
                    processAddress: pAddress,
                    pCases: [pAddress],
                    hrefs: [`/worklists/${worklistAddress}/workitems/${l}`],
                  });
                }
              }
            }
          } else if (dictionary[bit].type === "Service") {
            // PENDING
          } else if (dictionary[bit].type === "Separate-Instance") {
            let startedInstances = ethereumAdapter.toBinaryArray(
              await ethereumAdapter.callContractFunction(
                pAddress,
                processInfo.contractInfo.abi,
                new FunctionInfo(
                  "startedInstanceIndexFor",
                  ["uint256"],
                  "uint256"
                ),
                defaultAccount,
                [bit]
              )
            );
            let allInstances = await ethereumAdapter.callContractFunction(
              pAddress,
              processInfo.contractInfo.abi,
              new FunctionInfo("allInstanceAddresses", [], "address[]"),
              defaultAccount,
              []
            );
            for (let l = 0; l < startedInstances.length; l++)
              if (startedInstances[l] === "1")
                nestedContractsQueue.push(allInstances[l]);
          }
        }
      }
    }
    print("Started Workitems (Enabled Tasks) Info: ");
    print(JSON.stringify(enabledWorkitems), TypeMessage.data);
    printSeparator();
    return enabledWorkitems;
  } catch (error) {
    return Promise.reject(
      new PromiseError(
        `Error Qerying the state of process instance at address ${pAddress}`,
        error,
        [new Component("execution-monitor", "queryProcessState")]
      )
    );
  }
};

export let executeWorkitem = async (
  wlAddress: string,
  wiIndex: number,
  inputParameters: Array<any>,
  runtimeRegistry: ContractInfo
) => {
  try {
    if (!ethereumAdapter.isValidBlockchainAddress(wlAddress))
      return Promise.reject(`Invalid Worklist Instance Address ${wlAddress}`);

    let defaultAccount = await ethereumAdapter.defaultDeployment();

    let pId = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("worklistBundleFor", ["address"], "bytes32"),
      defaultAccount,
      [wlAddress]
    );

    let processInfo = await mongoDBAdapper.findModelMetadataById(
      RepoType.ProcessCompiledEngine,
      pId
    );

    let worklistAbi = (processInfo as ProcessCEMetadata).worklistABI;

    let nodeIndex = await ethereumAdapter.callContractFunction(
      wlAddress,
      worklistAbi,
      new FunctionInfo("elementIndexFor", ["uint256"], "uint256"),
      defaultAccount,
      [wiIndex]
    );

    let taskInfo = (processInfo as ProcessCEMetadata).indexToElementMap[
      nodeIndex
    ];

    inputParameters = [wiIndex].concat(inputParameters);

    print(
      `Starting Execution of Task ${taskInfo.name}, on worklist ${wlAddress}`,
      TypeMessage.pending
    );

    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      wlAddress,
      worklistAbi,
      new FunctionInfo(taskInfo.name, ["uint256", "bool"]),
      defaultAccount,
      inputParameters
    );

    return {
      transactionHash: transactionHash,
      worklistAbi: worklistAbi,
      taskName: taskInfo.name,
    };
  } catch (error) {
    return Promise.reject(
      new PromiseError(
        `Error Executing Workitme from Worklist at address ${wlAddress}`,
        error,
        [new Component("execution-monitor", "executeWorkitem")]
      )
    );
  }
};

////////////////////////////////////////////////
/////////////// PRIVATE FUNCTIONS //////////////
////////////////////////////////////////////////

let findParameters = (contractAbi: string, functionName: string) => {
  let jsonAbi = JSON.parse(contractAbi);
  let candidates = [];
  jsonAbi.forEach((element: any) => {
    if (element.name === functionName) {
      candidates = element.inputs;
    }
  });
  let res = [];
  candidates.forEach((element) => {
    if (element.name && element.name !== "workitemId") res.push(element);
  });
  return res;
};

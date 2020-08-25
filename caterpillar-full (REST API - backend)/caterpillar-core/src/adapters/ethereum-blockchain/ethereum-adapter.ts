import { PromiseError, Component } from "./../errors/promise-error";
import { print, TypeMessage, printSeparator } from "./../logs/console-log";
import { FunctionInfo } from "./structs/function-info";
import { AccountInfo } from "./structs/account-info";
import { CompilationResult } from "./structs/compilation-output";
import {
  DeploymentError,
  DeploymentResult,
  DeploymentOutput,
} from "./structs/deployment-output";

const Web3 = require("web3");

// HttpProvider does not support subscriptions for ganache-cli
// let web3 = new Web3(Web3.givenProvider || "http://localhost:8545");

let web3 = new Web3(
  new Web3.providers.WebsocketProvider("ws://localhost:8545")
);

export let setProvider = (newProvider: string) => {
  web3.setProvider(newProvider);
};

export let getProvider = () => {
  return web3.currentProvider;
};

export let deploySmartContractSync = (
  contractInfo: CompilationResult,
  accountInfo: AccountInfo,
  args?: any[]
) => {
  return new Promise<DeploymentOutput>((resolve, reject) => {
    try {
      let contractEncoding = encodeSmartContract(
        contractInfo.abi,
        contractInfo.bytecode,
        args
      );

      let deploymentResult = new DeploymentResult(contractInfo.contractName);
      contractEncoding[0]
        .deploy(contractEncoding[1])
        .send(formatJsonInput(accountInfo))
        .on("error", (error: any) => {
          reject(
            new DeploymentError(contractInfo.contractName, error.toString())
          );
        })
        .on("receipt", (receipt: any) => {
          deploymentResult.gasCost = receipt.gasUsed;
          deploymentResult.transactionHash = receipt.transactionHash;
        })
        .then((contractInstance: any) => {
          deploymentResult.contractAddress = contractInstance.options.address;
          resolve(deploymentResult);
        })
        .catch((error: any) => {
          console.log(error);
          reject(
            new DeploymentError(contractInfo.contractName, error.toString())
          );
        });
    } catch (error) {
      reject(new DeploymentError(contractInfo.contractName, error.toString()));
    }
  });
};

export let deploySmartContractAsync = (
  contractInfo: CompilationResult,
  accountInfo: AccountInfo,
  args?: any[]
) => {
  return new Promise<any>((resolve, reject) => {
    try {
      let contractEncoding = encodeSmartContract(
        contractInfo.abi,
        contractInfo.bytecode,
        args
      );
      contractEncoding[0]
        .deploy(contractEncoding[1])
        .send(formatJsonInput(accountInfo))
        .on("error", (error: any) => {
          reject(
            new DeploymentError(contractInfo.contractName, error.toString())
          );
        })
        .on("transactionHash", (transactionHash: any) => {
          resolve(transactionHash);
        })
        .catch((error: any) => {
          reject(
            new DeploymentError(contractInfo.contractName, error.toString())
          );
        });
    } catch (error) {
      reject(new DeploymentError(contractInfo.contractName, error.toString()));
    }
  });
};

let encodeSmartContract = (
  contractAbi: string,
  contractBytecode: string,
  args?: any[]
) => {
  let deploy_contract = new web3.eth.Contract(JSON.parse(contractAbi));
  let payload = args
    ? {
        data: contractBytecode,
        arguments: args,
      }
    : {
        data: contractBytecode,
      };
  return [deploy_contract, payload];
};

export let execContractFunctionSync = (
  contractAddress: string,
  contractAbi: string,
  functionInfo: FunctionInfo,
  accountInfo: AccountInfo,
  args?: Array<any>
) => {
  return new Promise<DeploymentOutput>((resolve, reject) => {
    let encodedFunction = encodeFunctionCall(functionInfo, contractAbi, args);
    web3.eth
      .sendTransaction({
        from: accountInfo.from,
        to: contractAddress,
        data: encodedFunction,
        gas: accountInfo.gas,
      })
      .then((receipt) => {
        resolve(
          new DeploymentResult(
            functionInfo.functionName,
            receipt.transactionHash,
            contractAddress,
            receipt.gasUsed
          )
        );
      })
      .catch((error: any) => {
        reject(
          new DeploymentError(functionInfo.functionName, error.toString())
        );
      });
  });
};

export let execContractFunctionAsync = (
  contractAddress: string,
  contractAbi: string,
  functionInfo: FunctionInfo,
  accountInfo: AccountInfo,
  args?: Array<any>
) => {
  return new Promise<any>((resolve, reject) => {
    try {
      let encodedFunction = encodeFunctionCall(functionInfo, contractAbi, args);
      web3.eth
        .sendTransaction({
          from: accountInfo.from,
          to: contractAddress,
          data: encodedFunction,
          gas: accountInfo.gas,
        })
        .once("transactionHash", (transactionHash) => {
          resolve(transactionHash);
        })
        .on("error", (error: any) => {
          print(error, TypeMessage.error);
          reject(
            new PromiseError(
              `Invalid execution of function ${functionInfo.functionName}`,
              error,
              [new Component("ethereum-adapter", "executeContractFunctionSync")]
            )
          );
        });
    } catch (error) {
      print(error, TypeMessage.error);
      reject(
        new PromiseError(
          `Invalid execution of function ${functionInfo.functionName}`,
          error,
          [new Component("ethereum-adapter", "executeContractFunctionSync")]
        )
      );
    }
  });
};

export let callContractFunction = (
  contractAddress: string,
  contractAbi: string,
  functionInfo: FunctionInfo,
  accountInfo: AccountInfo,
  args?: Array<any>
) => {
  return new Promise<any>((resolve, reject) => {
    try {
      let encodedFunction = encodeFunctionCall(functionInfo, contractAbi, args);
      web3.eth
        .call({
          to: contractAddress,
          data: encodedFunction,
          gas: accountInfo.gas,
        })
        .then((callResult: string) => {
          resolve(
            functionInfo.fullInfo
              ? decodeParametersFull(functionInfo.returnType, callResult)
              : decodeParameter(functionInfo.returnType, callResult)
          );
        })
        .catch((error: any) => {
          reject(
            new PromiseError(
              `Error calling function ${functionInfo.functionName}`,
              error,
              [new Component("ethereum-adapter", "callContractFunction")]
            )
          );
        });
    } catch (error) {
      reject(
        new PromiseError(
          `Error Encoding function ${functionInfo.functionName}`,
          error,
          [new Component("ethereum-adapter", "callContractFunction")]
        )
      );
    }
  });
};

export let isValidBlockchainAddress = (address: string): boolean => {
  if (address === "0x0000000000000000000000000000000000000000") return false;
  return web3.utils.isAddress(address);
};

export let isValidBlockchainAddressList = (addresses: Array<string>) => {
  for (let i = 0; i < addresses.length; i++)
    if (!isValidBlockchainAddress(addresses[i])) return false;
  return true;
};

export let defaultDeployment = () => {
  return new Promise<AccountInfo>((resolve, reject) => {
    Promise.all([web3.eth.getAccounts(), web3.eth.getGasPrice()]).then(
      (res) => {
        resolve(new AccountInfo(res[0][0], web3.utils.toHex(4700000), res[1]));
      }
    );
  });
};

export let subscribeToLog = async (
  contractAddress: string,
  contractAbi: string,
  eventInfo: FunctionInfo,
  functionCallback: any
) => {
  try {
    let subscription = web3.eth.subscribe(
      "logs",
      {
        fromBlock: await web3.eth.getBlockNumber(),
        address: contractAddress,
        topics: [encodeEventFromAbi(eventInfo, contractAbi)],
      },
      (error: any, result: any) => {
        if (result) {
          {
            web3.eth
              .getTransactionReceipt(result.transactionHash)
              .then((transactionInfo) => {
                functionCallback(
                  result.transactionHash,
                  transactionInfo.gasUsed,
                  decodeEventLogFromAbi(eventInfo, contractAbi, result.data)
                );
                subscription.unsubscribe();
              });
          }
        } else {
          functionCallback("", error);
          subscription.unsubscribe();
        }
      }
    );
  } catch (error) {
    print("ERROR IN ETHEREUM ADAPTER", TypeMessage.error);
    print(error, TypeMessage.error);
    printSeparator();
  }
};

export let listenForTransactionMined = async (
  transactionHash: string,
  functionCallback: any
) => {
  web3.eth
    .getTransactionReceipt(transactionHash)
    .then((transactionInfo: any) => {
      if (transactionInfo) {
        functionCallback(transactionHash, transactionInfo);
      } else {
        subscribeToNewBlock(transactionHash, functionCallback);
      }
    });
};

let subscribeToNewBlock = (transactionHash: string, functionCallback: any) => {
  let subscription = web3.eth
    .subscribe("newBlockHeaders")
    .on("data", (blockHeader: any) => {
      web3.eth
        .getTransactionReceipt(transactionHash)
        .then((transactionInfo: any) => {
          if (transactionInfo) {
            functionCallback(transactionHash, transactionInfo);
            subscription.unsubscribe();
          }
        });
    })
    .on("error", (error: any) => {
      console.log(error);
    });
};

export let toBinaryArray = (inputNumber: any) => {
  return parseInt(inputNumber).toString(2).split("").reverse();
};

//////////////////////////////////////////////
////////////// PRIVATE FUNCTIONS /////////////
//////////////////////////////////////////////

let encodeEventFromAbi = (eventInfo: FunctionInfo, contractAbi: string) => {
  let eventAbi = extractEventFromAbi(eventInfo, contractAbi);
  return eventAbi ? web3.eth.abi.encodeEventSignature(eventAbi) : undefined;
};

let decodeEventLogFromAbi = (
  eventInfo: FunctionInfo,
  contractAbi: string,
  encodedData: string
) => {
  let eventAbi = extractEventFromAbi(eventInfo, contractAbi);
  return eventAbi
    ? web3.eth.abi.decodeLog(eventAbi.inputs, encodedData)
    : undefined;
};

let decodeParametersFull = (paramTypes: string, data: string) => {
  let paramList = paramTypes.split(",");
  let decoded = web3.eth.abi.decodeParameters(paramList, data);
  return decoded;
};

let decodeParameter = (paramType: string, data: string) => {
  let decoded = web3.eth.abi.decodeParameter(paramType, data);
  if (paramType.includes("bytes32")) {
    if (decoded instanceof Array)
      return decoded.map((element) => {
        return web3.utils.hexToUtf8(element);
      });
    return web3.utils.hexToUtf8(decoded);
  }
  return decoded;
};

let extractEventFromAbi = (eventInfo: FunctionInfo, contractAbi: string) => {
  let jsonAbi: Array<any> = JSON.parse(contractAbi);

  return jsonAbi.find((element) => {
    if (
      element.name !== eventInfo.functionName ||
      eventInfo.paramTypes.length !== element.inputs.length
    ) {
      return false;
    }

    let input: Array<any> = element.inputs;

    for (let i = 0; i < input.length; i++) {
      if (input[i].type !== eventInfo.paramTypes[i]) return false;
    }
    return true;
  });
};

let encodeParameters = (types: Array<string>, values: Array<any>) => {
  return web3.eth.abi.encodeParameters(
    types,
    fixBytes32(types, valuesToString(values))
  );
};

let encodeFunctionCall = (
  functionInfo: FunctionInfo,
  contractAbi: string,
  parameters: Array<any>
) => {
  let jsonAbi: Array<any> = JSON.parse(contractAbi);

  let functionAbi = jsonAbi.find((element) => {
    if (
      element.name !== functionInfo.functionName ||
      functionInfo.paramTypes.length !== element.inputs.length
    ) {
      return false;
    }

    let input: Array<any> = element.inputs;

    for (let i = 0; i < input.length; i++) {
      if (input[i].type !== functionInfo.paramTypes[i]) return false;
    }
    return true;
  });

  let fixedParams = parameters
    ? fixBytes32(functionInfo.paramTypes, valuesToString(parameters))
    : [];

  return functionAbi
    ? web3.eth.abi.encodeFunctionCall(functionAbi, fixedParams)
    : undefined;
};

let valuesToString = (values: Array<any>): Array<any> => {
  let fixedValues: Array<any> = values.map((element) => {
    if (element instanceof Array) {
      let res: Array<any> = valuesToString(element);
      return res;
    } else {
      return element.toString();
    }
  });
  return fixedValues;
};

let fixBytes32 = (types: Array<string>, values: Array<any>) => {
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "bytes32") {
      if ((values[i] as string).length > 32)
        values[i] = (values[i] as string).slice(0, 31);
      values[i] = web3.utils.fromAscii(values[i]);
    }
  }
  return values;
};

let formatJsonInput = (accountInfo: AccountInfo) => {
  return {
    from: accountInfo.from,
    gas: accountInfo.gas,
    gasPrice: accountInfo.gasPrice,
  };
};

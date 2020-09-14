import { print, TypeMessage } from "./console-log";

export let printl = (logId: number, info: any) => {
  switch (logId) {
    case 1: {
      print(
        `REQUESTED: Create new instance of process ${info[0]} ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 2: {
      print(
        `REQUESTED: Query instances (blockchain addresses) of process ${info[0]} ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 3: {
      print(
        `REQUESTED: Query state of process instance running at ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 4: {
      print(
        `REQUESTED: Execute workitem with ID ${info[0]} on worklist ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 5: {
      print(
        `REQUESTED: Compile and deploy process model named ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 6: {
      print(
        `REQUESTED: Query IDs of process models from runtime registry at ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 7: {
      print(
        `REQUESTED: Query compilation metadata of process ID ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 8: {
      print(
        `STARTED: Generating and compiling smart contracts from process model named ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 9: {
      print(
        `REQUESTED: Compile and Deploy smart contract for ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 10: {
      print(
        `REQUESTED: Query Runtime Registry metadata from ${
          info[0] ? "ID " + info[0] : "address " + info[1]
        }`,
        TypeMessage.pending
      );
      break;
    }
    case 11: {
      print(
        `REQUESTED: CheckIn (execute) task ID ${info[0]} on IData at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 12: {
      print(
        `REQUESTED: CheckOut task ID ${info[0]} on IData at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 13: {
      print(`REQUESTED: Create new instance of ${info}`, TypeMessage.pending);
      break;
    }
    case 14: {
      print(
        `REQUESTED: Update IFlow node at ${info[0]} with BPMN element ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 15: {
      print(
        `REQUESTED: Update IFlow node at ${info[0]} to link subprocess as ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 16: {
      print(
        `REQUESTED: Update IFlow node at ${info[0]} with IFactory at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 17: {
      print(
        `REQUESTED: Query Process Information from IFlow node at ${info[0]}`,
        TypeMessage.pending
      );
      break;
    }
    case 18: {
      print(
        `REQUESTED: Query registered ${info[0]} from Runtime Registry at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 19: {
      print(
        `REQUESTED: Query parsed metadata from process with ID ${info}`,
        TypeMessage.pending
      );
      break;
    }
    case 20: {
      print(
        `REQUESTED: Compile and deploy role binding policy`,
        TypeMessage.pending
      );
      print(`${info}`, TypeMessage.data);
      break;
    }
    case 21: {
      print(
        `REQUESTED: Compile and deploy role-task map`,
        TypeMessage.pending
      );
      print(`   Map: ${info}`, TypeMessage.data);
      break;
    }
    case 22: {
      print(
        `REQUESTED: Query state of role ${info[0]} for process instance at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 23: {
      print(
        `REQUESTED: Perform role-binding operation ${info[0]} for process instance at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 24: {
      print(
        `REQUESTED: Query Metadata of ${info[0]} runing at ${info[1]}`,
        TypeMessage.pending
      );
      break;
    }
    case 25: {
      print(
        `REQUESTED: Query Addresses of policy-related contracts for process instance runing at ${info}`,
        TypeMessage.pending
      );
      break;
    }
  }
};

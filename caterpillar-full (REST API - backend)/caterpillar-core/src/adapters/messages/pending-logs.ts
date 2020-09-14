import { print, TypeMessage } from "./console-log";

export let printp = (logId: number, info?: any) => {
  switch (logId) {
    case 1: {
      print(`Parsing process model ...`, TypeMessage.pending);
      break;
    }
    case 2: {
      print(
        "SUBMITED: Update compilation metadata in process repository ...",
        TypeMessage.pending
      );
      break;
    }
    case 3: {
      print(
        "SUBMITED: Update process hierarchical relationships in runtime registry ...",
        TypeMessage.pending
      );
      break;
    }
    case 4: {
      print(
        `SUBMITED: Deploy and register factory contracts ...`,
        TypeMessage.pending
      );
      break;
    }
    case 5: {
      print(
        "SUBMITED: Deploy and register worklist contracts ...",
        TypeMessage.pending
      );
      break;
    }
    case 6: {
      print(``, TypeMessage.pending);
      break;
    }
    case 7: {
      print(``, TypeMessage.pending);
      break;
    }
    case 8: {
      print(``, TypeMessage.pending);
      break;
    }
    case 9: {
      print(``, TypeMessage.pending);
      break;
    }
    case 10: {
      print(``, TypeMessage.pending);
      break;
    }
    case 11: {
      print(``, TypeMessage.pending);
      break;
    }
    case 12: {
      print(``, TypeMessage.pending);
      break;
    }
  }
};

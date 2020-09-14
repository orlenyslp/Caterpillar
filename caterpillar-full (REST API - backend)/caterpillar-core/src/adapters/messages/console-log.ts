let colors = require("colors/safe");
const util = require("util");

export let printActive = true;

export enum TypeMessage {
  info, // Grey
  data, // Grey
  success, // Green
  error, //Red
  pending, // Cyan,
  separator, // Black
}

export let print = (message: string, customMessage?: TypeMessage) => {
  if (printActive) {
    try {
      let toPrint = JSON.parse(message);
      console.log(util.inspect(toPrint, false, null, true /* enable colors */));
    } catch (e) {
      switch (customMessage) {
        case TypeMessage.error: {
          console.log(colors.bgRed(message));
          break;
        }
        case TypeMessage.success: {
          console.log(colors.green(message));
          break;
        }
        case TypeMessage.pending: {
          console.log(colors.cyan(message));
          break;
        }
        case TypeMessage.data: {
          console.log(colors.gray(message));
          break;
        }
        case TypeMessage.info: {
          console.log(colors.gray(message));
          break;
        }
        default: {
          console.log(message);
        }
      }
    }
  }
};

export let printSeparator = () => {
  if (printActive) {
    console.log(
      colors.black(
        "----------------------------------------------------------------"
      )
    );
  }
};

import { print, TypeMessage, printSeparator } from './console-log';

export let printError = (componentName: string, functionName: string, error: any) => {
    print(
      `Error at Interpretation engine -- deploymentDediator.${functionName}`,
      TypeMessage.error
    );
    print(error, TypeMessage.error);
    printSeparator();
  };
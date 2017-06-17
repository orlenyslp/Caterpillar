# Caterpillar
BPMN execution engine on Ethereum

Caterpillar, a Business Process Management System (BPMS) that runs on top of Ethereum and that relies on the translation of process models into smart contracts. More specifically, Caterpillar accepts as input a process model specified in BPMN and generates a set of smart contracts that captures the underlying behavior. The smart contracts, written in Ethereum's Solidity language, can then be compiled and deployed to the public or any other private Ethereum network using standard tools. Moreover, Caterpillar exhibits a REST API that can be used to interact with running instances of the deployed process models.

Caterpillar also provides a set of modelling tools and an execution panel which interact with the underlying execution engine via the aforementioned REST API. The latter can also be used by third party software to interact in a programmatic way via Caterpillar with the instances of business process running on the blockchain.

Caterpillar’s code distribution in this repository contains three different folders. 
The folder caterpillar_core includes the implementation of the core components, execution_panel includes the code of a BPMN visualizer that serves to keep track of the execution state of process instances and lets users check in process data, and services_manager contains the implementation for an external service used for demonstration purposes.

Before using the Caterpillar it is necessary to download the source code of the applications.

## How to use Caterpillar Core

Open a terminal in your computer and move into the folder __caterpillar_core__. 

For installing the dependencies, run the comand 

     npm install

For running the application use the comand 

     gulp

By default the application will runs on http://localhost:3000.

The application provides a REST API to interact with the core of Caterpillar. The following table summarizes the mapping of resource-related actions:

| Verb | URI                       | Description                                                            |
| -----| ------------------------- | ---------------------------------------------------------------------- |
| POST | /models                   | Registers a BPMN model (Triggers also code generation and compilation) |
| GET  | /models                   | Retrieves the list of registered BPMN models                           |
| GET  | /models/:mid              | Retrieves a BPMN model and its compilation artifacts                   |
| POST | /models/:mid              | Creates a new process instance from a given model                      |
| GET  | /processes/:pid           | Retrieves the current state of a process instance                      |
| POST | /workitems/:wimid/:wiid   | Checks-in a work item (i.e. user task)                                 |
| POST | /workitems/:wimid/:evname | Forwards message event, delivered only if the event is enabled         |

From the caterpillar_core folder is possible to run the script

     node demo_running_example.js
     
to register, create an instance and get the address of a sample process provided in the file __demo_running_example.bpmn__. For running the sample process it is also requred to run first the application __services_manager__ and to register the external services.

## How to use Services Manager

Open a terminal in your computer and move into the folder __services_manager__. 

For installing the dependencies, run the comand 

     npm install

For running the application use the comand 

     gulp

By default the application will runs on http://localhost:3010.

The application provides a REST API to interact with services manager. The following table summarizes the mapping of resource-related actions:

| Verb | URI            | Description                                                            |
| -----| -------------- | ---------------------------------------------------------------------- |
| POST | /services      | Registers an external service                                          |
| GET  | /services      | Retrieves the list of registered external services                     |
| GET  | /services/:sid | Retrieves smart contract/address of an external service                |

## How to use Services Manager

Open a terminal in your computer and move into the folder __services_manager__. 

For installing the dependencies, run the comand 

     npm install

For running the application use the comand 

     ng serve
     
Open a web browser and put the URL http://localhost:4200/.

Add the following URl http://localhost:3000/processes/:paddr in the input, where :paddr is the address of the process instance in Ethereum. This address can be obtained in the terminal of __caterpillar_core__ when creating a new process instance. Then press the button __Open__. Here, you can see the enabled activities visualized in dark green. For executing any enabled activity, just click on it and fill the parameter info if required. All the execution of the process (including internal operations) can be traced from the terminals of __caterpillar_core__ and __services_manager__. 







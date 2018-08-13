# Caterpillar
BPMN execution engine on Ethereum

Caterpillar is a Business Process Management System (BPMS) that runs on top of Ethereum and that relies on the translation of process models into smart contracts. More specifically, Caterpillar accepts as input a process model specified in BPMN and generates a set of smart contracts that captures the underlying behavior. The smart contracts, written in Ethereum's Solidity language, can then be compiled and deployed to the public or any other private Ethereum network using standard tools. Moreover, Caterpillar exhibits a REST API that can be used to interact with running instances of the deployed process models.

Caterpillar also provides a set of modelling tools and an execution panel which interact with the underlying execution engine via the aforementioned REST API. The latter can also be used by third party software to interact in a programmatic way via Caterpillar with the instances of business process running on the blockchain.

The prototype has two versions. We are currently developing the version v2.0, which follows a different approach from v1.0. However, we kept the source code of v1.0 as a reference, although we are not currently working on such an implementation.

The approach implemented by the v2.0 can be accessed from: https://arxiv.org/pdf/1808.03517v1.pdf

Additionally, a demo paper about v1.0: can be accessed from: http://ceur-ws.org/Vol-1920/BPM_2017_paper_199.pdf

Caterpillar’s code distribution in this repository contains three different folders in v1.0 and two in v2.0. The folder __caterpillar_core__ includes the implementation of the core components, __execution_panel__ consists of the code of a BPMN visualizer that serves to keep track of the execution state of process instances and to lets users check in process data. The __services_manager__ folder contains the implementation for an external service which is used only in v1.0 for demonstration purposes.

For running Caterpillar locally, download the source code from the repository and follow the next steps to set up the applications and install the required dependencies. For running caterpillar from a Docker image go directly to the last section of this document. Be aware that the Docker image works only on the version v1.0.

## Installing Ganache CLI

By default, the core of Caterpillar was configured to run on top of Ganache CLI which is a Node.js based Ethereum client for testing and development. It uses ethereumjs to simulate full client behavior and make developing Ethereum applications. All the instructions about the installation can be found here: https://github.com/trufflesuite/ganache-cli/. However, the Ethereum Provider can be updated at the beginning of the source code in the controller "caterpillar-core/src/models/models.controller.ts" (check the comments).

Note that Ganache CLI is written in Javascript and distributed as a Node package via npm. Make sure you have Node.js (>= v6.11.5) installed. Besides, be aware to start the Ganache CLI server before running the applications Caterpillar Core and Services Manager. In that respect, you only need to open a terminal on your computer and run the command:

     ganache-cli

## How to use Caterpillar Core

> Before running Caterpillar Core, make sure you installed gulp-cli running the command: npm __install gulp-cli -g__. All the instructions about the glup-cli installation can be found here: https://www.npmjs.com/package/gulp-cli?activeTab=readme

> Additionally, the version v2.0 uses a process repository to store and access metadata produced by Caterpillar when compiling the BPMN model into Solidity smart contracts. Currently, this repository was implemented on top of MongoDB which is a database that stores data as JSON-like documents. The instructions to install MongoDB Community Edition can be accessed from here: https://docs.mongodb.com/manual/administration/install-community/

To set up and run the core, open a terminal in your computer and move into the folder __caterpillar_core__.

For installing the dependencies, run the commands

     npm install
     gulp build

For running the application you may use one of the following commands

     node ./out/www.js
     gulp

By default the application runs on http://localhost:3000.

> Make sure you have Ganache Cli running in your computer before starting the core. Besides, if you are using the version v2.0 a MongoDB client must be also running.

The application provides a REST API to interact with the core of Caterpillar. The following table summarizes the mapping of resource-related actions:

| Verb | URI                       | Description                                                            |
| -----| ------------------------- | ---------------------------------------------------------------------- |
| POST | /models                   | Registers a BPMN model (Triggers also code generation and compilation) |
| GET  | /models                   | Retrieves the list of registered BPMN models                           |
| GET  | /models/:mid              | Retrieves a BPMN model and its compilation artifacts                   |
| POST | /models/:mid              | Creates a new process instance from a given model                      |
| GET  | /processes/               | Retrieves the list of active process instances                         |
| GET  | /processes/:pid           | Retrieves the current state of a process instance                      |
| POST | /workitems/:wimid/:wiid   | Checks-in a work item (i.e. user task)                                 |
| POST | /workitems/:wimid/:evname | Forwards message event, delivered only if the event is enabled         | 

> (ONLY FOR v1.0) If the process model has service tasks and consequently needs to interact with the services manager application, then you must run the services manager application and create the corresponding services before running Caterpillar core.

From the caterpillar_core folder, it is possible to run the script:

     node demo_running_example_test.js

Which is provided only for the version v1.0, to register, create an instance and get the address of a sample process provided in the file __demo_running_example.bpmn__. For running the sample process, it is also required to run first the application __services_manager__ and to register the external services.

## How to use Services Manager (ONLY FOR v1.0)

Open a terminal in your computer and move into the folder __services_manager__. 

For installing the dependencies, run the comand 

     npm install
     gulp build

For running the application use the comand 

     node ./out/www.js

By default the application will runs on http://localhost:3010.

The application provides a REST API to interact with services manager. The following table summarizes the mapping of resource-related actions:

| Verb | URI            | Description                                                            |
| -----| -------------- | ---------------------------------------------------------------------- |
| POST | /services      | Registers an external service                                          |
| GET  | /services      | Retrieves the list of registered external services                     |
| GET  | /services/:sid | Retrieves smart contract/address of an external service                |

From the __services_manager__ folder is possible to run the script

     node oracle_creation.js

to register the services required by the running example provided in the core.

## How to use Execution Panel

> Before running the Execution Panel, make sure you installed angular-cli: https://github.com/angular/angular-cli/wiki

To set up and run the execution panel, open a terminal in your computer and move into the folder __execution-panel__.

For installing the dependencies, run the comand

     npm install

For running the application use the comand

     ng serve

Open a web browser and put the URL http://localhost:4200/.

You must use the button refresh to update the instances running, and then select one of the URLs obtained that will contain the address when it is running the smart contract. Then press the button __Open__. Here, you can see the enabled activities visualized in dark green. For executing any enabled activity, just click on it and fill the parameter info if required. All the execution of the process (including internal operations) can be traced from the terminal of __caterpillar_core__.


## Running Caterpillar from a Docker Image (ONLY FOR v1.0)

It is also possible to execute Caterpillar from a Docked Image without needing to install all the dependencies required to run the applications locally. For that, it is necessary only to install Docker (https://www.docker.com/) on your computer, then open a terminal and run the comand:

     docker run --rm -it -p 3200:3200 -p 3000:3000 -p 8090:8090 orlenyslp/caterpillar-demo:v1

Initially, you will see in the terminal, the creation of two services that are necesary for running the running example provided in https://github.com/orlenyslp/Caterpillar/blob/master/caterpillar-core/demo_running_example.bpmn. When the terminal displays the message "Listening on port 3000", it means that the core is running and then open a web browser to interact with execution panel that will be running in the URL http://localhost:3200/.

The execution panel provides a simple interface to interact with the core. The following options are available:

 + Creating and uploading bpmn models by clicking the button with the corresponding name. From the modeler, when you press save, the request is sent to the core. The information about the creation, compilation, and deploy of the smart contracts will be displayed in the terminal where the Docker container is running. If the model was successfully compiled, then a link to display its information will appear on the dashboard with the format <model_identifier>:<model_name>.
 
 > After upload the running example, it is necessary to go to the documentation section for both service tasks and to replace the strings labeled as $Assess_Loan_Risk_Address and $Appraise Property_Address with the corresponding addresses where the services are running. These addresses were displayed in the terminal when the Docker container starts running.
 
+ Searching and displaying all the process model created in the current running of the container. The search will retrieve every model whose name or identifier contains the input as a substring. Empty searches will generate all the models created until now.
 
 + Displaying the solidity code generated from the process model and create new instances. From the dashboard, click the link to display the information of the desired process model. Here, there are accessible the solidity code and the active instances. There are also provided two buttons that allow the creation and updating of running instances. The button labeled with "Refresh instances" will remove from the list all the addresses to processes instances whose execution was concluded.
 
 + Executing process instances. By clicking on the address of the desired instance, it will be displayed a viewer that allows the visualization of the active tasks (in dark green) that can be executed by clicking on them. The viewer also allows switching to each active instance of the process. Every time a new instance is selected, the button labeled with "Go" must be pressed to display the current status of the instance.
 
All the results of the queries performed by the execution panel to the caterpillar core through the REST API will appear also in the terminal where the docker container is running.  
 

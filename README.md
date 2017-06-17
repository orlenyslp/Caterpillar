# Caterpillar
BPMN execution engine on Ethereum

Caterpillar, a Business Process Management System (BPMS) that runs on top of Ethereum and that relies on the translation of process models into smart contracts. More specifically, Caterpillar accepts as input a process model specified in BPMN and generates a set of smart contracts that captures the underlying behavior. The smart contracts, written in Ethereum's Solidity language, can then be compiled and deployed to the public or any other private Ethereum network using standard tools. Moreover, Caterpillar exhibits a REST API that can be used to interact with running instances of the deployed process models.

Caterpillar also provides a set of modelling tools and an execution panel which interact with the underlying execution engine via the aforementioned REST API. The latter can also be used by third party software to interact in a programmatic way via Caterpillar with the instances of business process running on the blockchain.

Caterpillar’s code distribution in this repository contains three different folders. 
The folder caterpillar_core includes the implementation of the core components, execution_panel includes the code of a BPMN visualizer that serves to keep track of the execution state of process instances and lets users check in process data, and services_manager contains the implementation for an external service used for demonstration purposes.

Before using the Caterpillar it is necessary to download the source code of the applications.

#How to use Caterpillar Core

Open a terminal in your computer and move to the folder caterpillar_core. 

For installing the dependencies, run the comand npm instsall.

For running the application use the comand gulp.

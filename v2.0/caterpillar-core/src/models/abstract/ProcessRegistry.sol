pragma solidity ^0.4.18;

import "AbstractFactory";

contract ProcessRegistry {

    mapping (bytes32 => mapping (uint => bytes32)) private parent2ChildrenBundleId;
    mapping (bytes32 => address) private factories;

    mapping (address => bytes32) private instance2Bundle;
    address[] private instances;

    mapping (address => bytes32) private worklist2Bundle;
    address[] private worklists;

    event NewInstanceCreatedFor(address parent, address processAddress);

    function registerFactory(bytes32 bundleId, address factory) public {
        require(factories[bundleId] == address(0));
        factories[bundleId] = factory;
    }

    function registerWorklist(bytes32 bundleId, address worklist) public {
        worklist2Bundle[worklist] = bundleId;
        worklists.push(worklist);
    }

    function addChildBundleId(bytes32 parentBundleId, bytes32 processBundleId, uint nodeIndex) public {
        parent2ChildrenBundleId[parentBundleId][nodeIndex] = processBundleId;
    }

    function allInstances() public returns(address[]) {
        return instances;
    }

    function newInstanceFor(uint nodeIndex, address parent) public returns(address) {
        bytes32 parentBundleId = instance2Bundle[parent];
        bytes32 bundleId = parent2ChildrenBundleId[parentBundleId][nodeIndex];
        return newBundleInstanceFor(bundleId, parent);
    }

    function newBundleInstanceFor(bytes32 bundleId, address parent) public returns(address) {
        require(factories[bundleId] != address(0));
        var processAddress = AbstractFactory(factories[bundleId]).newInstance(parent, this);
        instance2Bundle[processAddress] = bundleId;
        instances.push(processAddress);
        AbstractFactory(factories[bundleId]).startInstanceExecution(processAddress);
        NewInstanceCreatedFor(parent, processAddress);
        return processAddress;
    }

    function bundleFor(address processInstance) public returns(bytes32) {
        return instance2Bundle[processInstance];
    }

    function worklistBundleFor(address worklist) public returns(bytes32) {
        return worklist2Bundle[worklist];
    }
}

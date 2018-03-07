pragma solidity ^0.4.18;

import "AbstractWorklistFactory";

contract GlobalWorklistFactory {
    mapping (bytes32 => address) public wlFactories;
    event NewWorklistCreatedFor(address worklist);

    function registerWorklistFactory(bytes32 processId, address wlFactory) public {
        require(wlFactories[processId] == address(0));
        wlFactories[processId] = wlFactory;
    }

    function newWorklistFor(bytes32 processId) public returns(address) {
        address worklist = AbstractWorklistFactory(wlFactories[processId]).newWorklist();
        NewWorklistCreatedFor(worklist);
        return worklist;
    }
}

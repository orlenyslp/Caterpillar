pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IRFunct {
    function findRuntimePolicy(address pCase) public virtual view returns(address);
    function canPerform(address actor, address pCase, uint taskIndex) public virtual view returns(bool);
}

contract IWorklist {

    struct Workitem {
        uint elementIndex;
        address processInstanceAddr;
    }

    Workitem[] internal workitems;
    address internal runtimeRegistry;

    function updateRuntimeRegistry(address _runtimeRegistry) public {
        runtimeRegistry = _runtimeRegistry;
    }

    function workItemsFor(uint elementIndex, address processInstance) external view returns(uint) {
        uint reqIndex = 0;
        for (uint i = 0; i < workitems.length; i++) {
            if (workitems[i].elementIndex == elementIndex && workitems[i].processInstanceAddr == processInstance)
                reqIndex |= uint(1) << i;
        }
        return reqIndex;
    }

    function processInstanceFor(uint workitemId) public view returns(address) {
        require(workitemId < workitems.length);
        return workitems[workitemId].processInstanceAddr;
    }

    function elementIndexFor(uint workitemId) public view returns(uint) {
        require(workitemId < workitems.length);
        return workitems[workitemId].elementIndex;
    }

    function canPerform(address actor, address pCase, uint elementIndex) internal view returns(bool) {
        return IRFunct(IRFunct(runtimeRegistry).findRuntimePolicy(pCase)).canPerform(actor, pCase, elementIndex);
    }
}
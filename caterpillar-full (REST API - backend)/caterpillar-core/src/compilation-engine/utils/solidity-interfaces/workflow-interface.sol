pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IWorkflow {
    address internal parent;
    address internal worklist;
    uint internal instanceIndex;
    address internal processRegistry;

    constructor(address _parent, address _worklist, address _processRegistry) public {
        parent = _parent;
        worklist = _worklist;
        processRegistry = _processRegistry;
    }

    function setInstanceIndex(uint _instanceIndex) public {
        require(msg.sender == parent);
        instanceIndex = _instanceIndex;
    }

    function findParent() public view returns(address) {
        return parent;
    }

    function handleEvent(bytes32 code, bytes32 eventType, uint _instanceIndex, bool isInstanceCompleted) public virtual;
    function killProcess() public virtual;
    function startExecution() public virtual;
    function broadcastSignal() public virtual;

    function killProcess(uint processElementIndex, uint marking, uint startedActivities) internal virtual returns(uint, uint);
    function broadcastSignal(uint tmpMarking, uint tmpStartedActivities, uint sourceChild) internal virtual returns(uint, uint);

    function propagateEvent(bytes32 code, bytes32 eventType, uint tmpMarking, uint tmpStartedActivities, uint sourceChild) internal returns(uint, uint) {
        if (eventType == "Error" || eventType == "Terminate")
            (tmpMarking, tmpStartedActivities) = killProcess(0, tmpMarking, tmpStartedActivities);
        else if (eventType == "Signal")
            (tmpMarking, tmpStartedActivities) = broadcastSignal(tmpMarking, tmpStartedActivities, sourceChild);
        if (parent != address(0))
            IWorkflow(parent).handleEvent(code, eventType, instanceIndex, tmpMarking | tmpStartedActivities == 0);
        return (tmpMarking, tmpStartedActivities);
    }
}

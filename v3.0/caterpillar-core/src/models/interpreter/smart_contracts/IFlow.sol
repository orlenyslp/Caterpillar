pragma solidity ^0.4.25;

contract IFlow {

    function getPreCond(uint eInd) public view returns(uint);
    function getPostCond(uint eInd) public view returns(uint);
    function getTypeInfo(uint eInd) public view returns(uint);
    function getAdyElements(uint eInd) public view returns(uint[] memory);
    function getEventCode(uint eInd) public view returns(bytes32);
    function getAttachedTo(uint eInd) public view returns(uint);
    
    function getElementInfo(uint eInd) public view returns(uint, uint, uint, uint[] memory);
    function getFirstElement() public view returns(uint);
    
    function getEventList() public view returns(uint[] memory);
    function getSubProcList() public view returns(uint[] memory);
    function getSubProcInst(uint eInd) public view returns(address);
    function getFactoryInst() public view returns(address);
    function setFactoryInst(address _factory) public;
    function getInstanceCount(uint eInd) public view returns(uint);

    function getInterpreterInst() public view returns(address);
    function setInterpreterInst(address _interpreter) public;
    
    function setElement(uint eInd, uint preC, uint postC, uint typeInfo, bytes32 eCode, uint[] memory _nextElem) public;
    function linkSubProcess(uint pInd, address cFlowInst, uint[] memory attachedEvt, uint countInstances) public;
    
}

/// @title Control Flow Data Structure 
/// @dev Tree mirroring the process hierarchy derived from a process model. 
/// @dev This contract must be deployed/instantiated once per process model.
contract IFlowImpl {
    
    uint private startEvt;
    address private factory;
    address private interpreter;
    
    // elemIndex => [preC, postC, type]
    mapping(uint => uint[3]) private condTable;
    
    // Element Index => List of elements that can be enabled with the completion of the key element
    mapping(uint => uint[]) private nextElem;
    
    // List of Indexes of the subprocesses
    uint[] private subProcesses;
    
    // List of Event Indexes defined in the current Subprocess
    uint[] private events;
    
    // Event Index => Index of the element where event is attachedTo
    mapping(uint => uint) private attachedTo;
    
    // Event Index => String representing the code to identify the event (for catching)
    mapping(uint => bytes32) private eventCode;
    
    // Subprocess Index => Child Subproces address
    mapping(uint => address) private pReferences;
    
    // Subprocess Index => number of instances
    mapping(uint => uint) private instanceCount;

    
    function getPreCond(uint eInd) public view returns(uint) {
        return condTable[eInd][0];
    }
    
    function getPostCond(uint eInd) public view returns(uint) {
        return condTable[eInd][1];
    }
    
    function getTypeInfo(uint eInd) public view returns(uint) {
        return condTable[eInd][2];
    }
    
    function getFirstElement() public view returns(uint) {
        return startEvt;
    }
    
    function getAdyElements(uint eInd) public view returns(uint[] memory) {
        return nextElem[eInd];
    }
    
    function getElementInfo(uint eInd) public view returns(uint, uint, uint, uint[] memory) {
        return (condTable[eInd][0], condTable[eInd][1], condTable[eInd][2], nextElem[eInd]);
    }
    
    function getSubProcList() public view returns(uint[] memory) {
        return subProcesses;
    }
    
    function getInstanceCount(uint eInd) public view returns(uint) {
        return instanceCount[eInd];
    }
    
    function getEventCode(uint eInd) public view returns(bytes32) {
        return eventCode[eInd];
    }
    
    function getEventList() public view returns(uint[] memory) {
        return events;
    }
    
    function getAttachedTo(uint eInd) public view returns(uint) {
        return attachedTo[eInd];
    }
    
    function getSubProcInst(uint eInd) public view returns(address) {
        return pReferences[eInd];
    }
    
    function getFactoryInst() public view returns(address) {
        return factory;
    }
    
    function setFactoryInst(address _factory) public {
        factory = _factory;
    }

    function getInterpreterInst() public view returns(address) {
        return interpreter;
    }
    
    function setInterpreterInst(address _interpreter) public {
        interpreter = _interpreter;
    }
    
    function setElement(uint eInd, uint preC, uint postC, uint typeInfo, bytes32 eCode, uint[] memory _nextElem) public {
        uint _typeInfo = condTable[eInd][2];
        if (_typeInfo == 0) {
            if (typeInfo & 4 == 4) {
                events.push(eInd);
                if (typeInfo & 36 == 36)
                    startEvt = eInd;
                eventCode[eInd] = eCode;
            } else if (typeInfo & 33 == 33)
                subProcesses.push(eInd);
        } else
            require (_typeInfo == typeInfo);
        condTable[eInd] = [preC, postC, typeInfo];
        nextElem[eInd] = _nextElem;

    }
    
    function linkSubProcess(uint pInd, address cFlowInst, uint[] memory attachedEvt, uint countInstances) public {
        require(condTable[pInd][2] & 33 == 33);  // BITs (0, 5) Veryfing the subprocess to link is already in the data structure
        pReferences[pInd] = cFlowInst;
        for(uint i = 0; i < attachedEvt.length; i++) 
            if(condTable[attachedEvt[i]][2] & 4 == 4)
                attachedTo[attachedEvt[i]] = pInd;
        instanceCount[pInd] = countInstances;
    } 
}
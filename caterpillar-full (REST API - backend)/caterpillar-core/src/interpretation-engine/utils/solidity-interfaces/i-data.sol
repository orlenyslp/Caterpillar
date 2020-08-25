pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IData {
    function setActivityMarking(uint nMarking) public virtual;
    function setMarking(uint nMarking) public virtual;
    function setParent(address parent, address cFlow, uint eInd) public virtual;
    function addChild(uint eInd, address child) public virtual;
    function getMarking() public virtual view returns(uint);
    function getStartedActivities() public virtual view returns(uint);
    function getInstanceCount(uint eInd) public virtual view returns(uint);
    function decreaseInstanceCount(uint eInd) public virtual returns(uint);
    function setInstanceCount(uint eInd, uint instC) public virtual;
    function getIndexInParent() public virtual view returns(uint);
    function executeScript(uint eInd) public virtual returns(uint);
    function getChildProcInst(uint eInd) public virtual view returns(address[] memory);
    function getCFlowInst() public virtual view returns(address);
    function getParent() public virtual view returns(address);
    function continueExecution(uint eInd) public virtual;
}

abstract contract IInterpreter {
    function getInterpreterInst() public virtual view returns(address);
    function executeElements(address pCase, uint eInd) public virtual;
}

contract IDataImp {
    
    uint private tokensOnEdges;
    uint private startedActivities;
    
    address private iDataParent;
    address private iFlowNode;
    uint private indexInParent;
    
    mapping(uint => address[]) private children;
    mapping(uint => uint) private instCount;
    
    function setActivityMarking(uint nMarking) public {
        startedActivities = nMarking;
    }
        
    function setMarking(uint nMarking) public {
        tokensOnEdges = nMarking;
    }
    
    function setParent(address parent, address cFlow, uint eInd) public {
        indexInParent = eInd;
        iDataParent = parent;
        iFlowNode = cFlow;
    }
   
    function addChild(uint eInd, address child) public {
        children[eInd].push(child);
        instCount[eInd]++;
    }
    
    function getMarking() public view returns(uint) {
        return tokensOnEdges;
    }
    
    function getStartedActivities() public view returns(uint) {
        return startedActivities;
    }
    
    function getInstanceCount(uint eInd) public view returns(uint) {
        return instCount[eInd];
    }
    
    function decreaseInstanceCount(uint eInd) public returns(uint) {
        instCount[eInd]--;
    }
    
    function setInstanceCount(uint eInd, uint instC) public {
        instCount[eInd] = instC;
    }
    
    function getIndexInParent() public view returns(uint) {
        return indexInParent;
    }
    
    function getChildProcInst(uint eInd) public view returns(address[] memory) {
        return children[eInd];
    }
    
    function getCFlowInst() public view returns(address) {
        return iFlowNode;
    }
    
    function getParent() public view returns(address) {
        return iDataParent;
    }

    function continueExecution(uint eInd) public {
        address interpreter = IInterpreter(iFlowNode).getInterpreterInst();
        IInterpreter(interpreter).executeElements(address(this), eInd);
    }
}


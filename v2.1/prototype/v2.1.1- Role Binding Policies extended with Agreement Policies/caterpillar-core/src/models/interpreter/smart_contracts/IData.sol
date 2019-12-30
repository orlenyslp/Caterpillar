pragma solidity ^0.4.25;

contract IData {
    
    function setActivityMarking(uint nMarking) public;
    function setMarking(uint nMarking) public;
    function setParent(address parent, address cFlow, uint eInd) public;
    function addChild(uint eInd, address child) public;
    function getMarking() public view returns(uint);
    function getStartedActivities() public view returns(uint);
    function getInstanceCount(uint eInd) public view returns(uint);
    function decreaseInstanceCount(uint eInd) public returns(uint);
    function setInstanceCount(uint eInd, uint instC) public;
    function getIndexInParent() public view returns(uint);
    function executeScript(uint eInd) public returns(uint);
    function getChildProcInst(uint eInd) public view returns(address[] memory);
    function getCFlowInst() public view returns(address);
    function getParent() public view returns(address);
    function continueExecution(uint eInd) public;
}

contract IInterpreter {
    function getInterpreterInst() public view returns(address);
    function executeElements(address pCase, uint eInd) public;
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


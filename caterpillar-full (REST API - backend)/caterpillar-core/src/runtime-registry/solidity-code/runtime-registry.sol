pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IFunct {
    // WorkList functions
    function updateRuntimeRegistry(address _runtimeRegistry) public virtual;
    // Factory Functions
    function setWorklist(address _worklist) public virtual;
    function startInstanceExecution(address processAddress) public virtual;
    function newInstance(address parent, address globalFactory) public virtual returns(address);
    function findParent() public virtual view returns(address);
    function resumeInstance(uint elementIndex, uint decission) public virtual;
    function registerAgreement(address agreementAddr, address accessControlAdr) public virtual;
    function linkPolicyToAccessControl(address pCase, address _registry, address _policy, address _taskRoleAdr) public virtual;   
    function createInstance(address cFlow) public virtual returns(address);
}

contract RuntimeRegistry {

    mapping (bytes32 => mapping (uint => bytes32)) private parent2ChildrenBundleId;
    mapping (bytes32 => address) private factories;
    mapping (address => bytes32) private iFlow;
    
    mapping (bytes32 => bytes32) private policy;
    mapping (bytes32 => bytes32) private taskRole;

    mapping (address => bytes32) private instance2Bundle;
    mapping (address => address) private iData2IFlow;
    mapping (address => address) private instance2PolicyOp;
    mapping (address => address) private agreement2Policy;
    
    address[] private instancesCE;
    
    bytes32[] private repoIdsCE;
    bytes32[] private repoIdsIE;
    

    mapping (address => bytes32) private worklist2Bundle;

    event NewInstanceCreatedFor(address parent, address processAddress);
    
    function registerIFlow(bytes32 bundleId, address iFlowAddr) external {
        iFlow[iFlowAddr] = bundleId;
        repoIdsIE.push(bundleId);
    }

    function registerIData2IflowRelation(address iDataAddr, address iFlowAddr, address policyOpAddr) public {
        iData2IFlow[iDataAddr] = iFlowAddr;
        instance2PolicyOp[iDataAddr] = policyOpAddr;
    }

    function getIFlowFromIData(address iDataAddr) external view returns(address) {
        return iData2IFlow[iDataAddr];
    }

    function getBundleIdFromIFlow (address iFlowAddr) external view returns(bytes32) {
        return iFlow[iFlowAddr];
    }
    
    function registerFactory(bytes32 bundleId, address factory) external {
        factories[bundleId] = factory;
        repoIdsCE.push(bundleId);
    }

    function registerWorklist(bytes32 bundleId, address worklist) external {
        address factory = factories[bundleId];
        require(factory != address(0));
        worklist2Bundle[worklist] = bundleId;
        IFunct(factory).setWorklist(worklist);
        IFunct(worklist).updateRuntimeRegistry(address(this));
    }

    function findRuntimePolicy(address pCase) public view returns(address) {
        return instance2PolicyOp[pCase];
    }

    function relateProcessToPolicy(bytes32 bundleId, bytes32 _policy, bytes32 _taskRole) external {
        taskRole[bundleId] = _taskRole;
        policy[bundleId] = _policy;
    }
    
    function registerAgreement(address agreementAddr, address accessControlAdr) public {
        agreement2Policy[agreementAddr] = accessControlAdr;
    }

    function addChildBundleId(bytes32 parentBundleId, bytes32 processBundleId, uint nodeIndex) external {
        parent2ChildrenBundleId[parentBundleId][nodeIndex] = processBundleId;
    }

    function newInstanceFor(uint nodeIndex, address parent) public returns(address) {
        address procAddres = newBundleInstanceFor(parent2ChildrenBundleId[instance2Bundle[parent]][nodeIndex], parent);
        if(instance2PolicyOp[parent] != address(0))
            instance2PolicyOp[procAddres] = instance2PolicyOp[parent];  
    }

    function newBundleInstanceFor(bytes32 bundleId, address parent) public returns(address) {
        address factory = factories[bundleId];
        require(factory != address(0));
        address processAddress = IFunct(factory).newInstance(parent, address(this));
        instance2Bundle[processAddress] = bundleId;
        instancesCE.push(processAddress);
        IFunct(factory).startInstanceExecution(processAddress);
        emit NewInstanceCreatedFor(parent, processAddress);
        return processAddress;
    }

    function newRestrictedCInstanceFor(bytes32 bundleId, address parent, address accessCtrl, address rbPolicy, address trMap) public returns(address) {
        address pCase = newBundleInstanceFor(bundleId, parent);  
        if(accessCtrl != address(0)) {
            instance2PolicyOp[pCase] = accessCtrl;
            IFunct(accessCtrl).linkPolicyToAccessControl(pCase, address(this), rbPolicy, trMap);
        }    
        return pCase;
    }

    function newRestrictedIInstanceFor(address iFlowAdr, address interpreter, address accessCtrl, address rbPolicy, address trMap) public returns(address) { 
        address pCase = IFunct(interpreter).createInstance(iFlowAdr); 
        registerIData2IflowRelation(pCase, iFlowAdr, accessCtrl);
        if(accessCtrl != address(0))       
            IFunct(accessCtrl).linkPolicyToAccessControl(pCase, address(this), rbPolicy, trMap);
        return pCase;
    }

    function hasFactory(uint nodeIndex, address parent) public view returns(bool) {
        return factories[parent2ChildrenBundleId[instance2Bundle[parent]][nodeIndex]] != address(0);
    }

    function resumeInstanceFor(address processInstance, uint elementIndex, uint decission) public {
        require(agreement2Policy[msg.sender] != address(0));
        IFunct(processInstance).resumeInstance(elementIndex, 1 << decission);
    }
    
    function allRegisteredModels() external view returns(bytes32[] memory) {
        return repoIdsCE;
    }
    
    function allRegisteredIFlows() external view returns(bytes32[] memory) {
        return repoIdsIE;
    }

    function allInstances() external view returns(address[] memory) {
        return instancesCE;
    }
    
    function bindingPolicyFor(address procInstance) external view returns(bytes32) {
        bytes32 pId = instance2Bundle[procInstance];
        address pAddr = procInstance;
        while(policy[pId].length != 0) {
            pAddr = IFunct(pAddr).findParent();
            if(pAddr == address(0))
                break;
            pId = instance2Bundle[pAddr];
        }
        return policy[pId];
    }

    function taskRoleMapFor(address procInstance) external view returns(bytes32) {
        bytes32 pId = instance2Bundle[procInstance];
        address pAddr = procInstance;
        while(taskRole[pId].length != 0) {
            pAddr = IFunct(pAddr).findParent();
            if(pAddr == address(0))
                break;
            pId = instance2Bundle[pAddr];
        }
        return taskRole[pId];
    }

    function bindingPolicyFromId(bytes32 procId) external view returns(bytes32) {
        return policy[procId];
    }

    function taskRoleMapFromId(bytes32 procId) external view returns(bytes32) {
        return taskRole[procId];
    }

    function bundleFor(address processInstance) external view returns(bytes32) {
        return instance2Bundle[processInstance];
    }

    function childrenFor(bytes32 parent, uint nodeInd) external view returns(bytes32) {
        return parent2ChildrenBundleId[parent][nodeInd];
    }

    function worklistBundleFor(address worklist) external view returns(bytes32) {
        return worklist2Bundle[worklist];
    }
}
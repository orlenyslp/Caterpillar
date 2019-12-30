pragma solidity ^0.4.25;

contract IUtils {
    // Runtime Registry functions
    function registerFactory(bytes32 bundleId, address pFactory) public;
    function resumeInstanceFor(address processInstance, uint elementIndex, uint decission) public;
    function registerAgreement(address agreementAddr, address accessControlAdr) public;
    
    // AccessControl functions
    function findRole(address actor, uint rActor, address pCase) public view returns(bool);
    function linkRoleToTask(address pCase, uint roleInd, uint taskInd) public;
    
    // Agreement Policies functions
    function canPropose (uint rProposer, uint opInd, uint eInd) public pure returns(uint);
    function requirePEndorsement(uint reqId) public pure returns(bool);
    function assertPEndorsement(uint reqId, uint rEndorser, uint endorsedBy, uint rejectedBy, uint rAgreed, uint rNAgreed, bool isAccepted) public pure returns(uint);
}

contract DynamicProcessManager {
    
    address private accessControlAdr;
    address private agreementPolicyAdr;
    address private registryAdr;
    
    struct RequestInfo {
        uint reqId;
        uint inInd;
        
        uint endorsedBy;
        uint rejectedBy;
        uint rAgreed;
        uint rNAgreed;
        
        // 0- UNGRANTED, 1 REQUESTED, 2 GRANTED
        uint requestState;
    }
    
    bytes32[] private procPIDs;
    address[] private procFactories;
    uint[] private uintInputs;
    
   
    // (pCase => opInd => eInd)
    // cases(opInd) = 1- link-process, 2- link-role, 3- choose-path
    mapping(address => mapping(address => mapping(uint => mapping(uint => RequestInfo)))) private requestInfo;
    
    
    constructor(address _accessControlAdr, address _agreementPolicyAdr, address _registryAdr) public {
        accessControlAdr = _accessControlAdr;
        agreementPolicyAdr = _agreementPolicyAdr;
        registryAdr = _registryAdr;
        IUtils(registryAdr).registerAgreement(this, _accessControlAdr);
    }
   
    function findState(address actor, address pCase, uint opInd, uint eInd) public view returns(uint) {
       return requestInfo[actor][pCase][opInd][eInd].requestState;
    }
    
    // opInd: 1- link-process
    function requestAction(uint rProposer, address pCase, uint opInd, uint eInd, bytes32 bundleId, address factoryAdr) public {
        (uint reqId, uint state) = assertRequest(rProposer, msg.sender, pCase, opInd, eInd);
        requestInfo[msg.sender][pCase][opInd][eInd] = RequestInfo(reqId, procPIDs.length, 0, 0, 0, 0, state);
        procPIDs.push(bundleId);
        procFactories.push(factoryAdr);
    }
   
    // opInd: 2- link-role, 3- choose-path
    function requestAction(uint rProposer, address pCase, uint opInd, uint eInd, uint dataIn) public {
        (uint reqId, uint state) = assertRequest(rProposer, msg.sender, pCase, opInd, eInd);
        requestInfo[msg.sender][pCase][opInd][eInd] = RequestInfo(reqId, uintInputs.length, 0, 0, 0, 0, state);
        uintInputs.push(dataIn);
    }
    
    function voteRequest(uint rEndorser, address aProposer, address pCase, uint opInd, uint eInd, bool isAccepted) public {
        RequestInfo memory request = requestInfo[aProposer][pCase][opInd][eInd];
        
        // The endorser must be BOUND to a role, and a request must exist for the given process case.
        // The request must be in REQUESTED state
        require(IUtils(accessControlAdr).findRole(msg.sender, rEndorser, pCase) && request.requestState == 1);
        
        // This function is responsible to evaluate the endorsment.
        // An exception reverting the transaction is thwown in case of any invalid operation (e.g wrong endorser).
        // Thus, this function only returns if the endorsement is performed.
        uint vState = IUtils(agreementPolicyAdr).assertPEndorsement(request.reqId, rEndorser, request.endorsedBy, request.rejectedBy, request.rAgreed, request.rNAgreed, isAccepted);
        
        // The storage is only updated if the endorsement is valid and thus performed.
        requestInfo[aProposer][pCase][opInd][eInd].requestState = vState;
        if (isAccepted) {
            requestInfo[aProposer][pCase][opInd][eInd].endorsedBy |= (uint(1) << rEndorser);
            requestInfo[aProposer][pCase][opInd][eInd].rAgreed++;
        }
        else {
            requestInfo[aProposer][pCase][opInd][eInd].rejectedBy |= (uint(1) << rEndorser);
            requestInfo[aProposer][pCase][opInd][eInd].rNAgreed++;
        }
    }
   
    function executeRequest(address pCase, uint opInd, uint eInd) public {
        RequestInfo memory request = requestInfo[msg.sender][pCase][opInd][eInd];
        
        // The actor performing the action is the one who made the request
        // The request for the action is in GRANTED state
        require(request.requestState == 2);
        
        if(opInd == 2)
            IUtils(accessControlAdr).linkRoleToTask(pCase, uintInputs[request.inInd], eInd);
        else {
            if(opInd == 2) {
                IUtils(registryAdr).registerFactory(procPIDs[request.inInd], procFactories[request.inInd]);
                IUtils(registryAdr).resumeInstanceFor(pCase, eInd, 0);
            }
            else if(opInd == 3)
                IUtils(registryAdr).resumeInstanceFor(pCase, eInd, uintInputs[request.inInd]);
        }
        requestInfo[msg.sender][pCase][opInd][eInd].requestState = 0;
    }

    
    function assertRequest(uint rProposer, address aProposer, address pCase, uint opInd, uint eInd) private view returns(uint, uint) {
        // (1) The actor is BOUND to a role,
        // (2) The action is in not in the REQUESTED state, only one request can be managed at the time for a given action
        // (3) the role has the right to perform the operation.
        
        uint reqId = IUtils(agreementPolicyAdr).canPropose(rProposer, opInd, eInd);

        require(IUtils(accessControlAdr).findRole(aProposer, rProposer, pCase) &&
                requestInfo[aProposer][pCase][opInd][eInd].requestState == 0 &&
                reqId != 0);
               
        // Processing the request and updating the state as REQUESTED(2) or GRANTED(3) depending if the request require endorsement or not.
        return IUtils(agreementPolicyAdr).requirePEndorsement(reqId) ? (reqId, 1) : (reqId, 2);
    }
   
}
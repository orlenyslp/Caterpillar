pragma solidity ^0.4.25;

// Function assertVote will return 0 -> UNBOUND, 1 -> NOMINATED, 2 -> RELEASING, 3 -> BOUND
contract BindingPolicy {

    function isCaseCreator(uint roleIndex) public pure returns(bool);
    function canNominate (uint rNominator, uint rNominee) public pure returns(bool);
    function assertNConstraint (uint rNominator, uint rNominee, uint nomineeRoles) public pure returns(bool);
    function requireNEndorsement (uint rNominator, uint rNominee) public pure returns(bool);
    function assertNVote (uint rNominator, uint rNominee, uint rEndorser, uint endorsedBy, uint rejectedBy, bool isAccepted) public pure returns(uint);
    
    function canRelease (uint rNominator, uint rNominee) public pure returns(bool);
    function assertRConstraint (uint rNominator, uint rNominee, uint nomineeRoles) public pure returns(bool);
    function requireREndorsement (uint rNominator, uint rNominee) public pure returns(bool);
    function assertRVote (uint rNominator, uint rNominee, uint rEndorser, uint endorsedBy, uint rejectedBy, bool isAccepted) public pure returns(uint);
}

contract ControlFlow {
    function findParent() public view returns(address);
    function getRoleFromTask(uint taskIndex, bytes32 processId) public pure returns(uint);
    function bundleFor(address pCase) external view returns(bytes32);
} 


contract BindingAccessControl {
    
    address private policyAdr;
    address private taskRoleAdr;
    address private registry;
    
    struct BindingInfo {
        uint nominator;
        uint nominee;
        uint endorsedBy;
        uint rejectedBy;
        
        // 0- UNBOUND, 1- RELEASING, 2- NOMINATED, 3- BOUND
        uint bindingState;
    }
    
    mapping (address => uint) private actorIndex;
    uint private actorCount = 1;
    
    mapping (address => uint) private caseIndex;
    uint private caseCount = 1;
    
    // caseIndex => roleIndex => actorIndex
    mapping (uint => mapping (uint => BindingInfo)) private roleBindingState;
    
    // actorIndex => acceptedRoleIndexMask
    mapping (uint => uint) private actorRoles;
    
    constructor(address _registry, address _policy, address _taskRoleAdr) public {
        policyAdr = _policy;
        taskRoleAdr = _taskRoleAdr;
        registry = _registry;
    }

    function roleState (uint role, address pCase) public view returns(uint) {
        return roleBindingState[caseIndex[pCase]][role].bindingState;
    }

    function nominateCaseCreator (uint rNominee, address nominee, address pCase) public {

        require(actorCount == 1 && BindingPolicy(policyAdr).isCaseCreator(rNominee));
        
        uint creatorIndex = actorIndex[nominee] = actorCount++;
        uint pCaseIndex = caseIndex[pCase] = caseCount++;
        
        roleBindingState[pCaseIndex][rNominee] = BindingInfo(creatorIndex, creatorIndex, 0, 0, 3);
        actorRoles[creatorIndex] = uint(1) << rNominee;
        
    }
    
    function nominate (uint rNominator, uint rNominee, address nominator, address nominee, address pCase) public {

        // Verify that @processCase is a child in the process hierarchy where root is the process-case provided when nominated the process-creator.
        // This verification can be done via the RuntimeRegistry in order to keep the consistency between control-flow, worklist and binding-control.
        
        uint iNominee = actorIndex[nominee];
        uint iCase = caseIndex[pCase];
        uint nomineeMask = uint(1) << rNominee;
        uint iNominator = actorIndex[nominator];

        // no actor can be BOUND/NOMINATED in pCase, the noinee cannot hold the rNominee role
        // nominator actor must be binded to a role unless self-nomination is allowed
        // the role of the nominator is allowed to nominate in the binding policy.
        // the requested nomination fulfill the conditions defined in the policy by the instructions IN / NOT IN
        require(roleBindingState[iCase][rNominee].bindingState == 0 && actorRoles[iNominee] & nomineeMask == 0 &&
                (actorRoles[iNominator] & (uint(1) << rNominator) != 0 || (iNominator == 0 && rNominator == rNominee)) &&
                (BindingPolicy(policyAdr).canNominate(rNominator, rNominee)) &&
                (BindingPolicy(policyAdr).assertNConstraint(rNominator, rNominee, actorRoles[iNominee])));
        
        // At this point, all the conditions were fulfilled because otherwise an exception was thrown reverting the transaction. Thus the binding is allowed.
        
        // Verifying that all the indexes (for actors and process-cases) were already assigned to an index.
        if(iCase == 0)
            iCase = caseIndex[pCase] = caseCount++;
        if(iNominee == 0)
            iNominee = actorIndex[nominee] = actorCount++;
        if(iNominator == 0)
            iNominator = iNominee;
        
        // Binding the role and updating the state as NOMINATED(2) or BOUND(3) depending on the nomination require endorsement or not.
        uint state = BindingPolicy(policyAdr).requireNEndorsement(rNominator, rNominee) ? 2 : 3;
        
        roleBindingState[iCase][rNominee] = BindingInfo (iNominator, iNominee, 0, 0, state); 
        if(state == 3)
            actorRoles[iNominee] |= nomineeMask;
    }
    
    function voteN (uint rNominator, uint rNominee, uint rEndorser, address endorser, address pCase, bool isAccepted) public returns(uint) {
        //require(runtimeRegistry == msg.sender);
        
        uint iCase = caseIndex[pCase];
        BindingInfo memory roleVState = roleBindingState[iCase][rNominee];
        
        // A nomination to endorse must be in NOMINATED state
        // The endorser must be nominated before (state BOUND) unless the endorser is the nominee accepting the nomination.
        require(roleVState.bindingState == 2 && 
                (actorRoles[actorIndex[endorser]] & (uint(1) << rEndorser) != 0 || rEndorser == rNominee && roleVState.nominee == actorIndex[endorser]));
        
        // This function is responsible to evaluate the endorsment. 
        // An exception reverting the transaction is thwown in case of any invalid operation (e.g wrong endorser). 
        // Thus, this function only returns if the endorsement is performed. 
        uint state = BindingPolicy(policyAdr).assertNVote(rNominator, rNominee, rEndorser, roleVState.endorsedBy, roleVState.rejectedBy, isAccepted);
            
        // The storage is only updated if the endorsment is valid and thus performed.
        roleBindingState[iCase][rNominee].bindingState = state;
        updateVoteMask(iCase, rNominee, uint(1) << rEndorser, isAccepted);
        if (state == 0 || state == 3) {
            roleBindingState[iCase][rNominee].endorsedBy = roleBindingState[iCase][rNominee].rejectedBy = 0;
            if (state == 3) 
                actorRoles[roleVState.nominee] |= ((uint(1) << rNominee));
        }
        return state;
    }
    
    function release (uint rNominator, uint rNominee, address nominator, address pCase) public {
        //require(runtimeRegistry == msg.sender);
        
        uint iCase = caseIndex[pCase];
        
        BindingInfo memory roleRState = roleBindingState[iCase][rNominee];
        
        // The endorser and the processCase address must be nominated before.
        // Validating the rNomiator is allowed to release rNominee.
        // Validating the release is not restricted by a binding constraint.
        require(roleRState.bindingState == 3 && actorRoles[actorIndex[nominator]] & (uint(1) << rNominator) != 0 && 
                (BindingPolicy(policyAdr).canRelease(rNominator, rNominee)) && 
                (BindingPolicy(policyAdr).assertRConstraint(rNominator, rNominee, actorRoles[roleRState.nominee])));
        
        // Unbinding the role and updating the state as UNBINDING or UNBINDED depending on the dismisses require endorsement or not.
        if(!BindingPolicy(policyAdr).requireREndorsement(rNominator, rNominee)) {
            roleBindingState[iCase][rNominee].bindingState = 0;
            actorRoles[roleRState.nominee] &= ~(uint(1) << rNominee);
        }
        else
           roleBindingState[iCase][rNominee].bindingState = 1;
    }
    
    function voteR (uint rNominator, uint rNominee, uint rEndorser, address endorser, address pCase, bool isAccepted) public returns(uint) {
        // require(runtimeRegistry == msg.sender);
        
        uint iCase = caseIndex[pCase];
        BindingInfo memory roleVRState = roleBindingState[iCase][rNominee];
        
        // A release to vote must be in RELEASING state
        // The endorsed involved in the vote and the processCase address must be nominated before.
        require(roleVRState.bindingState == 1 && actorRoles[actorIndex[endorser]] & (uint(1) << rEndorser) != 0);

        // This function is responsible to evaluate the endorsment. 
        // An exception reverting the transaction is thwown in case of any invalid operation (e.g wrong endorser). 
        // Thus, that function only returns if the endorsement can be performed. 
        uint state = BindingPolicy(policyAdr).assertRVote(rNominator, rNominee, rEndorser, roleVRState.endorsedBy, roleVRState.rejectedBy, isAccepted);
            
        roleBindingState[iCase][rNominee].bindingState = state;
        updateVoteMask(iCase, rNominee, uint(1) << rEndorser, isAccepted);
        if (state == 0 || state == 3) {
            roleBindingState[iCase][rNominee].endorsedBy = roleBindingState[iCase][rNominee].rejectedBy = 0;
            if (state == 0)
                actorRoles[roleVRState.nominee] &= ~(uint(1) << rNominee);
        }
        return state;
    }
        
    
    function canPerform(address actor, address pCase, uint taskIndex) public view returns(bool) {
        bytes32 pId = ControlFlow(registry).bundleFor(pCase);
        uint tRole = ControlFlow(taskRoleAdr).getRoleFromTask(taskIndex, pId);
        uint iCase = caseIndex[pCase];
        while(roleBindingState[iCase][tRole].bindingState != 3) {
            pCase = ControlFlow(pCase).findParent();
            if(pCase == 0)
                break;
            iCase = caseIndex[pCase];
        }
        return actorIndex[actor] > 0 && roleBindingState[iCase][tRole].nominee == actorIndex[actor];
    }
    
    function updateVoteMask(uint iCase, uint rNominee, uint endorserMask, bool isAccepted) private {
        if (isAccepted)
            roleBindingState[iCase][rNominee].endorsedBy |= endorserMask;
        else
            roleBindingState[iCase][rNominee].rejectedBy |= endorserMask;
    }
}
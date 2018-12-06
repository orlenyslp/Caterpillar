pragma solidity ^0.4.25;

/// Index 0 is reserved to identify in the mappings (see Binding Access Control) the elements that aren't binded yet.
/// This is a restriction of Solidity, by definition all the keys are in the mapping, thus the zero (null) value would represent non existence. 
/// Index 1 is reserved to the case-creator which can be seen as a default role in our schema.


/// EXAMPLE
// { 
//   Customer is case-creator,
//   Customer nominates Supplier endorsed-by Customer,
//   Supplier nominates CarrierCandidate not in CarrierCandidate endorsed-by CarrierCandidate,
//   Supplier nominates Carrier in CarrierCandidate endorsed-by Carrier and Customer
// }
// {
//   CarrierCandidate dismisses CarrierCandidate not in Carrier
// }


/// MAPPING OF ROLES TO INDEXES (INTEGER) FOR THE RUNNING EXAMPLE /////////
/// Actor-Identifier -> Index (Index-BitSet)
//  self             -> 1 (2) 
//  Customer         -> 2 (4)  case-creator
//  Supplier         -> 3 (8)
//  CarrierCandidate -> 4 (16)
//  Carrier          -> 5 (32)


library BidingPolicy {
    
    enum EndorsmentState {ENDORSED, PENDING, REJECTED, UNBINDING}
    
    ////////////////////////////////////////////////////////////////////////////
    ///                 NOMINATION (BINDING) OPERATIONS                      ///        
    ////////////////////////////////////////////////////////////////////////////
    
    /** @dev This function retrieves the allowed case creators.  
      * @return bitset encoding all the indexes of roles allowed as case creators.
      */
    function getCaseCreator() public pure returns(uint) {
        return 2;
    }
    
    /** @dev This function evaluates if a role is allowed to nominate another role.  
      * @param nominatorRoles bitset encoding the indexes of the roles of the actor that is trying to nominate,
      * @param nomineeRole index of the role to nominate,
      * @return true if @nominatorRole can nominate @nomineeRole according to the binding policy, otherwise false.
      */
    function checkNominatorCandidates(uint nominatorRoles, uint8 nomineeRole) public pure returns(bool) {

        uint nomineeRoleMask = uint(1) << nomineeRole;
        
        // @nominatorsMask will be a bitset encoding the indexes of all the roles allowed to nominate @nomineeRole
        uint nominatorsMask = 0;
        
        if (nomineeRole == 3)                // Supplier
            nominatorsMask = 4;              // nominated by Customer
        else if (nomineeRoleMask & 48 != 0)  // CarrierCandidate and Carrier
            nominatorsMask = 8;              // nominated by Supplier
        
        // The nominator holds at least one of the roles defined as nominators in the policy. 
        return nominatorsMask & nominatorRoles != 0;
    }
    
    /** @dev This function evaluates if for a given role to nominate the conditions defined are fulfilled 
      *  (keywords IN, NOT IN followed by <set_expression> in the language).  
      *  The conditions must be provided as a disjunction of conjunctions, e.g., (A and B) or (D and E) ..., 
      *  such that they are represented as an array where every conjunction is encoded as a bitset. 
      * @param nomineeRole index of the role to nominate,
      * @param nomineeCurrentRoles bitset encoding the roles previously granted to the actor to be nominated as @nomineeRole,
      * @param nominatorRoles bitset encoding the roles previously granted to the nominator,
      * @return true if the conditions are fulfilled, false otherwise.
      */
    function checkNominationRestrictions(uint8 nomineeRole, uint nomineeCurrentRoles, uint nominatorRoles) public pure returns(bool) {
            
        // Checking the union is required in cases like: A nominates B, C nominates B
        uint nominatorNomineeMask = nominatorRoles | (uint(1) << nomineeRole);
        
        if (nominatorNomineeMask & 24 == 24)             // Supplier nominates CarrierCandidate (8 | 16)
            return !(nomineeCurrentRoles & 16 == 16);    // CarrierCandidate not in CarrierCandidate
        else if (nominatorNomineeMask & 40  == 40)       // Supplier nominates Carrier (8 | 32)
            return nomineeCurrentRoles & 16 == 16;       // Carrier in CarrierCandidate
        
        return true;
        
        // In case of conditions of the form (A and B) or (C and D) or ... the evaluation is made as:
        // return nomineeCurrentRoles & (A | B) == (A | B) || nomineeCurrentRoles & (C | D) == (C | D) ...;
    }
    
    /** @dev This function evaluates if for a given role must be endorsed when nominated,
      * @param nomineeRole index of the role to nominate,
      * @param nominatorRoles bitset encoding the roles previously granted to the nominator,
      * @return true if @nomineeRole requires endorsment, false otherwise
      */
    function requireNominationEndrosment(uint8 nomineeRole, uint nominatorRoles) public pure returns(bool) {
        uint nominatorNomineeMask = nominatorRoles | (uint(1) << nomineeRole);
        return nominatorNomineeMask == 12 
               || nominatorNomineeMask == 24
               || nominatorNomineeMask == 40;
    }
    
    /** @dev This function evaluates if for a given role to endorse the conditions defined are fulfilled 
      *  (keywords ENDORSED BY followed by a <set_expression> in the language).  
      *  The conditions must be provided as a disjunction of conjunctions, e.g., (A and B) or (D and E) ..., 
      *  such that they are represented as an array where every conjunction is encoded as a bitset. 
      * @param nomineeRole index of the role that was nominated,
      * @param endorserRoles bitset encoding the roles granted to the actor who is endorsing,
      * @param endorsedBy bitset encoding the roles that already endorsed the nomination of @nomineeRole,
      * @param rejectedBy bitset encoding the roles that already rejected the nomination of @nomineeRole,
      * @param isAccepted true if the the endorser is accepting the nomination/dismisses, false otherwise 
      * @return true if the conditions are fulfilled, false otherwise.
      */
    function checkNominationEndorsment(uint8 nomineeRole, uint nominatorRoles, uint endorserRoles, uint endorsedBy, uint rejectedBy, bool isAccepted) public pure returns(EndorsmentState) {

        // An endorser is allowed to endorse/reject a nomination once
        require((endorsedBy | rejectedBy) & endorserRoles == 0);
        
        // An role may be nominated by several roles, under diferent conditions/endorsement requirements
        uint nominatorNomineeMask = nominatorRoles | (uint(1) << nomineeRole);
        
        // Considerig the endorsment expression as a disjunction of conjunctions
        // 1- ENDORSED -> all the roles in at least a conjunction set accepted the endorsement,
        // 2- REJECTED -> every conjunction set contains at least one role who rejected the endorsement,
        // 3- PENDING  -> none of the conditions 1 and 2 are fulfilled yet, 
        //                i.e. exist at least a conjunction set without rejections and with roles pending to endorse the nomination.  
        
        // ENDORSED IF: 
        // Exist a conjunction set where: 
        //    [(endorsedBy | endorsedRoles) & conjuntion_set == conjunction_set] is true
        
        // REJECTED IF:
        // for all conjunction set:
        //    [(rejectedBy | endorserRoles) & conjunction_set != 0] is true
        
        
        // WARNING: An actor may hold more than one role, thus "endorserRoles" may include more than one of the endorser roles if they
        // were granted to the actor before. We cannot predict which role is the actor using in the endorsement at least he explicitly
        // provides that as parameter. Note that at runtime, we only know an actor (address) is trying to endorse, no the role such actor 
        // wants to play in such endorsement, at least we manage something like a sesion and provide as input parameter the role of the 
        // actor logged in session.
        
        endorsedBy |= endorserRoles;
        rejectedBy |= endorserRoles;
        
        if(nominatorNomineeMask & 12 == 12) {           // Customer nominates Supplier (4 | 8)
            require(endorserRoles & 8 != 0);            // Validating the user trying to endorse is allowed as endorser.
            if(isAccepted && endorsedBy & 8 == 8)       // endorsed by self[Supplier] (8)
                return EndorsmentState.ENDORSED;
            else if (!isAccepted && rejectedBy & 8 != 0)
                return EndorsmentState.REJECTED;
        }
        else if (nominatorNomineeMask & 24 == 24) {      // Supplier nominates CarrierCandidate (8 | 16)
            require(endorserRoles & 16 != 0);          
            if(isAccepted && endorsedBy & 16 == 16)     // endorsed by self[CarrierCandidate] (16)
                return EndorsmentState.ENDORSED;
            else if (!isAccepted && rejectedBy & 16 != 0)
                return EndorsmentState.REJECTED;
        }
        else if(nominatorNomineeMask & 40 == 40) {      // Supplier nominates Carrier (8 | 32)
            require(endorserRoles & 36 != 0);          
            if(isAccepted && endorsedBy & 36 == 36)     // endorsed by self[Carrier] and Customer (32 | 4)
                return EndorsmentState.ENDORSED;
            else if (!isAccepted && rejectedBy & 36 != 0)
                return EndorsmentState.REJECTED;
        }
        return EndorsmentState.PENDING;
    }
    
    ////////////////////////////////////////////////////////////////////////////
    ///                 DISMISSAL (UNBINDING) OPERATIONS                     ///        
    ////////////////////////////////////////////////////////////////////////////
    
    
    /** @dev This function evaluates if a role is allowed to dismiss another role.  
      * @param dismissalRoles bitset encoding the indexes of the role that is trying to dismiss,
      * @param nomineeRole index of the role to dismiss,
      * @return true if @dismissalRoles can dismiss @nomineeRole according to the binding policy, otherwise false.
      */
    function checkDismissesCandidates(uint dismissalRoles, uint8 nomineeRole) public pure returns(bool) {
        
        uint nomineeRoleMask = uint(1) << nomineeRole;
        uint dismissalsMask = 0;
        
        if (nomineeRoleMask & 4 == 4)  // CarrierCandidate
            dismissalsMask = 16;       // dismissed by CarrierCandidate
        
        return dismissalsMask & dismissalRoles != 0;
    }
    

    /** @dev This function evaluates if for a given role to dismiss the conditions defined are fulfilled 
     *   (keywords IN, NOT IN followed by <set_expression> in the language).  
      *  The conditions must be provided as a disjunction of conjunctions, e.g., (A and B) or (D and E) ..., 
      *  such that they are represented as an array where every conjunction is encoded as a bitset. 
      * @param nomineeRole index of the role to dismiss,
      * @param nomineeCurrentRoles bitset encoding the roles previously granted to the actor to be dismissed as @nomineeRole,
      * @return true if the conditions are fulfilled, false otherwise.
      */
    function checkDismissalRestrictions(uint8 nomineeRole, uint nomineeCurrentRoles, uint dismissalRoles) public pure returns(bool) {
            
        // Checking the union is required in cases like: A dismisses B, C dismisses B
        uint dismissalNomineeMask = dismissalRoles | (uint(1) << nomineeRole);
        
        if (dismissalNomineeMask & 16 == 16)             // CarrierCandidate dismisses CarrierCandidate
            return !(nomineeCurrentRoles & 32 == 32);    // CarrierCandidate not in Carrier

        return true;

    }
    
    /** @dev This function evaluates if for a given role must be endorsed when dismissed,
      * @param nomineeRole index of the role to dismiss,
      * @param dismisalRoles bitset encoding the roles previously granted to the dismissal,
      * @return true if @nomineeRole requires endorsment, false otherwise
      */
    function requireDismissalEndrosment(uint8 nomineeRole, uint dismisalRoles) public pure returns(bool) {
        return true;
    }
    
    /** @dev This function evaluates if for a given role to endorse the conditions defined are fulfilled 
      *  (keywords ENDORSED BY followed by a <set_expression> in the language).  
      *  The conditions must be provided as a disjunction of conjunctions, e.g., (A and B) or (D and E) ..., 
      *  such that they are represented as an array where every conjunction is encoded as a bitset. 
      * @param nomineeRole index of the role that was nominated,
      * @param endorserRoles bitset encoding the roles granted to the actor who is endorsing,
      * @param endorsedBy bitset encoding the roles that already endorsed the nomination of @nomineeRole,
      * @param rejectedBy bitset encoding the roles that already rejected the nomination of @nomineeRole,
      * @param isAccepted true if the the endorser is accepting the nomination/dismisses, false otherwise 
      * @return true if the conditions are fulfilled, false otherwise.
      */
    function checkDismissalEndorsment(uint8 nomineeRole, uint dismissalRoles, uint endorserRoles, uint endorsedBy, uint rejectedBy, bool isAccepted) public pure returns(EndorsmentState) {
        return EndorsmentState.ENDORSED;
    }
    
}
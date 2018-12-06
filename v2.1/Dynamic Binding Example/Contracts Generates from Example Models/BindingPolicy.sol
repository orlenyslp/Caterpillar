pragma solidity ^0.4.25;

contract BindingPolicy {

    function isCaseCreator(uint roleIndex) public pure returns(bool) {
        return 2 & (uint(1) << roleIndex) == 2;
    }

    function canNominate (uint rNominator, uint rNominee) public pure returns(bool) {
        uint nomineeMask = uint(1) << rNominee;
        if (rNominator == 1)
            return nomineeMask & 68 != 0;
        if (rNominator == 2)
            return nomineeMask & 120 != 0;
        if (rNominator == 4)
            return nomineeMask & 32 != 0;
        return false;
    }

    function assertNConstraint (uint rNominator, uint rNominee, uint nomineeRoles) public pure returns(bool) {
        uint nominatorNomineeMask = (uint(1) << rNominator) | (uint(1) << rNominee);
        if (nominatorNomineeMask == 20)
            return  nomineeRoles & 8 == 8;
        return true;
    }

    function requireNEndorsement (uint rNominator, uint rNominee) public pure returns(bool) {
        uint nominatorNomineeMask = (uint(1) << rNominator) | (uint(1) << rNominee);
        return  nominatorNomineeMask == 20 || nominatorNomineeMask == 48 || nominatorNomineeMask == 66 || nominatorNomineeMask == 36 || nominatorNomineeMask == 68;
    }

    function assertNVote (uint rNominator, uint rNominee, uint rEndorser, uint endorsedBy, uint rejectedBy, bool isAccepted) public pure returns(uint) {
        uint endorserMask = uint(1) << rEndorser;
        require((endorsedBy | rejectedBy) & endorserMask == 0);
        uint nominatorNomineeMask = (uint(1) << rNominator) | (uint(1) << rNominee);
        endorsedBy |= endorserMask;
        rejectedBy |= endorserMask;
        if (nominatorNomineeMask == 20) {
            require(endorserMask & 2 != 0);
            if (isAccepted && (endorsedBy & 2 == 2))
                return 3;
            else if (!isAccepted && (rejectedBy & 2 != 0))
                return 0;
        } else if (nominatorNomineeMask == 48) {
            require(endorserMask & 6 != 0);
            if (isAccepted && (endorsedBy & 6 == 6))
                return 3;
            else if (!isAccepted && (rejectedBy & 6 != 0))
                return 0;
        } else if (nominatorNomineeMask == 66) {
            require(endorserMask & 16 != 0);
            if (isAccepted && (endorsedBy & 16 == 16))
                return 3;
            else if (!isAccepted && (rejectedBy & 16 != 0))
                return 0;
        } else if (nominatorNomineeMask == 36) {
            require(endorserMask & 2 != 0);
            if (isAccepted && (endorsedBy & 2 == 2))
                return 3;
            else if (!isAccepted && (rejectedBy & 2 != 0))
                return 0;
        } else if (nominatorNomineeMask == 68) {
            require(endorserMask & 2 != 0);
            if (isAccepted && (endorsedBy & 2 == 2))
                return 3;
            else if (!isAccepted && (rejectedBy & 2 != 0))
                return 0;
        }
        return 2;
    }
}
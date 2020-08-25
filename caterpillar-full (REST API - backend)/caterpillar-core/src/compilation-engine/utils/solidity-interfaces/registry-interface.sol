pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IRegistry {
    function newInstanceFor(uint nodeIndex, address parent) public virtual returns(address);
}

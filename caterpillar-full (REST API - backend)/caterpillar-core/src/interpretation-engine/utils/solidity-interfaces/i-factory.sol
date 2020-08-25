pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IFactory {
    function newInstance() public virtual returns(address);
}

pragma solidity ^0.4.25;

contract IFactory {
    function newInstance() public returns(address);
}
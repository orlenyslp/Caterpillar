pragma solidity ^0.4.25;

contract AbstractFactory {
    address internal worklist = address(0);

    function setWorklist(address _worklist) public {
        worklist = _worklist;
    }

    function newInstance(address parent, address globalFactory) public returns(address);
    function startInstanceExecution(address processAddress) public;
}

pragma solidity >= 0.4.25 < 0.7.0;

abstract contract IFactory {
    address internal worklist = address(0);

    function setWorklist(address _worklist) public {
        worklist = _worklist;
    }

    function newInstance(address parent, address globalFactory) public virtual returns(address);
    function startInstanceExecution(address processAddress) public virtual;
}

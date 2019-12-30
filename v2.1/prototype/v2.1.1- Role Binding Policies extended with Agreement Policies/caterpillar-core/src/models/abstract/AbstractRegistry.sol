pragma solidity ^0.4.25;

contract AbstractRegistry {

    function registerFactory(bytes32 bundleId, address factory) public;

    function registerWorklist(bytes32 bundleId, address worklist) public;

    function allInstances() public returns(address[]);

    function newInstanceFor(uint nodeIndex, address parent) public returns(address);

    function newBundleInstanceFor(bytes32 bundleId, address parent) public returns(address);

    function bundleFor(address processInstance) public returns(bytes32);

    function worklistBundleFor(address worklist) public returns(bytes32);

    function hasFactory(uint nodeIndex, address parent) public view returns(bool);

    function resumeInstanceFor(address processInstance, uint elementIndex, uint decission) public;

    // Functions for Dynamic Bindings
    function bindingPolicyFor(address processInstance) public view returns(bytes32);

    function taskRoleMapFor(address processInstance) public view returns(bytes32);

    function relateProcessToPolicy(bytes32 bundleId, bytes32 _taskRole, bytes32 _policy) external;

    function canPerform(address actor, address processCase, uint taskIndex) external view returns(bool);
}

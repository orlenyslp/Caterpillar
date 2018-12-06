pragma solidity ^0.4.25;

contract TaskRoleMap {

    function getRoleFromTask(uint taskIndex, bytes32 processId) public pure returns(uint) {
        if (processId == '5c08c13e8c6b84b88c5bab4f') {
            uint[3] memory I5c08c13e8c6b84b88c5bab4f = [uint(0), 1, 2];
            if(taskIndex < 3)
                return I5c08c13e8c6b84b88c5bab4f[taskIndex];
        }
        if (processId == '5c08c0c28c6b84b88c5bab4d') {
            uint[5] memory I5c08c0c28c6b84b88c5bab4d = [uint(0), 4, 0, 0, 2];
            if(taskIndex < 5)
                return I5c08c0c28c6b84b88c5bab4d[taskIndex];
        }
        if (processId == '5c08c1048c6b84b88c5bab4e') {
            uint[7] memory I5c08c1048c6b84b88c5bab4e = [uint(0), 5, 6, 0, 0, 0, 5];
            if(taskIndex < 7)
                return I5c08c1048c6b84b88c5bab4e[taskIndex];
        }
        if (processId == '5c08c0c28c6b84b88c5bab4c') {
            uint[2] memory I5c08c0c28c6b84b88c5bab4c = [uint(0), 3];
            if(taskIndex < 2)
                return I5c08c0c28c6b84b88c5bab4c[taskIndex];
        }
        return 0;
    }
}
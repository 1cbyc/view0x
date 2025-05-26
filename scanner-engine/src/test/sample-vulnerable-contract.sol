// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public constant WITHDRAWAL_LIMIT = 1 ether;
    
    // Missing access control modifier
    function setOwner(address newOwner) public {
        owner = newOwner;
    }
    
    // Reentrancy vulnerability
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Vulnerable to reentrancy
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
    
    // Integer overflow vulnerability (before Solidity 0.8.0)
    function unsafeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b; // Could overflow in older Solidity versions
    }
    
    // Unprotected selfdestruct
    function destroy() public {
        selfdestruct(payable(msg.sender));
    }
    
    // Dangerous tx.origin usage
    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }
    
    // Unchecked external call
    function unsafeCall(address target, bytes memory data) public {
        target.call(data);
    }
    
    // Weak randomness
    function getRandomNumber() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
    }
    
    // Dangerous delegatecall
    function delegateCall(address target, bytes memory data) public {
        target.delegatecall(data);
    }
    
    // Gas optimization issues
    struct User {
        uint256 id;
        bool isActive;
        uint256 balance;
        address addr;
    }
    
    User[] public users;
    
    // Inefficient loop
    function findUser(address addr) public view returns (uint256) {
        for(uint256 i = 0; i < users.length; i++) {
            if(users[i].addr == addr) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    // Magic numbers
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return amount * 5 / 100; // Magic number 5 and 100
    }
    
    // Complex function with multiple responsibilities
    function complexFunction(uint256 amount, address to, bool shouldTransfer) public {
        if(amount > 0) {
            if(to != address(0)) {
                if(shouldTransfer) {
                    balances[to] += amount;
                    balances[msg.sender] -= amount;
                    emit Transfer(msg.sender, to, amount);
                }
            }
        }
    }
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
} 
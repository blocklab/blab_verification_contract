pragma solidity ^0.4.2;

contract Token {
  bool public initialized;
  address public owner;
  mapping (address => uint) balances;

  function Token() {
    owner = msg.sender;
  }

  function setUpWiring(address verificationContract) {
    if (msg.sender == owner && !initialized) {
      owner = verificationContract;
      balances[owner] = 100000;
      initialized = true;
    }
  }

  function sendCoin(address receiver, uint amount) returns(bool sufficient) {
    if (balances[msg.sender] < amount) return false;
      balances[msg.sender] -= amount;
      balances[receiver] += amount;
      return true;
  }

  function getBalance(address addr) constant returns(uint) {
    return balances[addr];
  }

}
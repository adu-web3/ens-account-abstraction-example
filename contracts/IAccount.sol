// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IAccount is IERC165 {
  struct UserOperation {
    string sender;
    string recipient;
    uint256 nonce;
    uint256 value;
    bytes data;
    bytes signature;
  }

  // Validate a user operation
  function validateUserOperation(UserOperation calldata userOp, address senderAddress) external view returns (bool);

  // Execute a user operation
  function executeUserOperation(address target, uint256 value, bytes memory data) external;

  // Event emitted when a user operation is executed
  event UserOperationExecuted(string sender, string recipient, uint256 indexed nonce, uint256 value, bytes data);
}
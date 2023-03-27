// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./IAccount.sol";

contract BasicAccount is IAccount, ERC165 {
    using ERC165Checker for address;
    using ECDSA for bytes32;

    address public owner;
    address private immutable _entryPoint;

    constructor(address owner_, address entryPoint_) {
        owner = owner_;
        _entryPoint = entryPoint_;
    }

    modifier onlyEntryPointOrOwner {
        require(msg.sender == address(entryPoint()) || msg.sender == owner || msg.sender == address(this), "account: not Owner or EntryPoint");
        _;
    }

    function supportsInterface(bytes4 interfaceId) public view override(IERC165, ERC165) returns (bool) {
        return interfaceId == type(IAccount).interfaceId || super.supportsInterface(interfaceId);
    }

    function validateUserOperation(UserOperation calldata userOp, address senderAddress) external view override returns (bool) {
        require(senderAddress == owner || senderAddress == address(this), "Invalid sender");
        require(userOp.nonce == _nonce, "Invalid nonce");

        bytes32 hash = keccak256(abi.encode(userOp.sender, userOp.recipient, userOp.nonce, userOp.value, userOp.data));
        address signer = hash.recover(userOp.signature);
        require(signer == owner || signer == address(this), "Invalid signature");

        return true;
    }

    function executeUserOperation(address target, uint256 value, bytes memory data) external override onlyEntryPointOrOwner {
        _incrementNonce();

        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function entryPoint() public view returns (address) {
        return _entryPoint;
    }

    uint256 private _nonce;

    function _incrementNonce() private {
        _nonce++;
    }
}

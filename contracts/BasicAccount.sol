// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./IAccount.sol";
import "hardhat/console.sol";

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

    receive() external payable {}

    function validateUserOperation(UserOperation calldata userOp, address senderAddress) external view override returns (bool) {
        require(senderAddress == owner || senderAddress == address(this), "Invalid sender");
        require(userOp.nonce == _nonce, "Invalid nonce");

        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
            keccak256(bytes("UserOperation")),
            keccak256(bytes("1")),
            address(this)
        ));

        bytes32 structHash = keccak256(abi.encode(
            keccak256("UserOperation(string sender,string recipient,uint256 value,bytes data,uint256 nonce)"),
            keccak256(bytes(userOp.sender)),
            keccak256(bytes(userOp.recipient)),
            userOp.value,
            keccak256(userOp.data),
            userOp.nonce
        ));

        bytes32 hash = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));

        address signer = hash.recover(userOp.signature);
        // Log for test
        console.log("recover signer: %s from signature", signer);
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

    function nonce() public view returns (uint256) {
        uint256 n = _nonce;
        return n;
    }
}

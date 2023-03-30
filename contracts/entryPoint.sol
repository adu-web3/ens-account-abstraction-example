pragma solidity ^0.8.0;

import "./IAccount.sol";
import "hardhat/console.sol";

// A minimal interface for ENS resolver
interface ENSResolver {
    function addr(bytes32 node) external view returns (address);
}

// A minimal interface for ENS registry
interface ENSRegistry {
    function resolver(bytes32 node) external view returns (ENSResolver);
}

contract EntryPoint {
    address private _ensRegistry;

    constructor(address ensRegistryAddress) {
        _ensRegistry = ensRegistryAddress;
    }

    function handleOps(IAccount.UserOperation[] calldata userOps) external payable {
        for (uint256 i = 0; i < userOps.length; i++) {
            address sender = resolve(userOps[i].sender);
            address recipient = resolve(userOps[i].recipient);
            // Log for test
            console.log("sender: %s, recipient: %s", sender, recipient);

            require(isContract(sender), "Invalid sender");
            require(IAccount(sender).supportsInterface(type(IAccount).interfaceId), "Sender does not support IAccount");

            require(IAccount(sender).validateUserOperation(userOps[i], sender), "Invalid user operation");

            IAccount(sender).executeUserOperation(recipient, userOps[i].value, userOps[i].data);
        }
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }

    function resolve(string memory name) internal view returns (address) {
        // Get an instance of the ENS registry contract
        ENSRegistry registry = ENSRegistry(_ensRegistry);

        // Compute node
        bytes32 node = namehash(name);

        // Get the resolver contract for the node
        ENSResolver resolver = registry.resolver(node);

        // Get the address associated with the node
        address addr = resolver.addr(node);

        // Return the resolved address
        return addr;
    }

    function namehash(string memory name) public pure returns (bytes32 node) {
        uint8 labelLength = 0;
        bytes memory bytesName = bytes(name);
        uint256 length = bytesName.length;
        node = 0;
        if (length == 0) {
            return node;
        }

        // use unchecked to save gas since we check for an underflow
        // and we check for the length before the loop
        unchecked {
            for (uint256 i = length - 1; i >= 0; i--) {
                if (bytesName[i] == ".") {
                    node = keccak256(
                        abi.encodePacked(
                            node,
                            labelhash(bytesName, i + 1, labelLength)
                        )
                    );
                    labelLength = 0;
                } else {
                    labelLength += 1;
                }
                if (i == 0) {
                    break;
                }
            }
        }

        node = keccak256(
            abi.encodePacked(node, labelhash(bytesName, 0, labelLength))
        );

        return node;
    }

    function labelhash(bytes memory name, uint256 offset, uint256 len) public pure returns (bytes32 ret) {
        require(offset + len <= name.length);
        assembly {
            ret := keccak256(add(add(name, 32), offset), len)
        }
    }
}

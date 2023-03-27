pragma solidity ^0.8.0;

import "./IAccount.sol";

// A minimal interface for ENS resolver
interface ENSResolver {
    function addr(bytes32 node) external view returns (address);
}

// A minimal interface for ENS registry
interface ENSRegistry {
    function resolver(bytes32 node) external view returns (ENSResolver);
}

contract EntryPoint {
    address public constant ensRegistry = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    function handleOps(IAccount.UserOperation[] calldata userOps) external payable {
        for (uint256 i = 0; i < userOps.length; i++) {
            address sender = resolve(userOps[i].sender);
            address recipient = resolve(userOps[i].recipient);

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

    // function namehash(string memory name) internal pure returns (bytes32) {
    //     if (bytes(name).length == 0) {
    //         return bytes32(0);
    //     }

    //     bytes memory domain = abi.encodePacked(name);
    //     bytes32[2] memory hashes;
    //     uint len = domain.length;

    //     while (len > 0) {
    //         uint labelEnd = len;
    //         uint labelStart;
    //         for (uint i = len - 1; i + 1 > 0; i--) {
    //             if (domain[i] == ".") {
    //                 labelStart = i + 1;
    //                 break;
    //             }
    //         }

    //         hashes[1] = keccak256(abi.encodePacked(domain[labelStart:labelEnd]));
    //         hashes[0] = keccak256(abi.encodePacked(hashes));

    //         len = labelStart - 1;
    //     }

    //     return hashes[0];
    // }

    // function resolve(string memory name) internal view returns (address) {
    //     ENSRegistry registry = ENSRegistry(ensRegistry);
    //     bytes32 node = namehash(name);
    //     ENSResolver resolver = registry.resolver(node);
    //     address addr = resolver.addr(node);
    //     return addr;
    // }
    function resolve(string memory name) internal view returns (address) {
        // Get an instance of the ENS registry contract
        ENSRegistry registry = ENSRegistry(ensRegistry);

        // Split the domain name into labels
        bytes memory domain = bytes(name);
        uint256 labelStart = 0;
        uint256 labelEnd = 0;
        bytes32[2] memory hashes;

        for (uint256 i = 0; i < domain.length; i++) {
            if (domain[i] == ".") {
                labelEnd = i;
                bytes memory label = new bytes(labelEnd - labelStart);
                for (uint256 j = 0; j < labelEnd - labelStart; j++) {
                    label[j] = domain[labelStart + j];
                }
                hashes[1] = keccak256(abi.encodePacked(label));
                hashes[0] = keccak256(abi.encodePacked(hashes[0], hashes[1]));
                labelStart = i + 1;
            }
        }

        bytes memory topLevelLabel = new bytes(domain.length - labelStart);
        for (uint256 i = 0; i < domain.length - labelStart; i++) {
            topLevelLabel[i] = domain[labelStart + i];
        }
        hashes[1] = keccak256(abi.encodePacked(topLevelLabel));
        hashes[0] = keccak256(abi.encodePacked(hashes[0], hashes[1]));

        // Get the resolver contract for the node
        ENSResolver resolver = registry.resolver(hashes[0]);

        // Get the address associated with the node
        address addr = resolver.addr(hashes[0]);

        // Return the resolved address
        return addr;
    }

}

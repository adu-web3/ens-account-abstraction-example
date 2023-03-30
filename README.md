# Ethereum ENS Domain Name Resolution with Account Abstraction (ERC-4337)

This example demonstrates how to use Ethereum ENS domain names with Account Abstraction, as introduced in [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337). The project features a test suite that shows how a user, like Alice, can sign a pseudo-transaction ([`UserOperation`](contracts/IAccount.sol)) with both the sender and recipient being domain names, instead of Ethereum addresses. This approach eliminates the risks associated with off-chain ENS resolution:

1. risks of "Man-in-the-middle attack"
    - The wallet or other user-agents may fetch false information by querying a network node without verifying the information via light client.
    - Phishing websites could tempt the user to interact with a fake contract and steal their assets.
2. risks of inconsistency
    - There is no way that the wallet could promise that the resolution records they fetch are consistent with the latest state of the ENS contracts. 

Besides, allowing the user to sign the information with domain name is more user-friendly.

## Setup

To set up the project, follow these steps:

1. Clone the repository:

```bash
    git clone https://github.com/<your-github-username>/ens-account-abstraction-example.git
```

2. Change into the project directory:

```bash
    cd ens-account-abstraction-example
```

3. Create a `.env` file in the project root and set the `ALCHEMY_API_KEY` variable to your Alchemy API key

## Running tests

To run the tests, execute `npx hardhat test`. This will run a series of tests that showcase the following:

1. Registering and resolving ENS domain names
2. Creating a `BasicAccount` contract for Alice and Bob
3. Transferring ETH from Alice's `BasicAccount` to Bob using ENS names and a signed `UserOperation`

The tests demonstrate how to interact with ENS, create and sign UserOperations, and execute them via an EntryPoint contract.


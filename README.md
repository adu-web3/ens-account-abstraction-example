# Ethereum ENS Domain Name Resolution with Account Abstraction (ERC-4337)

This example demonstrates how to use Ethereum ENS domain names with Account Abstraction, as introduced in [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337). The project features a test suite that shows how a user, like Alice, can sign a pseudo-transaction ([`UserOperation`](contracts/IAccount.sol)) with both the sender and recipient being domain names, instead of Ethereum addresses. This approach eliminates the risks associated with off-chain ENS resolution:

1. Man-in-the-middle attacks: Attackers could intercept communication between the wallet and the ENS service, altering the resolved address to redirect funds or manipulate transactions.
2. Inconsistencies: Different wallet implementations or external services might resolve ENS names differently or have outdated records, leading to discrepancies in the resolved addresses.

The term "pseudo-transaction" is used in this example to describe a `UserOperation` structure that represents a high-level transaction-like object containing information such as sender, recipient, value, data, nonce, and signature. It is not a native Ethereum transaction but encapsulates the necessary information to execute a transaction-like operation. But it could also be called as "meta-transaction". A "meta-transaction" is a term commonly used to describe a transaction that is not directly submitted to the blockchain by the user (i.e., the sender) but is instead processed by an intermediary or a relayer, who then submits the actual transaction on behalf of the user. Meta-transactions are useful for abstracting away the complexities of gas fees, nonce management, and other low-level details from end-users.

By using a `UserOperation` as a meta-transaction, the example demonstrates an approach to implement Account Abstraction on Ethereum while incorporating on-chain ENS resolution to mitigate risks associated with off-chain resolution.

Gas fee paymant stuff is left out in this example to simplify it.

## Setup

To set up the project, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/wns-lab/ens-account-abstraction-example.git
```

2. Change into the project directory:

```bash
cd ens-account-abstraction-example
```

3. Install the required dependencies:

```bash
npm install
```

4. Compile the smart contracts:

```bash
npx hardhat compile
```

5. Run a local Ethereum node for testing:

```bash
npx hardhat node
```

5. In a new terminal window, deploy the contracts:

```bash
npx hardhat test --network localhost test/ens-aa-test.js
```

After completing these steps, you should see the output from the test suite indicating the successful execution of the example.

## Key Components

- `contracts/IAccount.sol`: This contract defines the `IAccount` interface and the `UserOperation` struct.
- `contracts/EntryPoint.sol`: This contract serves as the entry point for processing `UserOperation` structures, resolving ENS domain names on-chain, validating the signature and executing the operations.
- `contracts/BasicAccount.sol`: An implementation of the `IAccount` interface that allows users to sign the pseudo-transaction(`UserOperation`) with ENS domain names, and verifys the `BaseAccount` owner's private key instead of the private key of the contract itself.
- `test/ens-aa-test.js`: The test suite that demonstrates how Alice can sign a `UserOperation` using ENS domain names and execute it through the EntryPoint contract.

By understanding the interactions between these components, you can gain a deeper understanding of how Account Abstraction with ENS domain names can enhance the user experience on Ethereum.
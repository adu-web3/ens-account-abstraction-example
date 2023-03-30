// test/ens_test.js

const { expect } = require("chai");
const namehash = require('eth-ens-namehash');
const labelhash = (label) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label))
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("ENS", function () {
  let ensRegistry, fifsRegistrar, publicResolver, owner, alice, bob, relayer, aliceBasicAccount, entryPoint;

  before(async () => {
    // Get the signers
    [owner, alice, bob, relayer] = await ethers.getSigners();
    console.log("alice: %s, bob: %s, relayer: %s, owner: %s", alice.address, bob.address, relayer.address, owner.address)

    const ENSRegistry = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol:ENSRegistry");
    const FIFSRegistrar = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol:FIFSRegistrar");
    const PublicResolver = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol:PublicResolver");
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const BasicAccount = await ethers.getContractFactory("BasicAccount");

    // Deploy the ENS Registry
    ensRegistry = await ENSRegistry.deploy();
    await ensRegistry.deployed();

    // Deploy the FIFSRegistrar
    fifsRegistrar = await FIFSRegistrar.deploy(ensRegistry.address, namehash.hash("eth"));
    await fifsRegistrar.deployed();
    console.log("fifsRegistrar address: ", fifsRegistrar.address)

    // Deploy the PublicResolver
    publicResolver = await PublicResolver.deploy(ensRegistry.address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS);
    await publicResolver.deployed();
    console.log("publicResolver address: ", publicResolver.address)

    // Deploy the EntryPoint contract and alice's BasicAccount
    entryPoint = await EntryPoint.deploy(ensRegistry.address);
    await entryPoint.deployed();
    console.log("entry point address: ", entryPoint.address)
    expect(await entryPoint.namehash("alice.eth")).to.equal(namehash.hash("alice.eth"))
    aliceBasicAccount = await BasicAccount.deploy(alice.address, entryPoint.address);
    await aliceBasicAccount.deployed();
    console.log("alice basic account address: ", aliceBasicAccount.address)

    // Set the resolver for "eth" TLD
    await ensRegistry.setSubnodeOwner(ethers.constants.HashZero, labelhash("eth"), owner.address);
    await ensRegistry.setResolver(namehash.hash("eth"), publicResolver.address);
    await ensRegistry.setSubnodeOwner(ethers.constants.HashZero, labelhash("eth"), fifsRegistrar.address);

    const domainNameAlice = "alice.eth";
    const domainNameBob = "bob.eth";
    const domainNameAliceHash = namehash.hash(domainNameAlice);
    const domainNameBobHash = namehash.hash(domainNameBob);

    await fifsRegistrar.connect(owner).register(labelhash("alice"), alice.address);
    expect(await ensRegistry.owner(domainNameAliceHash)).to.equal(alice.address);
    await fifsRegistrar.connect(owner).register(labelhash("bob"), bob.address);
    expect(await ensRegistry.owner(domainNameBobHash)).to.equal(bob.address);

    await ensRegistry.connect(alice).setResolver(domainNameAliceHash, publicResolver.address);
    await ensRegistry.connect(bob).setResolver(domainNameBobHash, publicResolver.address);

    const iface = new ethers.utils.Interface(publicResolver.interface.fragments);
    async function setAddr(sender, node, address) {
        const setAddrFunctionFragment = iface.getFunction("setAddr(bytes32,address)");
        const encodedFunctionCall = iface.encodeFunctionData(setAddrFunctionFragment, [node, address]);
        await sender.sendTransaction({ to: publicResolver.address, data: encodedFunctionCall });
    }

    async function getAddr(sender, node) {
        const getAddrFunctionFragment = iface.getFunction("addr(bytes32)");
        const encodedGetAddrFunctionCall = iface.encodeFunctionData(getAddrFunctionFragment, [node]);
        const result = await sender.call({ to: publicResolver.address, data: encodedGetAddrFunctionCall });
        // Decode the result to get the resolved address
        const resolvedAddress = iface.decodeFunctionResult(getAddrFunctionFragment, result)[0];

        return resolvedAddress
    }

    await setAddr(alice, domainNameAliceHash, aliceBasicAccount.address)
    expect(await getAddr(alice, domainNameAliceHash)).to.equal(aliceBasicAccount.address);
    await setAddr(bob, domainNameBobHash, bob.address)
    expect(await getAddr(bob, domainNameBobHash)).to.equal(bob.address);

    await owner.sendTransaction({
        to: aliceBasicAccount.address,
        value: ethers.utils.parseEther("1"),
        gasLimit: ethers.utils.hexlify(100000)
      });
  });

  it("Should transfer ETH from Alice's BasicAccount to Bob using ENS names and UserOperation", async function () {
    // Create UserOperation
    const amountToSend = ethers.utils.parseEther("0.1");
    const nonce = await aliceBasicAccount.nonce();
    // Leave out neccessary fields like `gasLimit`, `chainId`, `gasPrice` to simplify the test
    const op = {
      sender: "alice.eth",
      recipient: "bob.eth",
      value: amountToSend,
      data: "0x",
      nonce: nonce,
    };

    // Sign the UserOperation with Alice's private key
    const sig = await alice._signTypedData(
        {
          name: "UserOperation",
          version: "1",
          verifyingContract: aliceBasicAccount.address,
        },
        {
          UserOperation: [
            { name: "sender", type: "string" },
            { name: "recipient", type: "string" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
            { name: "nonce", type: "uint256" },
          ],
        },
        op
      );
    
    // Let's assemble the real UserOperation here
    const operation = {
      sender: "alice.eth",
      recipient: "bob.eth",
      value: amountToSend,
      data: "0x",
      nonce: nonce,
      signature: sig,
    };
    
    // UserOperation through the EntryPoint contract
    const beforeBalanceAlice = await ethers.provider.getBalance(aliceBasicAccount.address);
    const beforeBalanceBob = await ethers.provider.getBalance(bob.address);
    console.log("before balance, alice basic account: %s, bob: %s", beforeBalanceAlice, beforeBalanceBob)

    await entryPoint.connect(relayer).handleOps([operation]);

    const afterBalanceAlice = await ethers.provider.getBalance(aliceBasicAccount.address);
    const afterBalanceBob = await ethers.provider.getBalance(bob.address);
    console.log("after balance, alice basic account: %s, bob: %s", afterBalanceAlice, afterBalanceBob)

    // Verify that the balances have been updated correctly
    expect(beforeBalanceAlice.sub(afterBalanceAlice)).to.eq(amountToSend);
    expect(afterBalanceBob.sub(beforeBalanceBob)).to.eq(amountToSend);
  });
});

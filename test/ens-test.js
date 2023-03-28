// test/ens_test.js

const { expect } = require("chai");
const namehash = require('eth-ens-namehash');
const labelhash = (label) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label))
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("ENS", function () {
  let ensRegistry, fifsRegistrar, publicResolver, owner, addr1;

  before(async () => {
    // Get the signers
    [owner, addr1] = await ethers.getSigners();

    const ENSRegistry = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol:ENSRegistry");
    const FIFSRegistrar = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol:FIFSRegistrar");
    const PublicResolver = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol:PublicResolver");

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

    // Set the resolver for "eth" TLD
    await ensRegistry.setSubnodeOwner(ethers.constants.HashZero, labelhash("eth"), owner.address);
    await ensRegistry.setResolver(namehash.hash("eth"), publicResolver.address);
    await ensRegistry.setSubnodeOwner(ethers.constants.HashZero, labelhash("eth"), fifsRegistrar.address);
  });

  it("Should register and resolve a domain name", async function () {
    
    const domainName = "alice.eth";
    const domainNameHash = namehash.hash(domainName);

    // Register the domain name
    console.log("Registering alice.eth....");
    expect(await ensRegistry.owner(namehash.hash('eth'))).to.equal(fifsRegistrar.address);
    await fifsRegistrar.connect(owner).register(labelhash("alice"), addr1.address);

    // Check the domain's owner
    console.log("Checking alice.eth owner....");
    expect(await ensRegistry.owner(domainNameHash)).to.equal(addr1.address);

    // Set the domain's resolver
    console.log("Setting up alice.eth resolver....");
    await ensRegistry.connect(addr1).setResolver(domainNameHash, publicResolver.address);

    // Set the domain's address record in the PublicResolver
    console.log("Setting up alice.eth resolution record....");
    const iface = new ethers.utils.Interface(publicResolver.interface.fragments);
    const setAddrFunctionFragment = iface.getFunction("setAddr(bytes32,address)");
    const encodedFunctionCall = iface.encodeFunctionData(setAddrFunctionFragment, [domainNameHash, addr1.address]);
    await addr1.sendTransaction({ to: publicResolver.address, data: encodedFunctionCall });

    // Resolve the domain name
    console.log("Resolving the domain name....");
    const getAddrFunctionFragment = iface.getFunction("addr(bytes32)");
    const encodedGetAddrFunctionCall = iface.encodeFunctionData(getAddrFunctionFragment, [domainNameHash]);
    const result = await addr1.call({ to: publicResolver.address, data: encodedGetAddrFunctionCall });
    // Decode the result to get the resolved address
    const resolvedAddress = iface.decodeFunctionResult(getAddrFunctionFragment, result)[0];

    expect(resolvedAddress).to.equal(addr1.address);
  });
});

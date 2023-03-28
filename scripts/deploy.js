// scripts/deploy.js

const hre = require("hardhat");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const ENSRegistry = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol:ENSRegistry");
  const FIFSRegistrar = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol:FIFSRegistrar");
  const PublicResolver = await ethers.getContractFactory("@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol:PublicResolver");

  // Deploy ENS contracts
  const ensRegistry = await ENSRegistry.deploy();
  await ensRegistry.deployed();
  console.log("ENSRegistry deployed to:", ensRegistry.address);

  const namehash = require('eth-ens-namehash');
  const ethDomainNode = namehash.hash('eth');

  const registrar = await FIFSRegistrar.deploy(ensRegistry.address, ethDomainNode);
  await registrar.deployed();
  console.log("FIFSRegistrar deployed at:", registrar.address);

  const publicResolver = await PublicResolver.deploy(ensRegistry.address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS);
  await publicResolver.deployed();
  console.log("PublicResolver deployed to:", publicResolver.address);

  // Deploy EntryPoint contract
  const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy(ensRegistry.address);
  await entryPoint.deployed();
  console.log("EntryPoint deployed to:", entryPoint.address);

  // Deploy BasicAccount contract
  const BasicAccount = await hre.ethers.getContractFactory("BasicAccount");
  const basicAccount = await BasicAccount.deploy(deployer.address, entryPoint.address);
  await basicAccount.deployed();
  console.log("BasicAccount deployed to:", basicAccount.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

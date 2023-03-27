const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy EntryPoint contract
    const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    console.log("EntryPoint contract deployed to:", entryPoint.address);

    // Deploy BasicAccount contract
    const BasicAccount = await hre.ethers.getContractFactory("BasicAccount");
    const basicAccount = await BasicAccount.deploy(deployer.address, entryPoint.address);
    await basicAccount.deployed();
    console.log("BasicAccount contract deployed to:", basicAccount.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

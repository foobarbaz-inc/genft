const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  const ChainAIV2Factory = await hre.ethers.getContractFactory("ChainAIV2");
  const chainAIv2 = await ChainAIV2Factory.deploy(0);

  console.log("ChainAIV2 address:", chainAIv2.address);

  const EvolvingNftFactory = await hre.ethers.getContractFactory("EvolvingNFT");
  const evolvingNft = await EvolvingNftFactory.deploy(deployer.address, chainAIv2.address, 0, 0, "");

  console.log("EvolvingNFT address:", evolvingNft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

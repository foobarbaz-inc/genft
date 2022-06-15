const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  const ChainAIFactory = await hre.ethers.getContractFactory("ChainAI");
  const chainAI = await ChainAIFactory.deploy(0, 0);

  console.log("ChainAI address:", chainAI.address);

  const ArtNFTFactory = await hre.ethers.getContractFactory("ArtNFT");
  const artNft = await ArtNFTFactory.deploy()

  console.log("ArtNFT reference address:", artNft.address);

  const GENftFactory = await hre.ethers.getContractFactory("GENft");
  const genft = await GENftFactory.deploy("", artNft.address, artNft.address, 0);

  console.log("GENft address:", genft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

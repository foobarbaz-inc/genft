const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const EvolvingNftFactory = await hre.ethers.getContractFactory("EvolvingNFT");
  const evolvingNft = await EvolvingNftFactory.deploy(
    deployer.address,
    "0x8037e16773e7C2979F82e2B2952d7B31F1905518", //TextConditionalImageGeneration address
    0,
    "https://arweave.net/t6Zty8DwFR2uJDN6JHzWne7eLMSbzgs3XrP8ruhqbt0" // loading img location
  );

  console.log("EvolvingNFT address:", evolvingNft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

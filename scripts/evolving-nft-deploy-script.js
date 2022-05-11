const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  const ChainAIV2Factory = await hre.ethers.getContractFactory("ChainAIV2");
  const chainAIv2 = await ChainAIV2Factory.deploy(0);

  console.log("ChainAIV2 address:", chainAIv2.address);

  const TextConditionalImageGenerationFactory = await hre.ethers.getContractFactory("TextConditionalImageGeneration");
  const textConditionalImageGeneration = await TextConditionalImageGenerationFactory.deploy(
    deployer.address,
    deployer.address,
    chainAIv2.address,
    true,
    0,
    "https://arweave.net/IcQ1dcyGvOmeAZutDT5jqUQoRVA4mM-RXkG1wHUMqO0"
  ); // model location

  console.log("TextConditionalImageGeneration address:", textConditionalImageGeneration.address);

  // add model to ChainAIV2
  var txn = await chainAIv2.connect(deployer).addModel(textConditionalImageGeneration.address);
  console.log("Added model to oracle:", txn);

  const EvolvingNftFactory = await hre.ethers.getContractFactory("EvolvingNFT");
  const evolvingNft = await EvolvingNftFactory.deploy(
    deployer.address,
    textConditionalImageGeneration.address,
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

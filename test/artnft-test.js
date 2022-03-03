const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increase_time(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

describe("ArtNft", function () {
  async function deployChainAI(trainingPrice, inferencePrice) {
    const [deployer, sequencer, randomPerson] = await ethers.getSigners()
    const ChainAIFactory = await ethers.getContractFactory("ChainAI");
    const chainAI = await ChainAIFactory.deploy(trainingPrice, inferencePrice);
    await chainAI.deployed()
    return {
      chainAI,
      deployer,
      sequencer,
      randomPerson
    }
  }
  async function deployArtNFT() {
    const ArtNftFactory = await ethers.getContractFactory("ArtNft");
    const artNft = await ArtNftFactory.deploy();
    await artNft.deployed()
    return artNft
  }
  async function deployGENft(baseModelLocation, referenceChild, mlCoordinator) {
    const GENftFactory = await ethers.getContractFactory("GENft");
    const genft = await GENftFactory.deploy(baseModelLocation, referenceChild, mlCoordinator);
    await genft.deployed()
    return genft
  }
  it("Initializes the ArtNft contract only once", async function () {

  });
  it("Allows the ML coordinator to set the tokenURI", async function () {

  });
});

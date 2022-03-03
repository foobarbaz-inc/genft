const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increase_time(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

describe("GENft", function () {
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
  async function deployGENft(baseModelLocation, referenceChild, mlCoordinator, price) {
    const GENftFactory = await ethers.getContractFactory("GENft");
    const genft = await GENftFactory.deploy(baseModelLocation, referenceChild, mlCoordinator, price);
    await genft.deployed()
    return genft
  }
  it("Clones a new instance of ArtNFT when you mint a GENft token", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await GENftFactory.deploy("", artNFT.address, mlCoordinator.address, 0)
    expect(await genft.mint(randomPerson.address, ""))
      .to.emit()
  });
  it("Allows the ML coordinator to set the tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await GENftFactory.deploy("", artNFT.address, mlCoordinator.address, 0)
  });
});

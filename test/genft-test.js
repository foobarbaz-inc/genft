const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GENft", function () {
  it("Clones a new instance of ArtNFT when you mint a GENft token", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, 0, 0, "a", "b", 0, 1, 1, 1)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Test mint
    expect(await genft.mint(randomPerson.address, "c", "d"))
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Test setDataLocation
    const chainAI_signer = await ethers.getSigner(chainAI.address);
    expect(await genft.connect(chainAI_signer).setDataLocation(1, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet", 1, "trainedModelLoc")
  });

  it("Blocks non ML coordinator from setting tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, 0, 0, "", "", 0, 1, 1, 1)
    await expect(genft.connect(sequencer).setDataLocation(1, ""))
      .to.be.revertedWith("Not ML coordinator")
  });
});

const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration", function () {
  it("Creates training job and inference job", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, 0, 0, "a", "b", 0, 1, 1, 1)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Mint GENft
    expect(await genft.mint(randomPerson.address, "c", "d", 0))
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Set model
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)

    // Get created ArtNFT
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);

    // Mint ArtNFT
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await childArtNft.connect(randomPerson).mint(randomPerson.address, "e"))
      .to.emit(childArtNft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, 1, "trainedModelLoc", "e", timestamp)

    // Set output
    expect(await chainAI.connect(sequencer).updateJobStatus(2, 2, "outputDataLoc"))
      .to.emit(childArtNft, "TokenUriSet").withArgs(1, "outputDataLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(2)
  });
});

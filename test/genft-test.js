const { deployChainAI, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("GENft", function () {
  it("Clones a new instance of ArtNFT when you mint a GENft token", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const genft = await deployGENft(artNft.address, chainAI.address, 0, 0, "a", "b", 0, 1, 1, 1)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Test mint
    expect(await genft.mint(randomPerson.address, "c", "d", 0))
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Test setting model
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)
  });

  it("Blocks non ML coordinator from setting tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, 0, 0, "", "", 0, 1, 1, 1)
    await expect(genft.connect(sequencer).setDataLocation(1, ""))
      .to.be.revertedWith("Not ML coordinator")
  });

  it("The prices of the GENft and ChainAI should be set properly", async function () {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    var genftPrice = ethers.utils.parseEther("5");
    var artnftPrice = ethers.utils.parseEther("0");
    const {chainAI, deployer, sequencer, randomPerson} = await deployChainAI(trainingPrice, inferencePrice)
    const provider = waffle.provider;
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, genftPrice, 0, "a", "b", 0, 1, 1, 1)

    // Mint GENft
    // only training price should fail
    await expect(genft.mint(randomPerson.address, "c", "d", artnftPrice, { value: ethers.utils.parseEther("0.3") }))
      .to.be.revertedWith("Insufficient payment for minting");

    // only mint price should fail
    await expect(genft.mint(randomPerson.address, "c", "d", artnftPrice, { value: ethers.utils.parseEther("5") }))
      .to.be.revertedWith("Insufficient payment for minting");

    // both should succeed
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, "c", "d", artnftPrice, { value: ethers.utils.parseEther("5.3") }) )
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Set model
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)

    // Check balances
    expect(await provider.getBalance(genft.address)).to.equal(ethers.utils.parseEther("5.0"));
    expect(await provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.3"));
  });

  // todo tests:
  // - transfer ownership
});

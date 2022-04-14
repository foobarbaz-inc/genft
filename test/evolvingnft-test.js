const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("EvolvingNFT", function () {
  it("Initializes the ArtNft contract only once", async function () {
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

    // Test
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);
    await expect(childArtNft.connect(deployer).initialize(deployer.address, deployer.address, deployer.address, 0, 1, 0))
      .to.be.revertedWith("Already initialized")
  });

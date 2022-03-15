const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArtNFT", function () {
  it("Initializes the ArtNft contract only once", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const artNft = await deployArtNFT()
    const genft = await deployGENft("", artNft.address, chainAI.address, 0)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, ""))
      .to.emit(genft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "JobCreated").withArgs(1, 0, "", "", timestamp)
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);
    await expect(childArtNft.connect(deployer).initialize(deployer.address, deployer.address, deployer.address, 0))
      .to.be.revertedWith("Already initialized")
  });
  it("Creates inference job & allows the ML coordinator to set the tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const artNft = await deployArtNFT()
    const genft = await deployGENft("", artNft.address, chainAI.address, 0)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, ""))
      .to.emit(genft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "JobCreated").withArgs(1, 0, "", "", timestamp)
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);
    await expect(childArtNft.connect(randomPerson).mint(randomPerson.address, ""))
      .to.be.revertedWith("Model not yet set");
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "http://foo"))
      .to.emit(genft, "TokenUriSet", 1)
      .to.emit(chainAI, "JobSucceeded", 1)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await childArtNft.connect(randomPerson).mint(randomPerson.address, ""))
      .to.emit(childArtNft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "JobCreated").withArgs(2, 1, "http://foo", "", timestamp)
  });
});

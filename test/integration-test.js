const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration", function () {
  it("Creates training job when new GenFT minted", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft("", artNft.address, chainAI.address, 0)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, ""))
      .to.emit(genft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "JobCreated").withArgs(1, 0, "", "", timestamp)
  });
  it("Updates token URI when training completes", async function () {
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
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "http://foo"))
      .to.emit(genft, "TokenUriSet", 1, "http://foo")
      .to.emit(chainAI, "JobSucceeded", 1)
  });
});

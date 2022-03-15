const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GENft", function () {
  it("Clones a new instance of ArtNFT when you mint a GENft token", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft("", artNft.address, chainAI.address, 0)
    expect(await genft.mint(randomPerson.address, ""))
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
  });
  it("Blocks non ML coordinator from setting tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    const artNft = await deployArtNFT()
    const genft = await deployGENft("", artNft.address, chainAI.address, 0)
    await expect(genft.connect(sequencer).setDataLocation(1, ""))
      .to.be.revertedWith("Not ML coordinator")
  });
});

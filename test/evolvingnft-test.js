const { deployChainAIV2, deployEvolvingNFT, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("EvolvingNFT", function () {
  it("Kicks off a Job when EvolvingNFT minted and transferred", async function () {
    // Setup
    const { chainAIv2, deployer, sequencer, randomPerson } = await deployChainAIV2(0);
    await chainAIv2.connect(deployer).addSequencer(sequencer.address)
    const evolvingNft = await deployEvolvingNFT(
      deployer.address, chainAIv2.address, 0, 0, "arweave://gpt-j")
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Mint EvolvingNft
    expect(await evolvingNft.connect(randomPerson).mint(randomPerson.address, "hello my name is sam"))
      .to.emit(evolvingNft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAIv2, "JobCreated").withArgs(
        1, 2, randomPerson.address.toLowerCase(), "arweave://gpt-j", 2,
        "hello my name is sam", 0, 1, timestamp)

    // Re run inference upon a transfer
    expect(await evolvingNft.connect(randomPerson).transferFrom(randomPerson.address, sequencer.address, 1))
      .to.emit(evolvingNft, "Transfer").withArgs(randomPerson.address, sequencer.address, 1)
      .to.emit(chainAIv2, "JobCreated").withArgs(
        2, 2, sequencer.address.toLowerCase(), "arweave://gpt-j", 2,
        "hello my name is sam", 0, 1, timestamp + 1)
  });
});

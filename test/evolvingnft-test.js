const { deployChainAIV2, deployEvolvingNFT, deployTextConditionalImageGeneration, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("EvolvingNFT", function () {
  it("Kicks off a Job when EvolvingNFT minted and transferred, tokenURI set correctly", async function () {
    // Setup
    const { chainAIv2, deployer, sequencer, randomPerson } = await deployChainAIV2(0);
    await chainAIv2.connect(deployer).addSequencer(sequencer.address)
    const textConditionalImageGeneration = await deployTextConditionalImageGeneration(
      deployer.address, deployer.address, chainAIv2.address, true, 0, "arweave://gpt-j"
    )
    await chainAIv2.connect(deployer).addModel(textConditionalImageGeneration.address)
    const evolvingNft = await deployEvolvingNFT(
      deployer.address, textConditionalImageGeneration.address, 0, "arweave://loading")
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Mint EvolvingNft
    //var callbackFxn =
    expect(await evolvingNft.connect(randomPerson).mint(randomPerson.address, "hello my name is sam"))
      .to.emit(evolvingNft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      //.to.emit(chainAIv2, "JobCreated").withArgs([[0, 1, timestamp, 1, evolvingNft.address], 1, 0, randomPerson.address.toLowerCase()])
      .to.emit(chainAIv2, "JobCreated").withArgs(
        1, 0, randomPerson.address.toLowerCase(), "arweave://gpt-j", 2,
        "hello my name is sam", 0, 1, timestamp)

    // ChainAI can set the output upon job completion
    var abiCoder = ethers.utils.defaultAbiCoder;
    var result = abiCoder.encode(['string'], ["arweave://nft"]);
    expect(await chainAIv2.connect(sequencer).updateJobStatus(1, 2, result))
      .to.emit(chainAIv2, "JobSucceeded").withArgs(1)
      .to.emit(evolvingNft, "TokenUriSet").withArgs(1, "arweave://nft")

    // Re run inference upon a transfer
    expect(await evolvingNft.connect(randomPerson).transferFrom(randomPerson.address, sequencer.address, 1))
      .to.emit(evolvingNft, "Transfer").withArgs(randomPerson.address, sequencer.address, 1)
      .to.emit(chainAIv2, "JobCreated").withArgs(
        2, 0, sequencer.address.toLowerCase(), "arweave://gpt-j", 2,
        "hello my name is sam", 0, 1, timestamp + 2)

    // ChainAI can set the output upon job completion
    var abiCoder = ethers.utils.defaultAbiCoder;
    var result = abiCoder.encode(['string'], ["arweave://nft2"]);
    expect(await chainAIv2.connect(sequencer).updateJobStatus(2, 2, result))
      .to.emit(chainAIv2, "JobSucceeded").withArgs(2)
      .to.emit(evolvingNft, "TokenUriSet").withArgs(1, "arweave://nft2")
  });
});

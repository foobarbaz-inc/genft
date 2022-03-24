const { deployChainAI, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("ChainAI", function () {
  it("Should allow the deployer to add a sequencer", async function () {
    const {chainAI, deployer, sequencer, randomPerson} = await deployChainAI(0, 0)
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    expect(await chainAI.sequencers(sequencer.address)).to.be.true;
    await expect(chainAI.connect(randomPerson).addSequencer(randomPerson.address))
      .to.be.revertedWith("Only owner allowed");
  });

  it("Should allow the deployer to change inference & training prices", async function () {
    const {chainAI, deployer, sequencer, randomPerson} = await deployChainAI(0, 0)
    var newInferencePrice = ethers.utils.parseEther("0.1");
    var newTrainingPrice = ethers.utils.parseEther("0.3");
    await chainAI.connect(deployer).updateInferencePrice(newInferencePrice);
    expect(await chainAI.inferencePrice()).to.equal(newInferencePrice);
    await expect(chainAI.connect(randomPerson).updateInferencePrice(newTrainingPrice))
      .to.be.revertedWith("Only owner allowed");
    await chainAI.connect(deployer).updateTrainingPrice(newTrainingPrice);
    expect(await chainAI.trainingPrice()).to.equal(newTrainingPrice);
    await expect(chainAI.connect(randomPerson).updateTrainingPrice(newInferencePrice))
      .to.be.revertedWith("Only owner allowed");
  });

  it("Should add the correct prices from inference and training callers", async function() {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    const {chainAI, deployer, sequencer, randomPerson} = await deployChainAI(trainingPrice, inferencePrice)
    const provider = waffle.provider;
    
    // Not enough paid
    await expect(chainAI.connect(randomPerson).startInferenceJob(0, 0, 0, ["a"], "b", 1))
      .to.be.revertedWith("Insufficient payment for inference");
    
    // Enough paid
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await chainAI.connect(randomPerson).startInferenceJob(0, 1, 2, ["a"], "b", 1, { value: ethers.utils.parseEther("0.1") }))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(1, 0, 0, 1, 2, ["a"], "b", timestamp)
    expect(await provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.1"));

    // Not enough paid
    await expect(chainAI.connect(randomPerson).startTrainingJob(0, 2, ["a", "b", "c", "d"], [0, 1, 1, 1], 1))
      .to.be.revertedWith("Insufficient payment for training");
    
    // Not enough paid
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    await expect(chainAI.connect(randomPerson).startTrainingJob(0, 2, ["a", "b", "c", "d"], [0, 1, 1, 1], 1, { value: ethers.utils.parseEther("0.1") }))
      .to.be.revertedWith("Insufficient payment for training");

    // Enough paid
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await chainAI.connect(randomPerson).startTrainingJob(0, 2, ["a", "b", "c", "d"], [0, 1, 1, 1], 1, { value: ethers.utils.parseEther("0.3") }))
      .to.emit(chainAI, "TrainingJobCreated").withArgs(2, 0, 0, 2, ["a", "b", "c", "d"], [0, 1, 1, 1], timestamp)
    expect(await provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.4"));
  });   
});

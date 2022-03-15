const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");

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
});

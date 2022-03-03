const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increase_time(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

describe("ChainAI", function () {
  async function deploy() {
    const [deployer, sequencer, randomPerson] = await ethers.getSigners()
    const ChainAIFactory = await ethers.getContractFactory("ChainAI");
    const chainAI = await ChainAIFactory.deploy(0, 0);
    await chainAI.deployed()
    return {
      chainAI,
      deployer,
      sequencer,
      randomPerson
    }
  }
  it("Should allow the deployer to add a sequencer", async function () {
    const {chainAI, deployer, sequencer, randomPerson} = await deploy()
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    expect(await chainAI.sequencers(sequencer.address)).to.be.true;
    await expect(chainAI.connect(randomPerson).addSequencer(randomPerson.address))
      .to.be.revertedWith("Only owner allowed");
  });
  it("Should allow the deployer to change inference & training prices", async function () {
    const {chainAI, deployer, sequencer, randomPerson} = await deploy()
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

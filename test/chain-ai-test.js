const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increase_time(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

describe("ChainAI", function () {
  async function deployChainAI(trainingPrice, inferencePrice) {
    const [deployer, sequencer, randomPerson] = await ethers.getSigners()
    const ChainAIFactory = await ethers.getContractFactory("ChainAI");
    const chainAI = await ChainAIFactory.deploy(trainingPrice, inferencePrice);
    await chainAI.deployed()
    return {
      chainAI,
      deployer,
      sequencer,
      randomPerson
    }
  }
  async function deployArtNFT() {
    const ArtNftFactory = await ethers.getContractFactory("ArtNFT");
    const artNft = await ArtNftFactory.deploy();
    await artNft.deployed()
    return artNft
  }
  async function deployGENft(baseModelLocation, referenceChild, mlCoordinator, price) {
    const GENftFactory = await ethers.getContractFactory("GENft");
    const genft = await GENftFactory.deploy(baseModelLocation, referenceChild, mlCoordinator, price);
    await genft.deployed()
    return genft
  }
  async function getSetTokenURI(contract, tokenId, tokenURI) {
    var calldatasVars = [tokenId, tokenURI];
    var calldata = await contract.interface.encodeFunctionData("setTokenURI", calldatasVars);
    return calldata
  }
  // TESTING CHAIN AI BASIC FUNCTIONS
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
  // TESTING GENFT BASIC FUNCTIONS
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
    await expect(genft.connect(sequencer).setTokenURI(1, ""))
      .to.be.revertedWith("Not ML coordinator")
  });
  // TESTING ARTNFT BASIC FUNCTIONS
  it("Initializes the ArtNft contract only once", async function () {

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
    var calldata = await getSetTokenURI(genft, 1, "http://foo");
    console.log("calldata test");
    console.log(calldata);
    expect(await deployer.sendTransaction({
      to: genft.address,
      data: calldata
    }))
      .to.emit(genft, "TokenUriSet").withArgs(1, "testing");
    console.log('here')
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await childArtNft.connect(randomPerson).mint(randomPerson.address, ""))
      .to.emit(childArtNft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "JobCreated").withArgs(2, 1, "http://foo", "", timestamp)
  });
  // INTEGRATION TESTING -- CROSS CONTRACT LOGIC
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
      .to.emit(genft, "TokenUriSet", 1)
      .to.emit(chainAI, "JobSucceeded", 1)
  });
});

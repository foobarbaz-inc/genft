const { deployChainAI, deployArtNFT, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("ArtNFT", function () {
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
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)
  
    // Test
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);
    await expect(childArtNft.connect(deployer).initialize(deployer.address, deployer.address, deployer.address, 0, 1, 0))
      .to.be.revertedWith("Already initialized")
  });

  it("Creates inference job & allows the ML coordinator to set the tokenURI", async function () {
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
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Get created ArtNFT
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);

    // Test when model is not set
    await expect(childArtNft.connect(randomPerson).mint(randomPerson.address, "e"))
      .to.be.revertedWith("Model not yet set");

    // Set model
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)

    // Test when model is set
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await childArtNft.connect(randomPerson).mint(randomPerson.address, "e"))
      .to.emit(childArtNft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, "trainedModelLoc", "e", timestamp)
  });
  
  it("The prices of the ArtNFT and ChainAI should be set properly", async function () {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    var genftPrice = ethers.utils.parseEther("0");
    var artnftPrice = ethers.utils.parseEther("1");
    const {chainAI, deployer, sequencer, randomPerson} = await deployChainAI(trainingPrice, inferencePrice)
    const provider = waffle.provider;
    await chainAI.connect(deployer).addSequencer(sequencer.address)
    const artNft = await deployArtNFT()
    const genft = await deployGENft(artNft.address, chainAI.address, genftPrice, 0, "a", "b", 0, 1, 1, 1)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Mint GENft
    expect(await genft.mint(randomPerson.address, "c", "d", artnftPrice, { value: ethers.utils.parseEther("0.3") }) )
      .to.emit(genft, "ArtNftCreated")
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, "c", "a", "b", "d", 0, 1, 1, 1, timestamp)

    // Get created ArtNFT
    var childContract = await genft.tokenIdToChildContract(1);
    var childArtNft = new ethers.Contract(childContract, artNft.interface, deployer);

    // Set model
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)

    // Mint ArtNFT
    // only inference price should fail
    await expect(childArtNft.connect(randomPerson).mint(randomPerson.address, "e", { value: ethers.utils.parseEther("0.1") }))
      .to.be.revertedWith("Insufficient payment for minting");

    // only mint price should fail
    await expect(childArtNft.connect(randomPerson).mint(randomPerson.address, "e", { value: ethers.utils.parseEther("1.0") }))
      .to.be.revertedWith("Insufficient payment for minting");
    
    // both should succeed
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await childArtNft.connect(randomPerson).mint(randomPerson.address, "e", { value: ethers.utils.parseEther("1.1") }))
      .to.emit(childArtNft, "Transfer").withArgs(
        '0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, "trainedModelLoc", "e", timestamp)

    // balances should be correct
    expect(await provider.getBalance(childArtNft.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.4"));
  });
});

const { deployChainAI, deployGENft, getSetTokenURI } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("GENft", function () {
  it("Minting a GENft should start training and assign ownership", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    expect(await genft.mint(randomPerson.address, "c", "d", "e", "f"))
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, 1, ["e", "c", "a", "f"], [0, 1, 2, 3], timestamp)

    // GAN storage loc should be set
    expect((await genft.tokenIdToModelInfo(1))[1]).to.equal("d")
  });

  it("Minting a GENft without a style should not require training", async function () {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(trainingPrice, inferencePrice);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    expect(await genft.mint(randomPerson.address, "", "d", "e", "f"))
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)

    // GAN storage loc should be set
    expect((await genft.tokenIdToModelInfo(1))[1]).to.equal("d")

    // trained style loc should be set
    expect((await genft.tokenIdToModelInfo(1))[0]).to.equal("")
  });

  it("Training complete should update model info", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    await genft.mint(randomPerson.address, "c", "d", "e", "f");

    // token uri should be set
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)

    // data location should be set
    expect((await genft.tokenIdToModelInfo(1))[0]).to.equal("trainedModelLoc")
  });

  it("Run should start the appropriate job", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    await genft.mint(randomPerson.address, "c", "d", "e", "f");
    await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc");
    
    // Test that inference is called with the correct arguments
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "g"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, 1, 2, 0, ["d", "trainedModelLoc"], "g", timestamp);
  });

  it("Run should only be callable by the token owner", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    await genft.mint(randomPerson.address, "c", "d", "e", "f");
    await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc");
    
    await expect(genft.connect(sequencer).run(1, "g"))
      .to.be.revertedWith("Not AI owner")
  });

  it("Run should error if the model is not yet trained", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    await genft.mint(randomPerson.address, "c", "d", "e", "f");
    
    await expect(genft.connect(randomPerson).run(1, "g"))
      .to.be.revertedWith("Model not yet trained")
  });

  it("Run should save all outputs of multiple calls", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)

    // Test mint
    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    await genft.mint(randomPerson.address, "c", "d", "e", "f");
    await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc");
    
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "g"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, 1, 2, 0, ["d", "trainedModelLoc"], "g", timestamp);

    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "h"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(3, 0, 1, 2, 1, ["d", "trainedModelLoc"], "h", timestamp);
  });

  it("Run should save all outputs of multiple calls, keeping separate GENfts separate", async function () {
    // Setup
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, 0, 1, 2, "a", 0, 1, 2, 3)

    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    // Mint 1
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, "c", "d", "e", "f"))
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, 1, ["e", "c", "a", "f"], [0, 1, 2, 3], timestamp)
    expect(await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc1"))
      .to.emit(genft, "TokenUriSet").withArgs(1, "trainedModelLoc1")
      .to.emit(chainAI, "JobSucceeded").withArgs(1)
    
    // Inference 1, 1
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "g"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, 1, 2, 0, ["d", "trainedModelLoc1"], "g", timestamp);
    
    // Mint 2
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(sequencer.address, "cc", "dd", "ee", "ff"))
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', sequencer.address, 2)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(3, 0, 1, 2, ["ee", "cc", "a", "ff"], [0, 1, 2, 3], timestamp)
    expect(await chainAI.connect(sequencer).updateJobStatus(3, 2, "trainedModelLoc2"))
      .to.emit(genft, "TokenUriSet").withArgs(2, "trainedModelLoc2")
      .to.emit(chainAI, "JobSucceeded").withArgs(3)
    
    // Inference 2, 1
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(sequencer).run(2, "gg"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(4, 0, 1, 2, 0, ["dd", "trainedModelLoc2"], "gg", timestamp);

    // Inference 1, 2
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "i"))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(5, 0, 1, 2, 1, ["d", "trainedModelLoc1"], "i", timestamp);
    

    // Check that inferenceJobIds is as expected for everything
    //expect((await genft.tokenIdToModelInfo(1))[2][0]).to.equal(2)
    //expect((await genft.tokenIdToModelInfo(1))[2][1]).to.equal(5)
    //expect((await genft.tokenIdToModelInfo(2))[2][0]).to.equal(3)
    //expect((await genft.tokenIdToModelInfo(1))[2]).to.equal([2, 5]);
    var jobIds = await genft.getModelInfoJobIds(1);
    expect(jobIds[0]).to.equal(2);
    expect(jobIds[1]).to.equal(5);
    var jobIds = await genft.getModelInfoJobIds(2);
    expect(jobIds[0]).to.equal(4);
  });

  it("Mint should handle training prices properly", async function () {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    var genftPrice = ethers.utils.parseEther("5");
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(trainingPrice, inferencePrice);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, genftPrice, 1, 2, "a", 0, 1, 2, 3)

    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    // Mint
    // Only training price should fail
    await expect(genft.mint(randomPerson.address, "c", "d", "e", "f", { value: ethers.utils.parseEther("0.3") }))
      .to.be.revertedWith("Insufficient payment for minting");

    // Only mint price should fail
    await expect(genft.mint(randomPerson.address, "c", "d", "e", "f", { value: ethers.utils.parseEther("5") }))
      .to.be.revertedWith("Insufficient payment for minting");
    
    // Both should succeed
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.mint(randomPerson.address, "c", "d", "e", "f", { value: ethers.utils.parseEther("5.3") }))
      .to.emit(genft, "Transfer").withArgs('0x0000000000000000000000000000000000000000', randomPerson.address, 1)
      .to.emit(chainAI, "TrainingJobCreated").withArgs(1, 0, 1, 1, ["e", "c", "a", "f"], [0, 1, 2, 3], timestamp)

    // Check balances
    expect(await ethers.provider.getBalance(genft.address)).to.equal(ethers.utils.parseEther("5.0"));
    expect(await ethers.provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.3"));
  });

  it("Run should handle inference price properly", async function () {
    // Setup
    var inferencePrice = ethers.utils.parseEther("0.1");
    var trainingPrice = ethers.utils.parseEther("0.3");
    var genftPrice = ethers.utils.parseEther("5");
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(trainingPrice, inferencePrice);
    await chainAI.connect(deployer).addSequencer(sequencer.address)

    /*
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    */

    const genft = await deployGENft(chainAI.address, genftPrice, 1, 2, "a", 0, 1, 2, 3)

    /*
        address to,
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    */
    // Mint
    await genft.mint(randomPerson.address, "c", "d", "e", "f", { value: ethers.utils.parseEther("5.3") });
    await chainAI.connect(sequencer).updateJobStatus(1, 2, "trainedModelLoc")

    // Inference
    // below inference price should fail
    await expect(genft.connect(randomPerson).run(1, "g", { value: ethers.utils.parseEther("0.01") }))
      .to.be.revertedWith("Insufficient payment for inference");
    
    // above should pass
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    expect(await genft.connect(randomPerson).run(1, "g", { value: ethers.utils.parseEther("0.1") }))
      .to.emit(chainAI, "InferenceJobCreated").withArgs(2, 0, 1, 2, 0, ["d", "trainedModelLoc"], "g", timestamp);
  
    // Check balances
    expect(await ethers.provider.getBalance(genft.address)).to.equal(ethers.utils.parseEther("5.0"));
    expect(await ethers.provider.getBalance(chainAI.address)).to.equal(ethers.utils.parseEther("0.4"));
  });

  it("Blocks non ML coordinator from setting tokenURI", async function () {
    const { chainAI, deployer, sequencer, randomPerson } = await deployChainAI(0, 0);
    var genftPrice = ethers.utils.parseEther("5");
    const genft = await deployGENft(chainAI.address, genftPrice, 1, 2, "a", 0, 1, 2, 3)
    await expect(genft.connect(sequencer).setDataLocation(1, ""))
      .to.be.revertedWith("Not ML coordinator")
  });
});

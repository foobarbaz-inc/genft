const { ethers } = require("hardhat");

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

async function deployChainAIV2(inferencePrice) {
  const [deployer, sequencer, randomPerson] = await ethers.getSigners()
  const ChainAIV2Factory = await ethers.getContractFactory("ChainAIV2");
  const chainAIv2 = await ChainAIV2Factory.deploy(inferencePrice);
  await chainAIv2.deployed()
  return {
    chainAIv2,
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

async function deployEvolvingNFT(
  owner,
  mlCoordinator,
  price,
  modelCategory,
  model,
  loadingImg
) {
  const EvolvingNftFactory = await ethers.getContractFactory("EvolvingNFT");
  const evolvingNft = await EvolvingNftFactory.deploy(
    owner,
    mlCoordinator,
    price,
    modelCategory,
    model,
    loadingImg
  );
  await evolvingNft.deployed()
  return evolvingNft
}

async function deployGENft(
  referenceChild,
  mlCoordinator,
  price,
  dataType,
  modelStorageLocation,
  initFnStorageLocation,
  optimizer,
  learning_rate_x1e8,
  batch_size,
  epochs
) {
  const GENftFactory = await ethers.getContractFactory("GENft");
  const genft = await GENftFactory.deploy(
    referenceChild,
    mlCoordinator,
    price,
    dataType,
    modelStorageLocation,
    initFnStorageLocation,
    optimizer,
    learning_rate_x1e8,
    batch_size,
    epochs);
  await genft.deployed()
  return genft
}

// ERC-721
async function getSetTokenURI(contract, tokenId, tokenURI) {
  var calldatasVars = [tokenId, tokenURI];
  var calldata = await contract.interface.encodeFunctionData("setTokenURI", calldatasVars);
  return calldata
}

async function increase_time(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

module.exports = { deployChainAI, deployChainAIV2, deployArtNFT, deployEvolvingNFT, deployGENft, getSetTokenURI };

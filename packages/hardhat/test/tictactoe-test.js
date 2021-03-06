const { deployChainAIV2, deployTicTacToe, deployRLAgent } = require("./utils.js");
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

function makeMove(xLoc, yLoc) {
  var abiCoder = ethers.utils.defaultAbiCoder;
  return abiCoder.encode(['uint256', 'uint256'], [xLoc, yLoc]);
}

describe("TicTacToe", function () {
  it("Allows two players to play tic tac toe (no AI)", async function () {
    // Setup
    const { chainAIv2, deployer, sequencer, randomPerson } = await deployChainAIV2(0);
    await chainAIv2.connect(deployer).addSequencer(sequencer.address)
    const rlAgent = await deployRLAgent(
      deployer.address, deployer.address, chainAIv2.address, true, 0, "arweave://tictactoe"
    )
    await chainAIv2.connect(deployer).addModel(rlAgent.address)
    const tictactoe = await deployTicTacToe(rlAgent.address, 0)

    // Create new game
    expect(await tictactoe.connect(randomPerson).createGame(false))
      .to.emit(tictactoe, "GameCreated").withArgs(1, randomPerson.address)

    // fails if tries to join the game as autoplay
    await expect(tictactoe.connect(sequencer).joinGame(1, true))
      .to.be.revertedWith("Cannot choose autoplay")

    // allow someone else to join the game
    expect(await tictactoe.connect(sequencer).joinGame(1, false))
      .to.emit(tictactoe, "GameJoined").withArgs(1, sequencer.address)

    // fails if someone else tries to join now
    await expect(tictactoe.connect(deployer).joinGame(1, false))
      .to.be.revertedWith("Game already started")

    // won't allow player two to start
    var move = makeMove(0, 0);
    await expect(tictactoe.connect(sequencer).move(1, move))
      .to.be.revertedWith("Not your turn")

    // allows player one to make a move now
    expect(await tictactoe.connect(randomPerson).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, randomPerson.address, 0, 0, 'X')

    // stops player two from invalid move
    await expect(tictactoe.connect(sequencer).move(1, move))
      .to.be.revertedWith("Spot already taken")

    // allows player two to make a move now
    var move = makeMove(1, 1);
    expect(await tictactoe.connect(sequencer).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, sequencer.address, 1, 1, 'O')

    // player one goes in the top right corner
    var move = makeMove(0, 2);
    expect(await tictactoe.connect(randomPerson).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, randomPerson.address, 0, 2, 'X')

    // player two moves somewhere out of bounds
    var move = makeMove(1, 3);
    await expect(tictactoe.connect(sequencer).move(1, move))
      .to.be.revertedWith("Out of bounds")

    // shaken by their mistake, they miss the W condition & move someplace random
    var move = makeMove(1, 2);
    expect(await tictactoe.connect(sequencer).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, sequencer.address, 1, 2, 'O')

    // player one wins!
    var move = makeMove(0, 1);
    expect(await tictactoe.connect(randomPerson).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, randomPerson.address, 0, 1, 'X')
      .to.emit(tictactoe, "GameOver").withArgs(1, 3)

    var gameInfo = await tictactoe.games(1)
    expect(gameInfo.winner).to.equal(randomPerson.address)

  });
  it("Allows a player to play the AI autoplayer", async function () {
    // Setup
    const { chainAIv2, deployer, sequencer, randomPerson } = await deployChainAIV2(0);
    await chainAIv2.connect(deployer).addSequencer(sequencer.address)
    const rlAgent = await deployRLAgent(
      deployer.address, deployer.address, chainAIv2.address, true, 0, "arweave://tictactoe"
    )
    await chainAIv2.connect(deployer).addModel(rlAgent.address)
    const tictactoe = await deployTicTacToe(rlAgent.address, 0)

    // Create new game with autoplayer
    expect(await tictactoe.connect(randomPerson).createGame(true))
      .to.emit(tictactoe, "GameCreated").withArgs(1, randomPerson.address)
      .to.emit(tictactoe, "GameJoined").withArgs(1, rlAgent.address)

    // allow player one to start
    var blockNumber = await ethers.provider.getBlockNumber();
    var timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp + 1;
    var move = makeMove(1, 1);
    expect(await tictactoe.connect(randomPerson).move(1, move))
      .to.emit(tictactoe, "Move").withArgs(1, randomPerson.address, 1, 1, 'X')
      .to.emit(chainAIv2, "JobCreated").withArgs(
        1, 3, tictactoe.address.toLowerCase(), "arweave://tictactoe", 2,
        "", 2, 0, timestamp)

    // ChainAI can set the output upon job completion
    var move = makeMove(0, 1);
    expect(await chainAIv2.connect(sequencer).updateJobStatus(1, 2, move))
      .to.emit(chainAIv2, "JobSucceeded").withArgs(1)
      // .to.emit(tictactoe, "Move").withArgs(1, tictactoe.address, 0, 1, 'O')
  });
});

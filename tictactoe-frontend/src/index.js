import { ethers } from "ethers"
import TicTacToeJSON from './../contracts/TicTacToe.json'
//import ChainAIV2JSON from './../contracts/ChainAIV2.json'


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const tictactoeAddress = '0x7030F1a0710Ed00e2B648a798057b3f6B03D9B31'
//const chainAIaddress = '0x2AA101B3734e9868F4AD0cB8e97D291bA4E7dD58'
const contract = new ethers.Contract(tictactoeAddress, TicTacToeJSON.abi, provider);
//const chainAIcontract = new ethers.Contract(chainAIaddress, ChainAIV2JSON.abi, provider);
// Read on-chain data when clicking a button
// getGreeting.addEventListener('click', async () => {
//   greetingMsg.innerText = await contract.greet()
// })

// Kick things off
go()

async function fetchOwnedTokenCount() {
  var tokensOwned = await contract.connect(signer).balanceOf(signer.getAddress());
  return tokensOwned
}

async function fetchedOwnedTokenIds() {
  var address = await signer.getAddress();
  var numTokensOwned = await contract.connect(signer).balanceOf(address);
  var tokensOwned = []
  for (var i = 0; i < numTokensOwned; i++) {
    var tokenId = await contract.tokenOfOwnerByIndex(address, i);
    tokensOwned.push(tokenId);
  }
  return tokensOwned;
}

function seeAvailableGames(games) {
  var availableGameIds = [];
  for (var i = 0; i < games.length; i++) {
    if (games[i].status == 0) {
      availableGameIds.push(parseInt(games[i].id.toString()));
    }
  }
  return availableGameIds;
}

async function refreshGameList() {
  var latestGameIdNum = await contract.latestGameId();
  var latestGameId = parseInt(latestGameIdNum.toString());
  console.log('latestGameId');
  console.log(latestGameId);
  var games = [];
  for (var i = 1; i < latestGameId + 1; i++) {
    var game = await contract.games(i);
    games.push(game);
  }
  console.log("games");
  console.log(games);
  return games;
}

async function go() {
  await connectToMetamask()
  console.log("TicTacToe loading")
  // fetch model modelConfigLocation
  var games = await refreshGameList();
  var availableGameIds = seeAvailableGames(games);
  valueOutput.innerText =  availableGameIds.join(", ")
}

async function connectToMetamask() {
  try {
    console.log("Signed in", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}

startGame.addEventListener("click", async () => {
  //console.log("inputGameId: ", inputGameId.value)
  try {
    // todo add autoplay optionally
    await contract.connect(signer).createGame(false);
  } catch (error) {
    console.log(error)
  }
})

joinGame.addEventListener("click", async () => {
  console.log("inputGameId: ", inputGameId.value)
  try {
    await contract.connect(signer).joinGame(parseInt(inputGameId.value), false);
  } catch (error) {
    console.log(error)
  }
})

viewGame.addEventListener("click", async () => {
  console.log("inputGameId2: ", inputGameId2.value)
  await refreshGameGallery(parseInt(inputGameId2.value));
})


async function refreshGameGallery(gameId) {
  var game = await contract.games(gameId);
  var gameBoard = await contract.getGameBoard(gameId);
  console.log("gameBoard");
  console.log(gameBoard);
  $('#gameGallery').empty();
  var rowDivider = '________';
  $('#gameGallery').append('<span>'+rowDivider+'</span><br>');
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      if (gameBoard[i][j] == 0) {
        var symbol = '|     |';
      } else if (gameBoard[i][j] == 1) {
        var symbol = '|  X  |';
      } else {
        var symbol = '|  O  |';
      }
      $('#gameGallery').append('<span>'+symbol+'</span>');
    }
    $('#gameGallery').append('<br><span>'+rowDivider+'</span><br>');
  }
  if ((game.status.toString() == '0') || (game.status.toString() == '1')) {
    $('#gameGallery').append('<input type="text" id="xLoc"><input type="text" id="yLoc"><button id="move">Move</button><br><br>');
    move.addEventListener("click", async () => {
      console.log("xLoc: ", xLoc.value);
      console.log("yLoc: ", yLoc.value);
      try {
        await contract.connect(signer).move(gameId, parseInt(xLoc.value), parseInt(yLoc.value));
      } catch (error) {
        console.log(error)
      }
    })
  } else if (game.status.toString() == '2') {
    $('#gameGallery').append('<span>GAME OVER: DRAW</span>')
  } else if (game.status.toString() == '3') {
    $('#gameGallery').append('<span>GAME OVER: PLAYER ONE WINS</span>')
  } else {
    $('#gameGallery').append('<span>GAME OVER: PLAYER TWO WINS</span>')
  }
}

const moveFilter = {
  address: tictactoeAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("Move(uint256,address,uint256,uint256,string)")
  ]
}
provider.on(moveFilter, async () => {
  // pass in game ID
  await refreshGameGallery(1);
});

const gameOverFilter = {
  address: tictactoeAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("GameOver(uint256,uint256)")
  ]
}
provider.on(gameOverFilter, async () => {
  // pass in game ID
  await refreshGameGallery(1);
});


const newGameFilter = {
  address: tictactoeAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("GameCreated(uint256,address)")
  ]
}
provider.on(newGameFilter, async () => {
  var games = await refreshGameList();
  var availableGameIds = seeAvailableGames(games);
  valueOutput.innerText =  availableGameIds.join(", ")
});

const joinedGameFilter = {
  address: tictactoeAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("GameJoined(uint256,address)")
  ]
}
provider.on(joinedGameFilter, async () => {
  // pass in game ID & also check that address
  await refreshGameGallery(1);
});

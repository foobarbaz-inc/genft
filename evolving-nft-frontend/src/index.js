import { ethers } from "ethers"
import EvolvingNFTJSON from '../../artifacts/contracts/EvolvingNFT.sol/EvolvingNFT.json'
import ChainAIV2JSON from '../../artifacts/contracts/ChainAIV2.sol/ChainAIV2.json'


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const evolvingNftAddress = '0xDAFf287e2aFD377514bB420bEFA26224d461adf2'
const chainAIaddress = '0x48864A4eD5e5410D4f1944b8FD7452827da05AAE'
const contract = new ethers.Contract(evolvingNftAddress, EvolvingNFTJSON.abi, provider);
const chainAIcontract = new ethers.Contract(chainAIaddress, ChainAIV2JSON.abi, provider);
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
  var numTokensOwned = await contract.connect(signer).balanceOf(signer.getAddress());
  var numTokens = 0
  var tokensOwned = []
  //var totalSupply = await contract.currentTokenId()
  var totalSupply = 5;
  for (var i = 1; i <= totalSupply; i++) {
    var owned = await contract.connect(signer).ownerOf(i)
    if (owned) {
      numTokens++
      tokensOwned.push(i)
    }
    if (numTokens == numTokensOwned) {
      break;
    }
  }
  return tokensOwned;
}

async function go() {
  await connectToMetamask()
  console.log("Evolving NFT loading")
  valueOutput.innerText = await fetchOwnedTokenCount() + " Evolving NFTs"
  //valueOutput.innerText = "0 Evolving NFTs"
}

async function connectToMetamask() {
  try {
    console.log("Signed in", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }

submit.addEventListener("click", async () => {
  console.log("input: ", input.value)
  try {
    await contract.connect(signer).mint(signer.getAddress(), input.value)
  } catch (error) {
    console.log(error)
  }
})

transferSubmit.addEventListener("click", async () => {
  console.log("tokenID: ", tokenId.value)
  console.log("address: ", address.value)
  try {
    await contract.connect(signer).transferFrom(signer.getAddress(), address.value, tokenId.value)
  } catch (error) {
    console.log(error)
  }
})

showNfts.addEventListener("click", async () => {
  var tokenIds = await fetchedOwnedTokenIds()
  console.log("tokens owned", tokenIds)
  tokenUris = []
  for (var i = 0; i < tokenIds.length; i++) {
    console.log("fetching URI for id ", tokenIds[i])
    uri = await contract.connect(signer).tokenURI(tokenIds[i])
    console.log('uri ', uri)
    tokenUris.push(uri)
  }
})

filter = {
  address: evolvingNftAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("Transfer(address,address,uint256)"),

  ]
}
provider.on(filter, async () => {
  valueOutput.innerText = await fetchOwnedTokenCount() + " Evolving NFTs"
})
}

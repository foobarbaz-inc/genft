import { ethers } from "ethers"
import EvolvingNFTJSON from './../contracts/EvolvingNFT.json'
import ChainAIV2JSON from './../contracts/ChainAIV2.json'


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

//const evolvingNftAddress = '0x8F8758858137a6FAb6c2001d930d690fe037BA18'
//const chainAIaddress = '0x2AA101B3734e9868F4AD0cB8e97D291bA4E7dD58'
const evolvingNftAddress = "0xbf1BF553cB5841a559e65A869d0aD1CDaA97f39C";
const chainAIaddress = "0xD54C1f63601cDEcA4553E5C90fD68D1ECc2351a9";
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
  var address = await signer.getAddress();
  var numTokensOwned = await contract.connect(signer).balanceOf(address);
  var tokensOwned = []
  for (var i = 0; i < numTokensOwned; i++) {
    var tokenId = await contract.tokenOfOwnerByIndex(address, i);
    tokensOwned.push(tokenId);
  }
  return tokensOwned;
}

async function go() {
  await connectToMetamask()
  console.log("Evolving NFT loading")
  valueOutput.innerText = await fetchOwnedTokenCount() + " Evolving NFTs"
  //valueOutput.innerText = "0 Evolving NFTs"
  // fetch model modelConfigLocation
  var modelLocation = await contract.connect(signer).model();
  console.log("model location");
  console.log(modelLocation);
  await refreshNftGallery()
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

async function refreshNftGallery() {
  var tokenIds = await fetchedOwnedTokenIds()
  console.log("tokens owned", tokenIds)
  var tokenUris = []
  $('#nftGallery').empty();
  for (var i = 0; i < tokenIds.length; i++) {
    console.log("fetching URI for id ", tokenIds[i])
    var uri = await contract.tokenURI(tokenIds[i])
    var prompt = await contract.tokenIdToDataInput(tokenIds[i])
    //prompt = await contract.connect(signer).tokenIdToDataInput()
    $('#nftGallery').append('<div class="img_holder"><span>tokenId: '+tokenIds[i].toString()+'</span><br><span>prompt: '+prompt+'</span><br><div class="clear"></div><img src='+uri+'/></div>');
    console.log('uri ', uri)
    tokenUris.push(uri)
  }
}

showNfts.addEventListener("click", async () => {
  await refreshNftGallery();
})

const transferFilter = {
  address: evolvingNftAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("Transfer(address,address,uint256)")
  ]
}
provider.on(transferFilter, async () => {
  valueOutput.innerText = await fetchOwnedTokenCount() + " Evolving NFTs"
  await refreshNftGallery()
})

const tokenUriSetFilter = {
  address: evolvingNftAddress,
  topics: [
    // the name of the event, parentheses containing the data type of each event, no spaces
    ethers.utils.id("TokenUriSet(uint256,string)")
  ]
}
provider.on(tokenUriSetFilter, async () => {
  await refreshNftGallery()
})

import { ethers } from "ethers"
import EvolvingNFTJSON from './../contracts/EvolvingNFT.json'
import ChainAIV2JSON from './../contracts/ChainAIV2.json'


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const evolvingNftAddress = '0x845115B5272443908a3bc883024aA792F5084e55'
const chainAIaddress = '0x2AA101B3734e9868F4AD0cB8e97D291bA4E7dD58'
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
  var totalSupply = await contract.currentTokenId()
  //var totalSupply = 4;
  var address = await signer.getAddress()
  for (var i = 1; i <= totalSupply; i++) {
    var owner = await contract.connect(signer).ownerOf(i)
    console.log('owner', owner.toLowerCase())
    console.log(address.toString().toLowerCase())
    if (owner.toLowerCase() == address.toString().toLowerCase()) {
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
  // fetch model modelConfigLocation
  var modelLocation = await contract.connect(signer).model();
  console.log("model location");
  console.log(modelLocation);
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
  var tokenUris = []
  $('#nftGallery').empty();
  for (var i = 0; i < tokenIds.length; i++) {
    console.log("fetching URI for id ", tokenIds[i])
    var uri = await contract.connect(signer).tokenURI(tokenIds[i])
    //prompt = await contract.connect(signer).tokenIdToDataInput()
    $('#nftGallery').append('<div class="img_holder"><span>tokenId: '+tokenIds[i].toString()+'</span><div class="clear"></div><img src='+uri+'/></div>');
    console.log('uri ', uri)
    tokenUris.push(uri)
  }
})

const filter = {
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

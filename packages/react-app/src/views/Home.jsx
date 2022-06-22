import { useContractReader } from "eth-hooks";
import { ethers } from "ethers";
import React from "react";
import { Link } from "react-router-dom";

/**
 * web3 props can be passed from '../App.jsx' into your local view component for use
 * @param {*} yourLocalBalance balance on current network
 * @param {*} readContracts contracts from current chain already pre-loaded using ethers contract module. More here https://docs.ethers.io/v5/api/contract/contract/
 * @returns react component
 **/
function Home({ yourLocalBalance, readContracts }) {
  // you can also use hooks locally in your component of choice
  // in this case, let's keep track of 'purpose' variable from our contract
  return (
    <div>
      <div style={{ margin: 32 }}>
        Welcome to the Buffalo Labs demo.
      </div>
      <div style ={{ margin: 32 }}>
        Here we showcase an example project using the Buffalo Labs ML oracle -- EvolvingNFT, the first generative art project making use of an on-chain model. In the Contracts tab, see how you can use the Buffalo Solidity SDK to make your own generative art NFT project.
      </div>
    </div>
  );
}

export default Home;

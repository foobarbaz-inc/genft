# Buffalo Labs Oracle

## Overview

This project contains the current demo of the oracle & its client projects, EvolvingNFT and RLAgent. This is a work in progress and has not yet been audited or optimized for gas efficiency.

This is a proof of concept for an oracle which allows Solidity developers to easily use machine learning models in their smart contracts. The proof of concept demonstrates this with two projects, EvolvingNFT, which uses CLIP-guided diffusion, and TicTacToe, which uses an RL agent as an autoplayer (still in progress).


## Code Organization

All smart contracts are in the directory packages/contracts/. The most up to date version of the oracle code is in ChainAIV2.sol. This contract acts as an interface between the on-chain clients of the oracle and the off-chain inference evaluation ecosystem. It collects payment for jobs, emits an event to start the off-chain inference process, and receives updates from the off-chain sequencer when the job is complete (or if it has failed). It then handles calling the client callback function with the appropriate arguments.

Model.sol is the base class for models uploaded to the platform. A model owner will define a specific subclass or instantiate one that already exists (see the example TextConditionalImageGeneration.sol that can be used for models that take text prompts and a random seed and output images, like VQGAN + CLIP or diffusion models). Model owners can set their price, and get paid when inference is run in addition to the oracle fee.

EvolvingNFT.sol is an example of a project using the oracle to run inference. The mint(), evolve() and _beforeTokenTransfer() functions include a call to TextConditionalImageGeneration.run(), which triggers inference from the oracle when an NFT is minted or transferred to a new owner.

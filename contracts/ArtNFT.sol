//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./ChainAI.sol"; // todo make this an interface
import "./GENft.sol"; // todo make this an interface

contract ArtNFT is ERC721URIStorage {
    address private owner;
    address public mlCoordinator;
    address public parent;
    bool private initialized;
    uint256 public myTokenId;
    uint256 currentTokenId;
    uint256 price;

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId);

    constructor() ERC721("GENft", "GEN") {}

    function initialize(
        address parent_,
        address owner_,
        address mlCoordinator_,
        uint256 myTokenId_
    ) external {
        require(!initialized, "Already initialized");
        parent = parent_;
        owner = owner_;
        mlCoordinator = mlCoordinator_;
        myTokenId = myTokenId_;
        initialized = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function _calculateCallbackData(uint256 tokenId_) private pure returns (bytes memory) {
        string memory signatureInput = "setTokenURI(uint256,string)";
        bytes4 signature = bytes4(keccak256(abi.encodePacked(signatureInput)));
        bytes memory partiallyApplied = abi.encodePacked(signature, bytes32(tokenId_));
        return partiallyApplied;
    }

    // todo add optional mint gating settable by owner
    function mint(address to, string memory dataInputLocation) external payable returns (uint) {
        require(msg.value >= price, "Insufficient payment");
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        require(msg.value >= inferencePrice, "Insufficient payment for inference");
        GENft parentContract = GENft(parent);
        string memory modelStorageLocation = parentContract.tokenURI(myTokenId);
        require(
            keccak256(abi.encodePacked(modelStorageLocation)) != keccak256(abi.encodePacked("")),
            "Model not yet set"
        );
        currentTokenId++;
        _mint(to, currentTokenId);
        // todo encode setTokenURI & correct args for callback fxn & data
        bytes memory callbackData = _calculateCallbackData(currentTokenId);
        mlContract.startInferenceJob{value: inferencePrice}(
            modelStorageLocation,
            dataInputLocation,
            address(this),
            callbackData
        );
        return currentTokenId;
    }

    function setPrice(uint256 price_) external onlyOwner {
        price = price_;
    }

    function setTokenURI(uint256 tokenId_, string memory tokenURI_) external {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(tokenId_, tokenURI_);
        emit TokenUriSet(tokenId_);
    }
}

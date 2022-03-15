//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./ChainAI.sol";
import "./IMLClient.sol";
import "./GENft.sol"; // todo make this an interface

contract ArtNFT is ERC721URIStorage, IMLClient {

    address private owner;
    address public mlCoordinator;
    address public parent;
    bool private initialized;
    uint256 public myTokenId;
    uint256 currentTokenId;
    uint256 price; // This is just the price for minting, it doesn't include the price of inference

    // inference parameters
    ChainAI.JobDataType dataType;

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor() ERC721("GENft", "GEN") {}

    function initialize(
        address parent_,
        address owner_,
        address mlCoordinator_,
        uint256 myTokenId_,
        ChainAI.JobDataType dataType_
    ) external {
        require(!initialized, "Already initialized");
        parent = parent_;
        owner = owner_;
        mlCoordinator = mlCoordinator_;
        myTokenId = myTokenId_;
        initialized = true;
        dataType = dataType_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyParent() {
        require(msg.sender == parent, "Not the parent");
        _;
    }

    // todo add optional mint gating settable by owner
    function mint(address to, string memory dataInputLocation) external payable returns (uint) {
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        require(msg.value >= price + inferencePrice, "Insufficient payment for inference");
        GENft parentContract = GENft(parent);
        string memory trainedModelStorageLocation = parentContract.tokenURI(myTokenId);
        require(
            keccak256(abi.encodePacked(trainedModelStorageLocation)) != keccak256(abi.encodePacked("")),
            "Model not yet set"
        );
        currentTokenId++;
        _mint(to, currentTokenId);
        mlContract.startInferenceJob{value: inferencePrice}(
            dataType,
            trainedModelStorageLocation,
            dataInputLocation,
            currentTokenId
        );
        return currentTokenId;
    }

    function setPrice(uint256 price_) external onlyOwner {
        price = price_;
    }

    function setDataLocation(
        uint256 dataId,
        string memory dataLocation
    ) external override {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(dataId, dataLocation);
        emit TokenUriSet(dataId, dataLocation);
    }

    function changeOwner(
        address newOwner
    ) external onlyParent {
        owner = newOwner;
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

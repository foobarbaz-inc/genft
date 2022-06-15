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
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of inference

    function price() public view returns(uint256) {
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        uint256 totalPrice = mintPriceToThisContract + inferencePrice;
        return(totalPrice);
    }

    // inference parameters
    ChainAI.JobDataType dataType;

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor() ERC721("GENft", "GEN") {}

    function initialize(
        address parent_,
        address owner_,
        address mlCoordinator_,
        uint256 price_,
        uint256 myTokenId_,
        ChainAI.JobDataType dataType_
    ) external {
        require(!initialized, "Already initialized");
        parent = parent_;
        owner = owner_;
        mlCoordinator = mlCoordinator_;
        mintPriceToThisContract = price_;
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
        require(msg.value >= price(), "Insufficient payment for minting");
        GENft parentContract = GENft(parent);
        string memory trainedModelStorageLocation = parentContract.tokenURI(myTokenId);
        require(
            keccak256(abi.encodePacked(trainedModelStorageLocation)) != keccak256(abi.encodePacked("")),
            "Model not yet set"
        );
        currentTokenId++;
        _mint(to, currentTokenId);
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        mlContract.startInferenceJob{value: inferencePrice}(
            dataType,
            currentTokenId,
            trainedModelStorageLocation,
            dataInputLocation,
            currentTokenId
        );
        return currentTokenId;
    }

    function setMintPriceToThisContract(uint256 price_) external onlyOwner {
        mintPriceToThisContract = price_;
    }

    function setOutput(
        uint256 id,
        string memory location
    ) external override {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(id, location);
        emit TokenUriSet(id, location);
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

//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ChainAI.sol"; // todo make this an interface
import "./ArtNFT.sol"; // todo make this an interface

contract GENft is ERC721URIStorage {
    address private owner;
    address private referenceChild;
    address public mlCoordinator;
    string private baseModelLocation;
    uint256 currentTokenId;
    uint256 price;

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId);

    constructor(
        string memory baseModelLocation_,
        address referenceChild_,
        address mlCoordinator_,
        uint price_
    ) ERC721("GENft", "GEN") {
        baseModelLocation = baseModelLocation_;
        owner = msg.sender;
        mlCoordinator = mlCoordinator_;
        referenceChild = referenceChild_;
        price = price_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function mint(address to, string memory dataInputLocation) external payable returns (uint) {
        require(msg.value >= price, "Insufficient payment");
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint trainingPrice = mlContract.trainingPrice();
        require(msg.value >= trainingPrice, "Insufficient payment for training");
        currentTokenId++;
        tokenIdToDataInput[currentTokenId] = dataInputLocation;
        _mint(to, currentTokenId);
        address childAddress = Clones.clone(referenceChild);
        ArtNFT childContract = ArtNFT(childAddress);
        childContract.initialize(address(this), msg.sender, mlCoordinator, currentTokenId);
        // todo encode setTokenURI & correct args for callback fxn & data
        mlContract.startTrainingJob{value: trainingPrice}(
            baseModelLocation,
            dataInputLocation,
            address(0),
            bytes("hi")
        );
        return currentTokenId;
    }

    function setTokenURI(uint256 tokenId_, string memory tokenURI_) external {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(tokenId_, tokenURI_);
        emit TokenUriSet(tokenId_);
    }
}

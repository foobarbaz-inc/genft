//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ChainAI.sol";
import "./IMLClient.sol";
import "./ArtNFT.sol"; // todo make this an interface

contract GENft is ERC721URIStorage, IMLClient {
    address private owner;
    address private referenceChild;
    address public mlCoordinator;
    uint256 currentTokenId;
    uint256 price; // This is just the price of minting, it doesn't include the price of training

    // training parameters
    uint8 dataType;
    string modelStorageLocation;
    string initFnStorageLocation;
    uint8 optimizer;
    uint256 learning_rate_x1e8;
    uint256 batch_size;
    uint256 epochs;

    mapping (uint256 => string) tokenIdToDataZip;
    mapping (uint256 => string) tokenIdToLossFn;
    mapping (uint256 => address) public tokenIdToChildContract;

    event ArtNftCreated(address child, address owner);
    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address referenceChild_,
        address mlCoordinator_,
        uint price_,
        uint8 dataType_,
        string modelStorageLocation_,
        string initFnStorageLocation_,
        uint8 optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    ) ERC721("GENft", "GEN") {
        owner = msg.sender;
        mlCoordinator = mlCoordinator_;
        referenceChild = referenceChild_;
        price = price_;

        // training params
        dataType = dataType_;
        modelStorageLocation = modelStorageLocation_;
        initFnStorageLocation = initFnStorageLocation_;
        optimizer = optimizer_;
        learning_rate_x1e8 = learning_rate_x1e8_;
        batch_size = batch_size_;
        epochs = epochs_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function mint(
        address to,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    ) external payable returns (uint) {
        // check that the payment is enough
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint trainingPrice = mlContract.trainingPrice();
        require(msg.value >= price + trainingPrice, "Insufficient payment");

        currentTokenId++;
        // Set the data for the specific GENft
        tokenIdToDataZip[currentTokenId] = dataZipStorageLocation;
        tokenIdToLossFn[currentTokenId] = lossFnStorageLocation;
        
        // Set the owner of the given NFT properly
        _mint(to, currentTokenId);

        // Clone the reference child
        address childAddress = Clones.clone(referenceChild);
        ArtNFT childContract = ArtNFT(childAddress);
        childContract.initialize(address(this), msg.sender, mlCoordinator, currentTokenId, dataType);
        emit ArtNftCreated(childAddress, msg.sender);
        tokenIdToChildContract[currentTokenId] = childAddress;
        
        // Start training
        mlContract.startTrainingJob{value: trainingPrice}(
            data_type,
            dataZipStorageLocation,
            modelStorageLocation,
            initFnStorageLocation,
            lossFnStorageLocation,
            optimizer,
            learning_rate_x1e8,
            batch_size,
            epochs,
            currentTokenId
        );
        return currentTokenId;
    }

    function setDataLocation(
        uint256 dataId,
        string memory dataLocation
    ) external override {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(dataId, dataLocation);
        emit TokenUriSet(dataId, dataLocation);
    }

    function updateBaseModelLocation(
        string memory newBaseUri
    ) external onlyOwner {
        baseModelLocation = newBaseUri;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        address childContract = tokenIdToChildContract[tokenId];
        ArtNFT childContract = ArtNFT(childAddress);
        childContract.changeOwner(to);
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

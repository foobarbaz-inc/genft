//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ChainAI.sol";
import "./IMLClient.sol";

contract GENft is ERC721URIStorage, IMLClient {
    address private owner;
    address public mlCoordinator;
    uint256 currentTokenId;
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of training

    // training parameters
    uint256 learning_rate_x1e8;
    uint256 batch_size;
    uint256 epochs;
    ChainAI.JobDataType inputDataType;
    ChainAI.JobDataType outputDataType;
    ChainAI.Optimizer optimizer;
    string initFnStorageLocation;

    struct ModelInfo {
        string[] modelLocations; // array in case model updates over time
        uint[] jobIds; // array of jobs associated with this Model
    }

    mapping (uint => ModelInfo) tokenIdToModelInfo;

    function price() public view returns(uint256) {
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint trainingPrice = mlContract.trainingPrice();
        uint256 totalPrice = mintPriceToThisContract + trainingPrice;
        return(totalPrice);
    }

    event ArtNftCreated(address child, address owner);
    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address mlCoordinator_,
        uint price_,
        ChainAI.JobDataType inputDataType_,
        ChainAI.JobDataType outputDataType_,
        string memory initFnStorageLocation_,
        ChainAI.Optimizer optimizer_,
        uint256 learning_rate_x1e8_,
        uint256 batch_size_,
        uint256 epochs_
    ) ERC721("GENft", "GEN") {
        owner = msg.sender;
        mlCoordinator = mlCoordinator_;
        mintPriceToThisContract = price_;

        // training params
        inputDataType = inputDataType_;
        outputDataType = outputDataType_;
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
        string memory modelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    ) external payable returns (uint) {
        // check that the payment is enough
        require(msg.value >= price(), "Insufficient payment for minting");

        currentTokenId++;

        // Set the owner of the given NFT properly
        // Need to do this in this order because _beforeTokenTransfer gets called on mint
        _mint(to, currentTokenId);

        // Start training
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint trainingPrice = mlContract.trainingPrice();
        mlContract.startTrainingJob{value: trainingPrice}(
            inputDataType,
            outputDataType,
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
        // if dataId is 0, ignore callback
        if (dataId != 0) {
            require(msg.sender == mlCoordinator, "Not ML coordinator");
            // todo handle setting openSea specific metadata rather than just model location
            _setTokenURI(dataId, dataLocation);
            ModelInfo storage modelInfo = tokenIdToModelInfo[dataId];
            modelInfo.modelLocations.push(dataLocation);
            emit TokenUriSet(dataId, dataLocation);
        }
    }

    function run(
        uint256 tokenId,
        string memory dataInputLocation
    ) external payable {
        // require that only the owner can run the model
        require(ownerOf(tokenId) == msg.sender, "Not AI owner");
        string memory trainedModelStorageLocation = tokenURI(tokenId);
        require(
            keccak256(abi.encodePacked(trainedModelStorageLocation)) != keccak256(abi.encodePacked("")),
            "Model not yet trained"
        );
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        require(msg.value >= inferencePrice, "Insufficient payment for inference");
        uint jobId = mlContract.startInferenceJob{value: inferencePrice}(
            inputDataType,
            outputDataType,
            trainedModelStorageLocation,
            dataInputLocation,
            0
        );
        ModelInfo storage modelInfo = tokenIdToModelInfo[tokenId];
        modelInfo.jobIds.push(jobId);
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

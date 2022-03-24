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
        uint[] inferenceJobIds;
        string styleModelLocation;
        string GANModelLocation;
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
        string memory uninitStyleModelStorageLocation,
        string memory GANModelStorageLocation,
        string memory dataZipStorageLocation,
        string memory lossFnStorageLocation
    ) external payable returns (uint) {
        // check that the payment is enough
        require(msg.value >= price(), "Insufficient payment for minting");

        currentTokenId++;

        // Set the owner of the given NFT properly
        // Need to do this in this order because _beforeTokenTransfer gets called on mint
        _mint(to, currentTokenId);

        // Set the GAN model location
        ModelInfo storage modelInfo = tokenIdToModelInfo[currentTokenId];
        modelInfo.GANModelLocation = GANModelStorageLocation;

        // If there is no style, do not do training
        bytes memory uninitStyleModelStorageLocationBytes = bytes(uninitStyleModelStorageLocation)
        if (uninitStyleModelStorageLocation.length == 0) {
            handleNewDataLocation(currentTokenId, "");
            return currentTokenId;
        }

        // Start training
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint trainingPrice = mlContract.trainingPrice();

        // Create storage locations struct
        ChainAI.TrainingJobStorageLocs memory storageLocations = ChainAI.TrainingJobStorageLocs({
            dataZipStorageLocation: dataZipStorageLocation,
            modelStorageLocation: uninitStyleModelStorageLocation,
            initFnStorageLocation: initFnStorageLocation,
            lossFnStorageLocation: lossFnStorageLocation
        });

        ChainAI.TrainingJobOptimizationParams memory optimParams = ChainAI.TrainingJobOptimizationParams({
            optimizer: optimizer,
            learning_rate_x1e8: learning_rate_x1e8,
            batch_size: batch_size,
            epochs: epochs
        });

        mlContract.startTrainingJob{value: trainingPrice}(
            inputDataType,
            currentTokenId,
            storageLocations,
            optimParams,
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
            handleNewDataLocation(dataId, dataLocation);
        }
    }

    function handleNewDataLocation(
        uint256 dataId,
        string memory dataLocation
    ) internal {
        // todo handle setting openSea specific metadata rather than just model location
        _setTokenURI(dataId, dataLocation);
        ModelInfo storage modelInfo = tokenIdToModelInfo[dataId];
        modelInfo.styleModelLocation = dataLocation;
        emit TokenUriSet(dataId, dataLocation);
    }

    function run(
        uint256 tokenId,
        string memory dataInputLocation
    ) external payable {
        // require that only the owner can run the model
        require(ownerOf(tokenId) == msg.sender, "Not AI owner");
        string memory trainedStyleModelStorageLocation = tokenURI(tokenId);
        require(
            keccak256(abi.encodePacked(trainedStyleModelStorageLocation)) != keccak256(abi.encodePacked("")),
            "Model not yet trained"
        );

        // get the GAN model
        ModelInfo storage modelInfo = tokenIdToModelInfo[tokenId];
        string memory GANModelLocation = modelInfo.GANModelLocation;

        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        require(msg.value >= inferencePrice, "Insufficient payment for inference");

        // Need to create the dynamic sized array separately
        string[] memory model_locs = new string[](2);
        model_locs[0] = GANModelLocation;
        model_locs[1] = trainedStyleModelStorageLocation;

        uint jobId = mlContract.startInferenceJob{value: inferencePrice}(
            inputDataType,
            outputDataType,
            modelInfo.inferenceJobIds.length, // seed = number of existing jobs
            model_locs,
            dataInputLocation,
            0
        );
        modelInfo.inferenceJobIds.push(jobId);
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

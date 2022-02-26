//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


contract ChainAI {

    uint modelPrice; // price to add a model to the contract
    uint latestModelId; // increment model IDs as more models are added
    uint latestDataId; // used for input & output data identification
    uint latestModelRunId; // keep track of model runs
    address owner; // used for adding and removing addresses of trusted GPU workers

    mapping (address -> bool) trustedGPUWorkers;
    mapping (uint -> ModelRun) modelRuns;
    mapping (uint -> string) modelStorageLocations; // model location on Arweave / IPFS
    mapping (uint -> string) dataStorageLocations; //

    enum ModelRunStatus {
        NotStarted,
        Executing,
        Failed,
        Succeeded
    }

    // store model run sender, allow them to cancel & get refund
    struct ModelRun {
        uint id;
        uint modelId;
        uint dataInputId;
        uint dataOutputId;
        uint createdTimestamp;
        address callbackAddress;
        bytes32 callbackData;
        ModelRunStatus status;
    }

    event ModelAdded(uint modelId, string modelStorageLocation);
    event DataAdded(uint dataId, string dataStorageLocation);
    event ModelRunCreated(uint modelRunId, uint modelId, uint dataInputId, uint dataOutputId, uint createdTimestamp);
    event ModelRunStarted(uint modelRunId, uint modelId, uint dataInputId, uint dataOutputId, uint createdTimestamp);
    event ModelRunFailed(uint modelRunId, uint modelId, uint dataInputId, uint dataOutputId, uint createdTimestamp);
    event ModelRunSucceeded(uint modelRunId, uint modelId, uint dataInputId, uint dataOutputId, uint createdTimestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier validModel(uint modelId) {
        require(modelStorageLocations[modelId], "Model does not exist");
        _;
    }

    function addModel(string memory modelStorageLocation) external {
        latestModelId++;
        modelStorageLocations[latestModelId] = modelStorageLocation;
        emit ModelAdded(latestModelId, modelStorageLocation);
    }

    function addInputData(string memory inputDataStorageLocation) external {
        latestDataId++;
        dataStorageLocations[latestDataId] = inputDataStorageLocation;
        emit DataAdded(latestDataId, inputDataStorageLocation);
    }

    function runModel(
        uint modelId,
        uint inputDataId,
        address callbackAddress,
        bytes32 callbackData
    ) external payable validModel(modelId) {
        require(msg.value >= modelPrice, "Insufficient ETH amount paid");
        require(dataStorageLocations[inputDataId], "Input data does not exist");
        latestModelRunId++;
        latestDataId++;
        uint createdTimestamp = block.timestamp;
        ModelRun memory run = new ModelRun(
            latestModelRunId,
            modelId,
            dataInputId,
            latestDataId,
            createdTimestamp,
            callbackAddress,
            callbackData,
            ModelRunStatus.NotStarted
        );
        modelRuns[latestModelRunId] = run;
        emit ModelRunCreated(latestModelRunId, modelId, dataInputId, latestDataId, createdTimestamp);
    }

    function updateModelStatus(
        uint modelId,
        ModelRunStatus modelStatus,
        string resultsLocation
    ) external {
        require(trustedGPUWorkers[msg.sender], "Not a trusted GPU worker");
        ModelRun storage run = modelRuns[modelId];
        run.status = modelStatus;
        if (modelStatus == ModelStatus.Executing) {
            emit ModelRunStarted(run.id, run.modelId, run.dataInputId, run.dataOutputId, run.createdTimestamp);
        } else if (modelStatus == ModelStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit ModelRunFailed(run.id, run.modelId, run.dataInputId, run.dataOutputId, run.createdTimestamp);
        } else if (modelStatus == ModelStatus.Succeeded) {
            require(resultsLocation != "", "Invalid results location");
            dataStorageLocations[run.dataOutputId] = resultsLocation;
            (bool success,) = run.callbackAddress.call(callbackData);
            require(success, "Callback failed");
            emit ModelRunSucceeded(run.id, run.modelId, run.dataInputId, run.dataOutputId, run.createdTimestamp);
        }
    }

    function addGPUWorker(address worker) external onlyOwner {
        trustedGPUWorkers[worker] = true;
    }

    function removeGPUWorker(address worker) external onlyOwner {
        trustedGPUWorkers[worker] = false;
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
    }
}

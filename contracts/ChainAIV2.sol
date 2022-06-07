//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./DataTypes.sol";
import "./Model.sol";
import "./IChainAIV2.sol";
import "./IMLClient.sol";
import "hardhat/console.sol";

contract ChainAIV2 is IChainAIV2 {

    // contract variables
    uint private price; // accessible thru inferencePrice()
    uint public latestJobId; // keep track of model runs
    address owner; // used for adding and removing addresses of trusted GPU workers

    mapping (address => bool) public models;
    mapping (address => bool) public sequencers;
    mapping (uint => Job) public jobs;

    // enums
    enum JobStatus {
        Created,
        Failed,
        Succeeded
    }

    // job struct definitions
    struct JobParams {
        JobStatus status; // uint8
        uint id;
        uint createdTimestamp;
        uint256 callbackId;
        address callbackAddress;
        bytes4 callbackFunction;
    }

    struct Job {
        JobParams jobParams;
        DataTypes.InputDataLocationType inputDataLocationType;
        DataTypes.OutputDataLocationType outputDataLocationType;
        DataTypes.OutputDataFormat outputDataFormat;
        uint256 modelVersion;
        address model;
        bytes seed;
        string input;
        bytes output;
    }

    event JobCreated(
        uint jobId,
        DataTypes.ModelCategory modelCategory,
        bytes seed,
        string modelConfigLocation,
        DataTypes.InputDataLocationType inputDataLocationType,
        string input,
        bytes4 callbackFunction,
        uint256 callbackId,
        DataTypes.OutputDataLocationType outputDataLocationType,
        DataTypes.OutputDataFormat outputDataFormat,
        uint createdTimestamp
    );
    event JobFailed(uint jobId);
    event JobSucceeded(uint jobId);

    event ModelAdded(address model);

    constructor(uint inferencePrice_) {
        price = inferencePrice_;
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    function startJob(
        bytes memory seed,
        uint256 callbackId,
        address callbackAddress,
        bytes4 callbackFunction,
        DataTypes.InputDataLocationType inputDataLocationType,
        string memory input,
        DataTypes.OutputDataLocationType outputDataLocationType,
        DataTypes.OutputDataFormat outputDataFormat
    ) external payable {
        require(models[msg.sender], "Only model contract allowed to call");

        latestJobId++;
        uint createdTimestamp = block.timestamp;

        Model model = Model(msg.sender);

        // make the actual job
        JobParams memory jobParams = JobParams({
            status: JobStatus.Created,
            id: latestJobId,
            createdTimestamp: createdTimestamp,
            callbackId: callbackId,
            callbackAddress: callbackAddress,
            callbackFunction: callbackFunction
        });

        Job memory job = Job({
            jobParams: jobParams,
            seed: seed,
            modelVersion: model.latestModelVersionNum(),
            model: msg.sender,
            inputDataLocationType: inputDataLocationType,
            input: input,
            outputDataLocationType: outputDataLocationType,
            outputDataFormat: outputDataFormat,
            output: ""
        });

        // save the job and emit the created event
        jobs[latestJobId] = job;
        emit JobCreated(
            job.jobParams.id,
            model.modelCategory(),
            job.seed,
            model.getModelLocation(),
            job.inputDataLocationType,
            job.input,
            job.jobParams.callbackFunction,
            job.jobParams.callbackId,
            job.outputDataLocationType,
            job.outputDataFormat,
            job.jobParams.createdTimestamp
        );
    }

    // todo add different methods for different result types
    function updateJobStatus(
        uint jobId,
        JobStatus jobStatus,
        bytes memory callbackData
    ) external {
        require(sequencers[msg.sender], "Not a trusted GPU worker");

        JobParams storage jobParams;
        Job storage job = jobs[jobId];
        jobParams = job.jobParams;
        job.output = callbackData;
        jobParams.status = jobStatus;

        if (jobStatus == JobStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit JobFailed(jobId);
        } else if (jobStatus == JobStatus.Succeeded) {
            (bool success,) = jobParams.callbackAddress.call(callbackData);
            require(success, "Callback failed");
            emit JobSucceeded(jobId);
        }
    }

    function addModel(address model) external onlyOwner {
        models[model] = true;
        emit ModelAdded(model);
    }

    function removeModel(address model) external onlyOwner {
        models[model] = false;
    }

    function addSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = true;
    }

    function removeSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = false;
    }

    function updateInferencePrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
    }

    function inferencePrice() external override view returns (uint256) {
        return price;
    }

    function withdraw() external onlyOwner {
        require(msg.sender == owner, "Only owner");
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw to owner failed");
    }
}

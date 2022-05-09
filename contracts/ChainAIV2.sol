//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./DataTypes.sol";
import "./Model.sol";
import "./IMLClient.sol";

contract ChainAIV3 {

    // contract variables
    uint latestJobId; // keep track of model runs
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
        string output;
    }

    event JobCreated(
        uint jobId,
        string modelCategory,
        bytes seed,
        string modelConfigLocation,
        DataTypes.InputDataLocationType inputDataLocationType,
        string input,
        DataTypes.OutputDataLocationType outputDataLocationType,
        DataTypes.OutputDataFormat outputDataFormat,
        uint createdTimestamp
    );
    event JobFailed(uint jobId);
    event JobSucceeded(uint jobId);

    event ModelAdded(address model);

    constructor() {
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
            callbackAddress: callbackAddress
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
            latestJobId,
            model.modelCategory(),
            seed,
            model.getModelLocation(),
            inputDataLocationType,
            input,
            outputDataLocationType,
            outputDataFormat,
            createdTimestamp
        );
    }

    function updateJobStatus(
        uint jobId,
        JobStatus jobStatus,
        string memory resultsLocation
    ) external {
        require(sequencers[msg.sender], "Not a trusted GPU worker");

        JobParams storage jobParams;
        Job storage job = jobs[jobId];
        jobParams = job.jobParams;
        job.output = resultsLocation;
        jobParams.status = jobStatus;

        if (jobStatus == JobStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit JobFailed(jobId);
        } else if (jobStatus == JobStatus.Succeeded) {
            IMLClient client = IMLClient(jobParams.callbackAddress);
            client.setOutput(jobParams.callbackId, resultsLocation);
            // todo how to handle incorrect interface
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
}

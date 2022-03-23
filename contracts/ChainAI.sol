//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IMLClient.sol";

contract ChainAI {

    uint8 public contractVersion = 0; // workers should be able to reference the contract version

    // contract variables
    uint public trainingPrice; // price to run training
    uint public inferencePrice; // price to run inference
    uint latestJobId; // keep track of model runs
    address owner; // used for adding and removing addresses of trusted GPU workers

    mapping (address => bool) public sequencers;
    mapping (uint => TrainingJob) public training_jobs;
    mapping (uint => InferenceJob) public inference_jobs;
    mapping (uint => JobType) public job_types;

    // enums
    enum JobStatus {
        Created,
        Failed,
        Succeeded
    }

    enum JobType {
        Training,
        Inference
    }

    enum JobDataType {
        Image,
        Categorical,
        None
    }

    // Zack note: these might not be neccessary so I'm not including them now
    // If they become neccessary we can include for a V2
    /*
    struct ImageDataPreprocessing {
        uint256 size_x;
        uint256 size_y;
        uint256 scale;
    }

    struct CategoricalDataPreprocessing {
        // todo: implement
    }*/

    enum Optimizer {
        Adam,
        SGD
    }

    // job struct definitions
    struct JobParams {
        JobStatus status; // uint8
        uint id;
        uint createdTimestamp;
        uint256 callbackId;
        address callbackAddress;
    }

    struct TrainingJob {
        JobParams jobParams;
        JobDataType inputDataType;
        Optimizer optimizer;
        uint256 seed;
        uint256 learning_rate_x1e8;
        uint256 batch_size;
        uint256 epochs;
        string dataZipStorageLocation;
        string modelStorageLocation;
        string initFnStorageLocation;
        string lossFnStorageLocation;
        string modelOutputStorageLocation;
    }

    struct InferenceJob {
        JobParams jobParams;
        JobDataType inputDataType;
        JobDataType outputDataType;
        uint256 seed;
        string[] modelStorageLocations;
        string dataInputStorageLocation;
        string dataOutputStorageLocation;
    }

    // event definitions
    event TrainingJobCreated(
        uint jobId,
        uint8 version,
        JobDataType inputDataType,
        uint256 seed,
        string dataZipStorageLocation,
        string modelStorageLocation,
        string initFnStorageLocation,
        string lossFnStorageLocation,
        Optimizer optimizer,
        uint256 learning_rate_x1e8,
        uint256 batch_size,
        uint256 epochs,
        uint createdTimestamp
    );
    event InferenceJobCreated(
        uint jobId,
        uint8 version,
        JobDataType inputDataType,
        JobDataType outputDataType,
        uint256 seed,
        string[] modelStorageLocations,
        string dataInputStorageLocation,
        uint createdTimestamp
    );
    event JobFailed(uint jobId);
    event JobSucceeded(uint jobId);

    constructor(uint trainingPrice_, uint inferencePrice_) {
        owner = msg.sender;
        trainingPrice = trainingPrice_;
        inferencePrice = inferencePrice_;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    function startInferenceJob(
        JobDataType inputDataType,
        JobDataType outputDataType,
        uint256 seed,
        string[] memory modelStorageLocations,
        string memory dataInputStorageLocation,
        uint256 callbackId
    ) external payable returns (uint256) {
        require(msg.value >= inferencePrice, "Insufficient payment for inference");

        latestJobId++;
        uint createdTimestamp = block.timestamp;

        // make the actual job
        JobParams memory jobParams = JobParams({
            status: JobStatus.Created,
            id: latestJobId,
            createdTimestamp: createdTimestamp,
            callbackId: callbackId,
            callbackAddress: msg.sender
        });

        InferenceJob memory job = InferenceJob({
            jobParams: jobParams,
            inputDataType: inputDataType,
            outputDataType: outputDataType,
            seed: seed,
            modelStorageLocations: modelStorageLocations,
            dataInputStorageLocation: dataInputStorageLocation,
            dataOutputStorageLocation: ""
        });

        // save the job and emit the created event
        inference_jobs[latestJobId] = job;
        job_types[latestJobId] = JobType.Inference;
        emit InferenceJobCreated(
            latestJobId,
            contractVersion,
            inputDataType,
            outputDataType,
            seed,
            modelStorageLocations,
            dataInputStorageLocation,
            createdTimestamp
        );
        return latestJobId;
    }

    function startTrainingJob(
        JobDataType inputDataType,
        uint256 seed,
        string memory dataZipStorageLocation,
        string memory modelStorageLocation,
        string memory initFnStorageLocation,
        string memory lossFnStorageLocation,
        Optimizer optimizer,
        uint256 learning_rate_x1e8,
        uint256 batch_size,
        uint256 epochs,
        uint256 callbackId
    ) external payable {
        require(msg.value >= trainingPrice, "Insufficient payment for training");

        latestJobId++;
        uint createdTimestamp = block.timestamp;

        // make the actual job
        JobParams memory jobParams = JobParams({
            status: JobStatus.Created,
            id: latestJobId,
            createdTimestamp: createdTimestamp,
            callbackId: callbackId,
            callbackAddress: msg.sender
        });

        TrainingJob memory job = TrainingJob({
            jobParams: jobParams,
            inputDataType: inputDataType,
            seed: seed,
            dataZipStorageLocation: dataZipStorageLocation,
            modelStorageLocation: modelStorageLocation,
            initFnStorageLocation: initFnStorageLocation,
            lossFnStorageLocation: lossFnStorageLocation,
            optimizer: optimizer,
            learning_rate_x1e8: learning_rate_x1e8,
            batch_size: batch_size,
            epochs: epochs,
            modelOutputStorageLocation: ""
        });

        // save the job and emit the created event
        training_jobs[latestJobId] = job;
        job_types[latestJobId] = JobType.Training;
        emit TrainingJobCreated(
            latestJobId,
            contractVersion,
            inputDataType,
            seed,
            dataZipStorageLocation,
            modelStorageLocation,
            initFnStorageLocation,
            lossFnStorageLocation,
            optimizer,
            learning_rate_x1e8,
            batch_size,
            epochs,
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
        if (job_types[jobId] == JobType.Training) {
            TrainingJob storage job = training_jobs[jobId];
            jobParams = job.jobParams;
            job.modelOutputStorageLocation = resultsLocation;
        } else {
            // I seem to need to do this because otherwise solidity complains that jobParams
            // might not be set (if I used else if). Is there a better way to handle this?
            assert(job_types[jobId] == JobType.Inference);
            InferenceJob storage job = inference_jobs[jobId];
            jobParams = job.jobParams;
            job.dataOutputStorageLocation = resultsLocation;
        }
        jobParams.status = jobStatus;

        if (jobStatus == JobStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit JobFailed(jobId);
        } else if (jobStatus == JobStatus.Succeeded) {
            IMLClient client = IMLClient(jobParams.callbackAddress);
            client.setDataLocation(jobParams.callbackId, resultsLocation);
            // todo how to handle incorrect interface
            emit JobSucceeded(jobId);
        }
    }

    function addSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = true;
    }

    function removeSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = false;
    }

    function updateInferencePrice(uint price) external onlyOwner {
        inferencePrice = price;
    }

    function updateTrainingPrice(uint price) external onlyOwner {
        trainingPrice = price;
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

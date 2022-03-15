//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IMLClient.sol";

library ChainAIStructs {
    
}

contract ChainAI {
    
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
        Categorical
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
        uint id;
        uint createdTimestamp;
        JobStatus status;
        address callbackAddress;
        uint256 callbackId;
    }

    struct TrainingJob {
        JobParams jobParams;
        JobDataType dataType;
        string dataZipStorageLocation;
        string modelStorageLocation;
        string initFnStorageLocation;
        string lossFnStorageLocation;
        Optimizer optimizer;
        uint256 learning_rate_x1e8;
        uint256 batch_size;
        uint256 epochs;
        string modelOutputStorageLocation;
    }

    struct InferenceJob {
        JobParams jobParams;
        JobDataType dataType;
        string modelStorageLocation;
        string dataInputStorageLocation;
        string dataOutputStorageLocation;
    }

    // event definitions
    event TrainingJobCreated(
        uint jobId,
        JobDataType dataType,
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
        JobDataType dataType,
        string modelStorageLocation,
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
        JobDataType dataType
        string memory modelStorageLocation,
        string memory dataInputStorageLocation,
        uint256 callbackId
    ) external payable {
        require(msg.value >= inferencePrice, "Insufficient ETH amount paid");

        latestJobId++;
        uint createdTimestamp = block.timestamp;
        
        // make the actual job
        InferenceJob memory job = InferenceJob({
            jobParams: {
                id: latestJobId,
                createdTimestamp: createdTimestamp,
                status: JobStatus.Created,
                callbackAddress: msg.sender,
                callbackId: callbackId
            },
            dataType: dataType,
            modelStorageLocation: modelStorageLocation,
            dataInputStorageLocation: dataInputStorageLocation,
            dataOutputStorageLocation: ""
        });
        
        // save the job and emit the created event
        inference_jobs[latestJobId] = job;
        job_types[latestJobId] = JobType.Inference;
        emit InferenceJobCreated(
            latestJobId,
            dataType,
            modelStorageLocation,
            dataInputStorageLocation,
            createdTimestamp
        );
    }

    function startTrainingJob(
        JobDataType dataType,
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
        require(msg.value >= trainingPrice, "Insufficient ETH amount paid");

        latestJobId++;
        uint createdTimestamp = block.timestamp;
        
        // make the actual job
        TrainingJob memory job = TrainingJob({
            jobParams: {
                id: latestJobId,
                createdTimestamp: createdTimestamp,
                status: JobStatus.Created,
                callbackAddress: msg.sender,
                callbackId: callbackId
            },
            dataType: dataType,
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
            dataType,
            dataZipStorageLocation,
            modelStorageLocation,
            initFnStorageLocation,
            lossFnStorageLocation,
            optimizer,
            learning_rate_x1e8,
            batch_size,
            epochs,
            createdTimestamp
        });
    }

    function updateJobStatus(
        uint jobId,
        JobStatus jobStatus,
        string memory resultsLocation
    ) external {
        require(sequencers[msg.sender], "Not a trusted GPU worker");

        if (job_types[jobId] == JobType.Training) {
            TrainingJob storage job = training_jobs[jobId];
            job.jobParams.status = jobStatus;
            job.modelOutputStorageLocation = resultsLocation;
        } else if (job_types[jobId] == JobType.Inference) {
            InferenceJob storage job = inference_jobs[jobId];
            job.jobParams.status = jobStatus;
            job.dataOutputStorageLocation = resultsLocation;
        }

        if (jobStatus == JobStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit JobFailed(jobId);
        } else if (jobStatus == JobStatus.Succeeded) {
            IMLClient client = IMLClient(job.jobParams.callbackAddress);
            client.setDataLocation(job.jobParams.callbackId, resultsLocation);
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

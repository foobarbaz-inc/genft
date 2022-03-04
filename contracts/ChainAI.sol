//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract ChainAI {

    uint public trainingPrice; // price to run training
    uint public inferencePrice; // price to run inference
    uint latestJobId; // keep track of model runs
    address owner; // used for adding and removing addresses of trusted GPU workers

    mapping (address => bool) public sequencers;
    mapping (uint => Job) public jobs;

    enum JobStatus {
        Created,
        Failed,
        Succeeded
    }

    enum JobType {
        Training,
        Inference
    }

    // store model run sender, allow them to cancel & get refund
    struct Job {
        uint id;
        uint createdTimestamp;
        JobStatus status;
        JobType jobType;
        address callbackAddress;
        bytes callbackData;
        string modelStorageLocation;
        string dataInputStorageLocation;
        string dataOutputStorageLocation;
    }

    event JobCreated(
        uint jobId,
        JobType jobType,
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

    function _startJob(
        JobType jobType,
        string memory modelStorageLocation,
        string memory dataInputStorageLocation,
        address callbackAddress,
        bytes memory callbackData
    ) internal {
        latestJobId++;
        // create job
        uint createdTimestamp = block.timestamp;
        Job memory job = Job({
            id: latestJobId,
            modelStorageLocation: modelStorageLocation,
            dataInputStorageLocation: dataInputStorageLocation,
            createdTimestamp: createdTimestamp,
            callbackAddress: callbackAddress,
            callbackData: callbackData,
            jobType: jobType,
            status: JobStatus.Created,
            dataOutputStorageLocation: ""
          });
        // add to jobs mapping
        jobs[latestJobId] = job;
        console.log("model storage location");
        console.log(modelStorageLocation);
        emit JobCreated(
            latestJobId,
            jobType,
            modelStorageLocation,
            dataInputStorageLocation,
            createdTimestamp
        );
    }

    function startInferenceJob(
      string memory modelStorageLocation,
      string memory dataInputStorageLocation,
      address callbackAddress,
      bytes memory callbackData
    ) external payable {
        require(msg.value >= inferencePrice, "Insufficient ETH amount paid");
        _startJob(
            JobType.Inference,
            modelStorageLocation,
            dataInputStorageLocation,
            callbackAddress,
            callbackData
        );
    }

    function startTrainingJob(
      string memory modelStorageLocation,
      string memory dataInputStorageLocation,
      address callbackAddress,
      bytes memory callbackData
    ) external payable  {
        require(msg.value >= trainingPrice, "Insufficient ETH amount paid");
        _startJob(
            JobType.Training,
            modelStorageLocation,
            dataInputStorageLocation,
            callbackAddress,
            callbackData
        );
    }

    function updateJobStatus(
        uint jobId,
        JobStatus jobStatus,
        string memory resultsLocation
    ) external {
        require(sequencers[msg.sender], "Not a trusted GPU worker");
        Job storage job = jobs[jobId];
        job.status = jobStatus;
        if (jobStatus == JobStatus.Failed) {
            // todo
            // should the msg.sender be refunded, or get a balance they can withdraw?
            // should the model automatically be restarted?
            emit JobFailed(job.id);
        } else if (jobStatus == JobStatus.Succeeded) {
            job.dataOutputStorageLocation = resultsLocation;
            bytes memory fullCallbackData = abi.encodePacked(job.callbackData, abi.encode(resultsLocation));
            (bool success,) = job.callbackAddress.call(fullCallbackData);
            require(success, "Callback failed");
            emit JobSucceeded(job.id);
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

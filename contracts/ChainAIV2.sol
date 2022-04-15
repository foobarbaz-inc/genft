//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IMLClient.sol";

contract ChainAIV2 {

    // contract variables
    uint public inferencePrice; // price to run inference
    uint latestJobId; // keep track of model runs
    address owner; // used for adding and removing addresses of trusted GPU workers

    mapping (address => bool) public sequencers;
    mapping (uint => Job) public jobs;

    // enums
    enum JobStatus {
        Created,
        Failed,
        Succeeded
    }

    enum ModelCategory {
        TextConditionalImageGeneration,
        UnconditionalImageGeneration,
        PromptConditionedTextGeneration
    }

    enum InputDataLocationType {
        Arweave,
        TheGraph,
        OnChain
    }

    enum OutputDataLocationType {
        Arweave,
        TheGraph,
        OnChain
    }

    enum OutputDataFormat {
        Raw,
        NFTMeta
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
        ModelCategory modelCategory;
        InputDataLocationType inputDataLocationType;
        OutputDataLocationType outputDataLocationType;
        OutputDataFormat outputDataFormat;
        bytes seed;
        string modelConfigLocation;
        string input;
        string output;
    }

    event JobCreated(
        uint jobId,
        ModelCategory modelCategory,
        bytes seed,
        string modelConfigLocation,
        InputDataLocationType inputDataLocationType,
        string input,
        OutputDataLocationType outputDataLocationType,
        OutputDataFormat outputDataFormat,
        uint createdTimestamp
    );
    event JobFailed(uint jobId);
    event JobSucceeded(uint jobId);

    constructor(uint inferencePrice_) {
        owner = msg.sender;
        inferencePrice = inferencePrice_;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    function _startJob(
        ModelCategory modelCategory,
        bytes memory seed,
        uint256 callbackId,
        string memory modelConfigLocation,
        InputDataLocationType inputDataLocationType,
        string memory input,
        OutputDataLocationType outputDataLocationType,
        OutputDataFormat outputDataFormat
    ) internal {
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

        Job memory job = Job({
            jobParams: jobParams,
            modelCategory: modelCategory,
            seed: seed,
            modelConfigLocation: modelConfigLocation,
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
            modelCategory,
            seed,
            modelConfigLocation,
            inputDataLocationType,
            input,
            outputDataLocationType,
            outputDataFormat,
            createdTimestamp
        );
    }

    // TODO should each model type have a separate inference price?
    function promptConditionedTextGeneration(
        string memory modelConfigLocation,
        string memory prompt,
        uint callbackId,
        bytes memory seed
    ) external payable {
        _startJob(
            ModelCategory.PromptConditionedTextGeneration,
            seed,
            callbackId,
            modelConfigLocation,
            InputDataLocationType.OnChain,
            prompt,
            OutputDataLocationType.OnChain,
            OutputDataFormat.Raw
        );
    }

    function textConditionalImageGeneration(
        string memory modelConfigLocation,
        string memory prompt,
        uint callbackId,
        bytes memory seed,
        OutputDataFormat outputDataFormat
    ) external payable {
        _startJob(
            ModelCategory.TextConditionalImageGeneration,
            seed,
            callbackId,
            modelConfigLocation,
            InputDataLocationType.OnChain,
            prompt,
            OutputDataLocationType.Arweave,
            outputDataFormat
        );
    }

    function unconditionalImageGeneration(
        string memory modelConfigLocation,
        uint callbackId,
        bytes memory seed,
        OutputDataFormat outputDataFormat
    ) external payable {
        _startJob(
            ModelCategory.UnconditionalImageGeneration,
            seed,
            callbackId,
            modelConfigLocation,
            InputDataLocationType.OnChain,
            "",
            OutputDataLocationType.Arweave,
            outputDataFormat
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

    function addSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = true;
    }

    function removeSequencer(address sequencer) external onlyOwner {
        sequencers[sequencer] = false;
    }

    function updateInferencePrice(uint price) external onlyOwner {
        inferencePrice = price;
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

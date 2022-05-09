//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ChainAIV2.sol";
import "./DataTypes.sol";
import "./Model.sol";

contract TextConditionalImageGeneration is Model {

    constructor(
        address owner_,
        address oracleAdmin_,
        bool upgradeable_,
        uint256 inferencePrice_,
        string memory modelLocation_
    ) Model(
        owner_,
        oracleAdmin_,
        upgradeable_,
        inferencePrice_,
        modelLocation_,
        "TextConditionalImageGeneration"
    ){}

    function run(
        string memory prompt,
        uint callbackId,
        bytes memory seed,
        DataTypes.OutputDataFormat outputDataFormat
    ) external payable {
        require(msg.value == inferencePrice, "Incorrect price");
        ChainAIV3 chainAI = ChainAIV3(oracle);
        chainAI.startJob(
            seed,
            callbackId,
            msg.sender,
            DataTypes.InputDataLocationType.OnChain,
            prompt,
            DataTypes.OutputDataLocationType.Arweave,
            outputDataFormat
        );
    }
}

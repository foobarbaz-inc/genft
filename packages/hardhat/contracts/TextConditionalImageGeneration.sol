//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ChainAIV2.sol";
import "./DataTypes.sol";
import "./Model.sol";

contract TextConditionalImageGeneration is Model {

    constructor(
        address owner_,
        address oracleAdmin_,
        address oracle_,
        bool upgradeable_,
        uint256 inferencePrice_,
        string memory modelLocation_
    ) Model(
        owner_,
        oracleAdmin_,
        oracle_,
        upgradeable_,
        inferencePrice_,
        modelLocation_,
        DataTypes.ModelCategory.TextConditionalImageGeneration
    ){}

    function run(
        string memory prompt,
        uint callbackId,
        bytes4 callbackFunction,
        bytes memory seed,
        DataTypes.OutputDataFormat outputDataFormat
    ) external payable {
        require(msg.value == inferencePrice, "Incorrect price");
        ChainAIV2 chainAI = ChainAIV2(oracle);
        chainAI.startJob(
            seed,
            callbackId,
            msg.sender,
            callbackFunction,
            DataTypes.InputDataLocationType.OnChain,
            prompt,
            DataTypes.OutputDataLocationType.Arweave,
            outputDataFormat
        );
    }
}

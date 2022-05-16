//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ChainAIV2.sol";
import "./Model.sol";

contract RLAgent is Model {

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
        DataTypes.ModelCategory.RLAgent
    ){}

    function run(uint256 gameId) external payable {
        require(msg.value == inferencePrice, "Incorrect price");
        ChainAIV2 chainAI = ChainAIV2(oracle);
        chainAI.startJob(
            abi.encodePacked(msg.sender),
            gameId,
            msg.sender,
            DataTypes.InputDataLocationType.OnChain,
            "",
            DataTypes.OutputDataLocationType.OnChain,
            DataTypes.OutputDataFormat.Raw
        );
    }

}

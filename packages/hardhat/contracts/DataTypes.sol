//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library DataTypes {
    enum InputDataLocationType {
        Arweave,
        TheGraph,
        OnChain
    }

    enum ModelCategory {
        TextConditionalImageGeneration,
        UnconditionalImageGeneration,
        PromptConditionedTextGeneration,
        RLAgent
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
}

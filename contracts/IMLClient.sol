//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


interface IMLClient {

    function setOutput(
        uint256 id,
        string memory location
    ) external;

}

//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


interface IMLClient {

    function setDataLocation(
        uint256 dataId,
        string memory dataLocation
    ) external;

}

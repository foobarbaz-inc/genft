//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Model {

    uint public latestModelVersionNum;
    uint public inferencePrice;

    bool immutable upgradeable;

    address oracleAdmin;
    address owner;
    address public oracle;

    string public modelCategory;

    mapping (uint => string) public modelLocationsByVersion;

    constructor(
        address owner_,
        address oracleAdmin_,
        bool upgradeable_,
        uint256 inferencePrice_,
        string memory modelLocation_,
        string memory modelCategory_
    ) {
        owner = owner_;
        oracleAdmin = oracleAdmin_;
        upgradeable = upgradeable_;
        inferencePrice = inferencePrice_;
        modelCategory = modelCategory_;
        latestModelVersionNum++;
        modelLocationsByVersion[latestModelVersionNum] = modelLocation_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyOracleAdmin() {
        require(msg.sender == oracleAdmin, "Not oracle admin");
        _;
    }

    function getModelLocation() external view returns (string memory){
        return modelLocationsByVersion[latestModelVersionNum];
    }

    function updateInferencePrice(uint256 newPrice) external onlyOwner {
        inferencePrice = newPrice;
    }

    function updateOracle(address newOracle) external onlyOracleAdmin {
        oracle = newOracle;
    }

    function updateOracleAdmin(address newOracleAdmin) external onlyOracleAdmin {
        oracleAdmin = newOracleAdmin;
    }

    function updateModel(string memory newModelLocation) external onlyOwner {
        require(upgradeable, "Model not upgradeable");
        latestModelVersionNum++;
        modelLocationsByVersion[latestModelVersionNum] = newModelLocation;
    }

    // review for security w/ external calls
    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        uint256 total = address(this).balance;
        uint256 oracleAdminPortion = total / 10; // 1/10 -- review for underflow here
        (bool successAdmin,) = payable(oracleAdmin).call{value: oracleAdminPortion}("");
        require(successAdmin, "Withdraw to oracle admin failed");
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw to owner failed");
    }

}

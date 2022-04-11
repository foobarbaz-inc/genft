//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./ChainAI.sol";
import "./IMLClient.sol";

contract EvolvingNFT is ERC721URIStorage, IMLClient {

    address private owner;
    address public mlCoordinator;
    uint256 currentTokenId;
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of inference

    function price() public view returns(uint256) {
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        uint256 totalPrice = mintPriceToThisContract + inferencePrice;
        return(totalPrice);
    }

    // inference parameters
    ChainAI.JobDataType dataType;

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address owner_,
        address mlCoordinator_,
        uint256 price_,
        ChainAI.JobDataType dataType_
      ) ERC721("EvolvingNFT", "EVO") {
          parent = parent_;
          owner = owner_;
          mlCoordinator = mlCoordinator_;
          mintPriceToThisContract = price_;
          dataType = dataType_;
      }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // todo add optional mint gating settable by owner
    function mint(address to, string memory prompt) external payable returns (uint) {
        require(msg.value >= price(), "Insufficient payment for minting");
        currentTokenId++;
        _mint(to, currentTokenId);
        ChainAI mlContract = ChainAI(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        mlContract.startInferenceJob{value: inferencePrice}(
            dataType,
            currentTokenId,
            trainedModelStorageLocation,
            prompt,
            currentTokenId
        );
        return currentTokenId;
    }

    function setMintPriceToThisContract(uint256 price_) external onlyOwner {
        mintPriceToThisContract = price_;
    }

    function setDataLocation(
        uint256 dataId,
        string memory dataLocation
    ) external override {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(dataId, dataLocation);
        emit TokenUriSet(dataId, dataLocation);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        // ignore minting & burning cases
        if (from != address(0) && to != address(0)) {
            // todo figure out where to make this payable,
            // so that inferencePrice doesn't come from contract balance
            ChainAI mlContract = ChainAI(mlCoordinator);
            uint inferencePrice = mlContract.inferencePrice();
            mlContract.startInferenceJob{value: inferencePrice}(
                dataType,
                currentTokenId,
                trainedModelStorageLocation,
                prompt,
                currentTokenId
            );
        }
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

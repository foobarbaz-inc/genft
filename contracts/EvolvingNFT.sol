//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./ChainAIV2.sol";
import "./IMLClient.sol";

contract EvolvingNFT is ERC721URIStorage, IMLClient {

    address private owner;
    address public mlCoordinator;
    uint256 currentTokenId;
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of inference
    ChainAIV2.ModelCategory modelCategory;
    string public model;

    function price() public view returns(uint256) {
        ChainAIV2 mlContract = ChainAIV2(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        uint256 totalPrice = mintPriceToThisContract + inferencePrice;
        return(totalPrice);
    }

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address owner_,
        address mlCoordinator_,
        uint256 price_,
        ChainAIV2.ModelCategory modelCategory_,
        string memory model_

      ) ERC721("EvolvingNFT", "EVO") {
          owner = owner_;
          mlCoordinator = mlCoordinator_;
          mintPriceToThisContract = price_;
          modelCategory = modelCategory_;
          model = model_;
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
        ChainAIV2 mlContract = ChainAIV2(mlCoordinator);
        uint inferencePrice = mlContract.inferencePrice();
        mlContract.textConditionalImageGeneration{value: inferencePrice}(
            model,
            prompt,
            currentTokenId,
            abi.encodePacked(msg.sender),
            ChainAIV2.OutputDataFormat.NFTMeta
        );
        return currentTokenId;
    }

    function setMintPriceToThisContract(uint256 price_) external onlyOwner {
        mintPriceToThisContract = price_;
    }

    function setOutput(
        uint256 id,
        string memory location
    ) external override {
        require(msg.sender == mlCoordinator, "Not ML coordinator");
        _setTokenURI(id, location);
        emit TokenUriSet(id, location);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        // ignore minting & burning cases
        if (from != address(0) && to != address(0)) {
            // todo figure out where to make this payable,
            // so that inferencePrice doesn't come from contract balance
            ChainAIV2 mlContract = ChainAIV2(mlCoordinator);
            uint inferencePrice = mlContract.inferencePrice();
            mlContract.textConditionalImageGeneration{value: inferencePrice}(
                model,
                tokenIdToDataInput[currentTokenId],
                tokenId,
                abi.encodePacked(to), // use recipient address as seed for new generation
                ChainAIV2.OutputDataFormat.NFTMeta
            );
        }
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}

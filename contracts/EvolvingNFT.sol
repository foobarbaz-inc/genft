//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./DataTypes.sol";
import "./TextConditionalImageGeneration.sol";
import "./IMLClient.sol";

contract EvolvingNFT is ERC721URIStorage, IMLClient {

    address private owner;
    address public model;
    uint256 public currentTokenId;
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of inference
    string public loadingImg;

    function price() public view returns(uint256) {
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        uint inferencePrice = modelContract.price();
        uint256 totalPrice = mintPriceToThisContract + inferencePrice;
        return(totalPrice);
    }

    mapping (uint256 => string) tokenIdToDataInput;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address owner_,
        address model_,
        uint256 price_,
        string memory loadingImg_

    ) ERC721("EvolvingNFT", "EVO") {
        owner = owner_;
        model = model_;
        mintPriceToThisContract = price_;
        loadingImg = loadingImg_;
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
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        uint inferencePrice = modelContract.price();
        modelContract.run{value: inferencePrice}(
            prompt, // text prompt passed in
            currentTokenId, // current token ID acts as "callback ID for this job"
            abi.encodePacked(to), // this is the random seed passed in (wallet address)
            DataTypes.OutputDataFormat.NFTMeta // tells the worker to put the output in NFT format
        );
        tokenIdToDataInput[currentTokenId] = prompt;
        _setTokenURI(currentTokenId, loadingImg);
        return currentTokenId;
    }

    function setMintPriceToThisContract(uint256 price_) external onlyOwner {
        mintPriceToThisContract = price_;
    }

    function setOutput(
        uint256 id,
        string memory location
    ) external override {
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        address oracle = modelContract.oracle();
        require(msg.sender == oracle, "Not oracle");
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
            TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
            uint inferencePrice = modelContract.price();
            modelContract.run{value: inferencePrice}(
                tokenIdToDataInput[currentTokenId], // text prompt passed in
                tokenId, // token ID acts as "callback ID for this job"
                abi.encodePacked(to), // use recipient address as seed for new generation
                DataTypes.OutputDataFormat.NFTMeta // tells the worker to put the output in NFT format
            );
            _setTokenURI(currentTokenId, loadingImg);
        }
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function setLoadingImage(string memory newLoadingImg) external onlyOwner {
        loadingImg = newLoadingImg;
    }
}

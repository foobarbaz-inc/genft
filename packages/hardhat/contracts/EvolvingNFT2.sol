//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./DataTypes.sol";
import "./TextConditionalImageGeneration.sol";

contract EvolvingNFT2 is ERC721, ERC721Enumerable, ERC721URIStorage {

    address private owner;
    address public model;
    uint256 public currentTokenId;
    uint256 public currentActionId;
    uint256 mintPriceToThisContract; // This is just the price of minting, it doesn't include the price of inference
    string public loadingImg;

    function price() public view returns(uint256) {
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        uint inferencePrice = modelContract.price();
        uint256 totalPrice = mintPriceToThisContract + inferencePrice;
        return(totalPrice);
    }

    mapping (uint256 => string) public actionIdToActionText;
    mapping (uint256 => string) public actionIdToPrompt;
    mapping (uint256 => uint256[]) public tokenIdToActionIds;
    mapping (uint256 => uint256) public tokenIdToCurrentActionId;

    event TokenUriSet(uint256 tokenId, string tokenURI);

    constructor(
        address owner_,
        address model_,
        uint256 price_,
        string memory loadingImg_

    ) ERC721("EvolvingNFT2", "EV2") {
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
    function mint(address to, string[] memory actions, string[] memory prompts, uint256 defaultActionIndex) external payable returns (uint) {
        require(msg.value >= price(), "Insufficient payment for minting");
        require(prompts.length == actions.length, "Prompts must equal actions");
        require(defaultActionIndex < actions.length, "Default action must be included");
        currentTokenId++;
        currentActionId++;
        uint256[] storage actionIds = tokenIdToActionIds[currentTokenId];
        for (uint256 i = 0; i < prompts.length; i++) {
            if (i == defaultActionIndex) {
                tokenIdToCurrentActionId[currentTokenId] = currentActionId;
            }
            actionIdToActionText[currentActionId] = actions[i];
            actionIdToPrompt[currentActionId] = prompts[i];
            actionIds[i] = currentActionId;
            currentActionId++;
        }
        _mint(to, currentTokenId);
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        uint inferencePrice = modelContract.price();
        modelContract.run{value: inferencePrice}(
            prompts[defaultActionIndex], // text prompt passed in
            currentTokenId, // current token ID acts as "callback ID for this job"
            this.setOutput.selector, // this is the callback function selector
            abi.encodePacked(to), // this is the random seed passed in (wallet address)
            DataTypes.OutputDataFormat.NFTMeta // tells the worker to put the output in NFT format
        );
        _setTokenURI(currentTokenId, loadingImg);
        return currentTokenId;
    }

    function setMintPriceToThisContract(uint256 price_) external onlyOwner {
        mintPriceToThisContract = price_;
    }

    function regenerate(uint256 tokenId, uint256 actionId) external payable returns (uint256) {
        require(msg.value >= price(), "Insufficient payment for regeneration");
        require(ownerOf(tokenId) == msg.sender, "Not allowed");
        uint256[] storage actions = tokenIdToActionIds[tokenId];
        bool foundActionId = false;
        for (uint256 i = 0; i < actions.length; i++) {
            if (actionId == actions[i]) {
                foundActionId = true;
            }
        }
        require(foundActionId, "Action not associated with this token");
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        uint inferencePrice = modelContract.price();
        modelContract.run{value: inferencePrice}(
            actionIdToPrompt[actionId], // text prompt passed in
            currentTokenId, // current token ID acts as "callback ID for this job"
            this.setOutput.selector, // this is the callback function selector
            abi.encodePacked(msg.sender), // this is the random seed passed in (wallet address)
            DataTypes.OutputDataFormat.NFTMeta // tells the worker to put the output in NFT format
        );
        _setTokenURI(currentTokenId, loadingImg);
        return currentTokenId;
    }

    function setOutput(
        uint256 id,
        bytes memory location
    ) external {
        TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
        address oracle = modelContract.oracle();
        require(msg.sender == oracle, "Not oracle");
        string memory locationStr = abi.decode(location, (string));
        _setTokenURI(id, locationStr);
        emit TokenUriSet(id, locationStr);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override (ERC721, ERC721Enumerable){
        ERC721Enumerable._beforeTokenTransfer(from, to, tokenId);
        // ignore minting & burning cases
        if (from != address(0) && to != address(0)) {
            // todo figure out where to make this payable,
            // so that inferencePrice doesn't come from contract balance
            TextConditionalImageGeneration modelContract = TextConditionalImageGeneration(model);
            uint inferencePrice = modelContract.price();
            modelContract.run{value: inferencePrice}(
                actionIdToPrompt[tokenIdToCurrentActionId[currentTokenId]], // text prompt passed in
                tokenId, // token ID acts as "callback ID for this job"
                this.setOutput.selector, // this is the callback function selector
                abi.encodePacked(to), // use recipient address as seed for new generation
                DataTypes.OutputDataFormat.NFTMeta // tells the worker to put the output in NFT format
            );
            _setTokenURI(currentTokenId, loadingImg);
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view virtual override (ERC721, ERC721URIStorage) returns (string memory) {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721Enumerable, ERC721) returns (bool) {
        return ERC721Enumerable.supportsInterface(interfaceId) || ERC721.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function setLoadingImage(string memory newLoadingImg) external onlyOwner {
        loadingImg = newLoadingImg;
    }
}

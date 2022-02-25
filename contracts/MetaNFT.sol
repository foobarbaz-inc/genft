//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MetaNFT is ERC721 {
    address private owner;
    string private baseURI;
    uint256 currentTokenId;
    uint256 price;

    mapping (uint256 -> string) tokenIdToLabel;
    mapping (address -> bool) workers;

    event TokenUriSet(address childContract, uint256 tokenId);

    constructor(string memory baseURI_) {
        baseURI = baseURI_;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyWorker() {
        require(workers[msg.sender], "Not a worker");
        _;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function addWorker(address worker_) external onlyOwner {
        workers[worker_] = true;
    }

    function removeWorker(address worker_) external onlyOwner {
        workers[worker_] = false;
    }

    function mint(address to, string memory label) external payable returns (uint) {
        require(msg.value >= price, "Insufficient payment");
        currentTokenId++;
        tokenIdToLabel[currentTokenId] = label;
        _mint(to, currentTokenId);
        // todo: deploy ERC721 contract w/ msg.sender as owner
        // ArtNFT artNFT = new ArtNFT("", msg.sender);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory baseURI = _baseURI();
        // return URI of base URI + label
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenIdToLabel[tokenId]))) : "";
    }

    function setChildTokenUri(address childContract, uint256 tokenId, string memory tokenUri) external onlyWorker {

    }
}

//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ArtNFT is ERC721URIStorage {
    address private owner;
    address private parent;
    bool private initialized;
    uint256 currentTokenId;
    uint256 price;

    event TokenMinted(address to, uint256 blockTimestamp, uint256 tokenId);

    constructor() ERC721("GENft", "GEN") {}

    function initialize(
        address parent_,
        address owner_
    ) external {
        require(!initialized, "Already initialized");
        parent = parent_;
        owner = owner_;
        initialized = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyParent() {
        require(msg.sender == parent, "Not the parent");
        _;
    }

    // todo add optional mint gating settable by owner
    function mint(address to) external payable returns (uint) {
        require(msg.value >= price, "Insufficient payment");
        currentTokenId++;
        _mint(to, currentTokenId);
        emit TokenMinted(to, block.timestamp, currentTokenId);
        return currentTokenId;
    }

    function setPrice(uint256 price_) external onlyOwner {
        price = price_;
    }

    function setTokenURI(uint256 tokenId_, string memory tokenURI_) external onlyParent {
        _setTokenURI(tokenId_, tokenURI_);
    }
}

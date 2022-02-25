//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ArtNFT is ERC721 {
    address private owner;
    address private parent;
    string private baseURI;
    uint256 currentTokenId;
    uint256 price;

    event TokenMinted(address to, uint256 blockTimestamp, uint256 tokenId);

    constructor(string memory baseURI_, address parent_, address owner_) {
        baseURI = baseURI_;
        parent = parent_;
        owner = owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyParent() {
        require(msg.sender == parent, "Not the parent");
        _;
    }

    function mint(address to) external payable returns (uint) {
        require(msg.value >= price, "Insufficient payment");
        currentTokenId++;
        _mint(to, currentTokenId);
        emit TokenMinted(to, block.timestamp, currentTokenId);
    }

    function setPrice(uint256 price_) external onlyOwner {
        price = price_;
    }

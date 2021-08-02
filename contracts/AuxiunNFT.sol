// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AuxiunNFT is Ownable, ERC721 {
    struct Metadata {
        string game_id;
        string item_id;
    }

    struct MarketDetails {
        bool forSale;
        uint256 price;
    }

    // mapping of tokenId to market details
    mapping(uint256 => MarketDetails) tokenId_to_marketDetails;

    // mapping of tokenId to metadata
    mapping(uint256 => Metadata) id_to_metadata;

    // mapping of tokenId to Owner
    mapping(uint256 => address) id_to_owner;

    // Base URI, aka API link to fetch further metadata of the token
    string private baseURI;

    // Used as tokenId for a newly minted token and increases by 1
    uint256 private tokenIdCounter = 0;

 
    constructor() ERC721("AuxiunNFT", "AUXN") {
        // TODO: Setup database api server and set the link here, remember to add the "/" at the end of the uri
        baseURI = "https://todo/";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory inputbaseURI) public onlyOwner {
        baseURI = inputbaseURI;
    }

    // function standard called by NFT marketplaces such as OpenSea
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return strConcat(_baseURI(), id_to_metadata[tokenId].game_id, "/", id_to_metadata[tokenId].item_id, "");
    }

    function mint(
        string memory game_id,
        string memory item_id
    ) external {
        uint256 tokenId = tokenIdCounter;
        tokenIdCounter++;
        id_to_metadata[tokenId] = Metadata(game_id, item_id);

        _safeMint(msg.sender, tokenId);
    }

    // String concatenation function
    // original source: https://github.com/provable-things/ethereum-api/blob/master/oraclizeAPI_0.5.sol
    // stack overflow topic: https://ethereum.stackexchange.com/questions/729/how-to-concatenate-strings-in-solidity
    // Notes: reduce the parameters if necessary
    function strConcat(string memory _a, string memory _b, string memory _c, string memory _d, string memory _e) internal pure returns (string memory){
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        bytes memory _bc = bytes(_c);
        bytes memory _bd = bytes(_d);
        bytes memory _be = bytes(_e);
        string memory abcde = new string(_ba.length + _bb.length + _bc.length + _bd.length + _be.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) babcde[k++] = _ba[i];
        for (uint i = 0; i < _bb.length; i++) babcde[k++] = _bb[i];
        for (uint i = 0; i < _bc.length; i++) babcde[k++] = _bc[i];
        for (uint i = 0; i < _bd.length; i++) babcde[k++] = _bd[i];
        for (uint i = 0; i < _be.length; i++) babcde[k++] = _be[i];
        return string(babcde);
    }

    modifier tokenExists(uint256 tokenId) {
        require(_exists(tokenId));
        _;
    }

    modifier belongsToSender(uint256 tokenId){
        require(id_to_owner[tokenId] == msg.sender);
        _;
    }

    function listTokenForSale(uint256 tokenId, uint256 price) external tokenExists(tokenId) belongsToSender(tokenId){
        tokenId_to_marketDetails[tokenId] = MarketDetails(true, price);
    }

    function removeTokenFromMarket(uint256 tokenId) external tokenExists(tokenId) belongsToSender(tokenId){
        tokenId_to_marketDetails[tokenId] = MarketDetails(false, 0);
    }

    function purchaseToken(uint256 tokenId, uint256 price) external {

    }

    function getTokensForSale() external {

    }

    function kill() public onlyOwner {
        selfdestruct(payable(owner()));
    }
}

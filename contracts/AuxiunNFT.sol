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
        address seller;
    }


    // mapping of tokenId to market details
    mapping(uint256 => MarketDetails) id_to_marketDetails;

    // mapping of tokenId to metadata
    mapping(uint256 => Metadata) id_to_metadata;

    // mapping of tokenId to Owner
    mapping(uint256 => address) id_to_owner;

    // mapping of users balances
    mapping(address => uint256) private userBalances;

    // Base URI, aka API link to fetch further metadata of the token
    string private baseURI;

    // Used as tokenId for a newly minted token and increases by 1
    uint256 private tokenIdCounter = 0;

    // Number of NFTs on market (Maybe for future use)
    uint256 NFTsOnMarket = 0;

 
    constructor() ERC721("AuxiunNFT", "AUXN") {
        // TODO: Setup database api server and set the link here, remember to add the "/" at the end of the uri
        baseURI = "http://54.153.182.13:3998/api/nft/";
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


    // Modifers

    modifier tokenExists(uint256 tokenId) {
        require(_exists(tokenId));
        _;
    }

    modifier belongsToSender(uint256 tokenId){
        require(id_to_owner[tokenId] == msg.sender);
        _;
    }

    // Helper Functions for NFTs on the market.

    function _removeNFTfromMarket(uint tokenId) private tokenExists(tokenId) {
        require(id_to_marketDetails[tokenId].seller == msg.sender, "Not the original owner of this NFT.");
        id_to_marketDetails[tokenId] = MarketDetails(false, 0, address(0));
        NFTsOnMarket--;

        // transfer token back to owner
        _safeTransfer(address(this), msg.sender, tokenId, "");
    }
  
    // Functions for market place interactions.
    function listNFTOnMarket(uint256 tokenId, uint256 price) external tokenExists(tokenId) belongsToSender(tokenId){
        id_to_marketDetails[tokenId] = MarketDetails(true, price, msg.sender);
        NFTsOnMarket++;

        // transfer ownership of tokenId to this contract
        _safeTransfer(msg.sender, address(this), tokenId, "");
    }

    function removeNFTFromMarket(uint256 tokenId) external tokenExists(tokenId) belongsToSender(tokenId){
        _removeNFTfromMarket(tokenId);
    }


    

   // Source: https://ethereum.stackexchange.com/questions/19341/address-send-vs-address-transfer-best-practice-usage/74007#74007
    function purchaseNFT(uint256 tokenId) public payable tokenExists(tokenId) {
        require(id_to_marketDetails[tokenId].forSale);
        require(id_to_marketDetails[tokenId].price <= msg.value);

        // Remove NFT form market
        _removeNFTfromMarket(tokenId);

        // Transfer fund from NFT buyer to contract
        (bool successTo, ) =  address(this).call{value: msg.value}("");
        require(successTo, "Failed to send ETH to contract");

        // Transfer fund from contract to NFT seller
        address seller = id_to_owner[tokenId];
        (bool successFrom, ) =  seller.call{value: msg.value}("");
        require(successFrom, "Failed to withdraw ETH from contract");

        // Transfer token to buyer
        _safeTransfer(address(this), msg.sender, tokenId, "");
    }
 
    // returns an array of token ids which are listed as forSale
    function _fetchTokenIdsOnMarket() internal view returns(uint256[] memory) {
        // initialize result's array length
        uint256[] memory result = new uint256[](NFTsOnMarket);
        // for loop to fetch all tokenIds where id_to_marketDetails[i].forSale == true
        uint256 counter = 0;
        for (uint256 i = 0; i < tokenIdCounter; i++) {
            // only tokenIds which are for sale will be pushed into the result array
            if (id_to_marketDetails[i].forSale) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }

    // fetch by order: tokenURI, token price, token seller's address
    function fetchNFTDataById(uint256 tokenId) external view returns(string memory, uint256, address) {
        return (tokenURI(tokenId), id_to_marketDetails[tokenId].price, id_to_marketDetails[tokenId].seller);
    }

    /**
    * Returns 4 arrays of all tokens on sale which are:
    * 1. array of tokenIds
    * 2. array of tokenURIs
    * 3. array of token prices
    * 4. array of token sellers
    */
    function multiCallNFTsOnMarket() external view returns(uint256[] memory, string[] memory, uint256[] memory, address[] memory) {
        // initialize tokenIds' array length
        uint256[] memory tokenIds = new uint256[](NFTsOnMarket);
        // fetch the tokenIds on the market
        tokenIds = _fetchTokenIdsOnMarket();

        // initialize array for tokenURIs, prices and sellers
        string[] memory tokenURIs = new string[](NFTsOnMarket);
        uint256[] memory tokenPrices = new uint256[](NFTsOnMarket);
        address[] memory tokenSellers = new address[](NFTsOnMarket);

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        for (uint256 i = 0; i < NFTsOnMarket; i++) {
            tokenURIs[i] = tokenURI(tokenIds[i]);
            tokenPrices[i] = id_to_marketDetails[tokenIds[i]].price;
            tokenSellers[i] = id_to_marketDetails[tokenIds[i]].seller;
        }
        
        return (tokenIds, tokenURIs, tokenPrices, tokenSellers);
    }

    function kill() public onlyOwner {
        selfdestruct(payable(owner()));
    }
}

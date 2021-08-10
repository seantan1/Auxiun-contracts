// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract AuxiunNFT is Ownable, ERC721, IERC721Receiver {

    struct Metadata {
        string game_id;
        string item_id;
    }

    struct MarketDetails {
        bool forSale;
        uint256 price;
        address seller;
    }

    struct TransactionHistory {
        uint256 tokenId;
        address buyer;
        address seller;
        uint256 price;
        uint256 timestamp;
    }

    // mapping of tokenId to market details
    mapping(uint256 => MarketDetails) id_to_marketDetails;

    // mapping of tokenId to metadata
    mapping(uint256 => Metadata) id_to_metadata;

    // array which stores all transaction data
    TransactionHistory[] transactionHistory;

    mapping(address => uint256) transactionHistoryCount;

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

    function mint(address to, string memory game_id, string memory item_id) external {
        uint256 tokenId = tokenIdCounter;
        tokenIdCounter++;
        id_to_metadata[tokenId] = Metadata(game_id, item_id);
        _safeMint(to, tokenId);
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
        require(_exists(tokenId), "Token ID does not exist.");
        _;
    }

    modifier belongsToSender(uint256 tokenId){
        require(ownerOf(tokenId) == msg.sender, "Token does not belong to sender.");
        _;
    }

    // Helper Functions for NFTs on the market.
    function _removeNFTfromMarket(uint tokenId) private tokenExists(tokenId) {
        id_to_marketDetails[tokenId] = MarketDetails(false, 0, address(0));
        NFTsOnMarket--;
    }
  

    // Functions for market place interactions.
    function listNFTOnMarket(uint256 tokenId, uint256 price) external payable tokenExists(tokenId) belongsToSender(tokenId){
        id_to_marketDetails[tokenId] = MarketDetails(true, price, msg.sender);
        NFTsOnMarket++;

        // transfer ownership of tokenId to this contract
        _safeTransfer(msg.sender, address(this), tokenId, "");
    }

    function removeNFTFromMarket(uint256 tokenId) external tokenExists(tokenId) {
        require(id_to_marketDetails[tokenId].seller == msg.sender, "Not the original owner of this NFT.");
        _removeNFTfromMarket(tokenId);

        // transfer token back to owner
        _safeTransfer(address(this), msg.sender, tokenId, "");
    }


   // Source: https://ethereum.stackexchange.com/questions/19341/address-send-vs-address-transfer-best-practice-usage/74007#74007
    function purchaseNFT(uint256 tokenId) public payable tokenExists(tokenId) returns(address, address, uint256, uint256) {
        require(id_to_marketDetails[tokenId].seller != msg.sender, "Can not purchase your own NFTs.");
        require(id_to_marketDetails[tokenId].forSale, "NFT not for sale");
        require(id_to_marketDetails[tokenId].price <= msg.value, "Insufficient funds for purchase.");

        // Get seller Id
        address seller = id_to_marketDetails[tokenId].seller;

        // get price
        uint256 price = id_to_marketDetails[tokenId].price;

        // Remove NFT from market - do this before transferring ETH to prevent reentrancy
        _removeNFTfromMarket(tokenId);

        // Transfer fund from NFT buyer to NFT Seller
        (bool success, ) =  seller.call{value: msg.value}("");
        require(success, "Failed to send ETH to Seller");

        // Transfer token to buyer
        _safeTransfer(address(this), msg.sender, tokenId, "");

        // push transaction data into transactionHistory
        transactionHistory.push(TransactionHistory(tokenId, msg.sender, seller, price, block.timestamp));

        // increase transactionHistoryCount for both buyer and seller
        transactionHistoryCount[msg.sender]++;
        transactionHistoryCount[seller]++;
        
        // Return some info about the transfer
        return (msg.sender, seller, tokenId, msg.value);
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
    * Multicall function to fetch all NFTs listed for sale on the market
    * Returns 4 arrays of all tokens for sale which are:
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

    // overloaded Multicall function to fetch NFTs listed on sale for a specific user's address
    function multiCallNFTsOnMarket(address seller) external view returns(uint256[] memory, string[] memory, uint256[] memory, address[] memory) {
        // initialize tokenIds' array length
        uint256[] memory tokenIds = new uint256[](balanceOf(seller));
        // fetch the tokenIds on the market
        tokenIds = _fetchTokenIdsOnMarket();

        // initialize array for tokenURIs, prices and sellers
        string[] memory tokenURIs = new string[](balanceOf(seller));
        uint256[] memory tokenPrices = new uint256[](balanceOf(seller));
        address[] memory tokenSellers = new address[](balanceOf(seller));

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < NFTsOnMarket; i++) {
            if (seller == ownerOf(tokenIds[i])) {
                tokenURIs[counter] = tokenURI(tokenIds[i]);
                tokenPrices[counter] = id_to_marketDetails[tokenIds[i]].price;
                tokenSellers[counter] = id_to_marketDetails[tokenIds[i]].seller;
                counter++;
            }
        }
        
        return (tokenIds, tokenURIs, tokenPrices, tokenSellers);
    }

    // Multicall functions to fetch transaction data
    // fetch transaction data by user's address
    function multiCallTransactionDataByUser(address user) external view returns(uint256[] memory, uint256[] memory, address[] memory, address[] memory, uint256[] memory, uint256[] memory) {
        // initialize array for tokenURIs, prices and sellers
        uint256[] memory transactionIds = new uint256[](transactionHistoryCount[user]);
        uint256[] memory tokenIds = new uint256[](transactionHistoryCount[user]);
        address[] memory buyers = new address[](transactionHistoryCount[user]);
        address[] memory sellers = new address[](transactionHistoryCount[user]);
        uint256[] memory prices = new uint256[](transactionHistoryCount[user]);
        uint256[] memory timestamps = new uint256[](transactionHistoryCount[user]);

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < transactionHistory.length; i++) {
            if (user == transactionHistory[i].buyer || user == transactionHistory[i].seller) {
                transactionIds[counter] = i;
                tokenIds[counter] = transactionHistory[i].tokenId;
                buyers[counter] = transactionHistory[i].buyer;
                sellers[counter] = transactionHistory[i].seller;
                prices[counter] = transactionHistory[i].price;
                timestamps[counter] = transactionHistory[i].timestamp;

                counter++;
            }
        }
        
        return (transactionIds, tokenIds, buyers, sellers, prices, timestamps);
    }

    function kill() public onlyOwner {
        selfdestruct(payable(owner()));
    }

    receive() external payable {
        // this function enables the contract to receive funds
        // Nothing needed here
    }

    /** Needed for calling safeTransferFrom */
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

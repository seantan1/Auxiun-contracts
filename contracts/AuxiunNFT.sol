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
    mapping(uint256 => MarketDetails) public id_to_marketDetails;

    // mapping of tokenId to metadata
    mapping(uint256 => Metadata) public id_to_metadata;

    // array which stores all transaction data
    TransactionHistory[] public transactionHistory;

    // transactionHistory counter for addresses to determine the multicall memory array size
    mapping(address => uint256) public transactionHistoryCount;

    // list of admin addresses authorized to mint tokens
    mapping(address => bool) public admins;

    // Base URI, aka API link to fetch further metadata of the token
    string private baseURI;

    // Used as tokenId for a newly minted token and increases by 1
    uint256 public tokenIdCounter = 0;

    // Number of NFTs on market (Maybe for future use)
    uint256 public NFTsOnMarket = 0;

    // Number of NFTs on market by address
    mapping(address => uint256) public NFTsOnMarketByAddress;
 
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
        require(admins[msg.sender], "Not authorized to call this function.");
        uint256 tokenId = tokenIdCounter;
        tokenIdCounter++;
        id_to_metadata[tokenId] = Metadata(game_id, item_id);
        _safeMint(to, tokenId);
    }

    // get transactionHistory length for multicall function
    function getTransactionHistoryLength() public view returns (uint256) {
        return transactionHistory.length;
    }

    // functions to handle admins array
    function addAdminAddress(address _address) external onlyOwner() {
        admins[_address] = true;
    }

    function removeAdminAddress(address _address) external onlyOwner() {
        admins[_address] = false;
    }

    function isAdminAddress(address _address) external view returns (bool) {
        return admins[_address];
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
    function _removeNFTfromMarket(uint tokenId, address _address) private tokenExists(tokenId) {
        id_to_marketDetails[tokenId] = MarketDetails(false, 0, address(0));
        // decrease the number of NFTs on market of the user
        NFTsOnMarketByAddress[_address]--;
        NFTsOnMarket--;
    }
  

    // Functions for market place interactions.
    function listNFTOnMarket(uint256 tokenId, uint256 price) external payable tokenExists(tokenId) belongsToSender(tokenId){
        id_to_marketDetails[tokenId] = MarketDetails(true, price, msg.sender);
        // increase the number of NFTs on market of the user
        NFTsOnMarketByAddress[msg.sender]++;
        NFTsOnMarket++;

        // transfer ownership of tokenId to this contract
        _safeTransfer(msg.sender, address(this), tokenId, "");
    }

    function removeNFTFromMarket(uint256 tokenId) external tokenExists(tokenId) {
        require(id_to_marketDetails[tokenId].seller == msg.sender, "Not the original owner of this NFT.");
        _removeNFTfromMarket(tokenId, msg.sender);

        // transfer token back to owner
        _safeTransfer(address(this), msg.sender, tokenId, "");
    }


   // Source: https://ethereum.stackexchange.com/questions/19341/address-send-vs-address-transfer-best-practice-usage/74007#74007
    function purchaseNFT(uint256 tokenId) public payable tokenExists(tokenId) {
        require(id_to_marketDetails[tokenId].seller != msg.sender, "Can not purchase your own NFTs.");
        require(id_to_marketDetails[tokenId].forSale, "NFT not for sale");
        require(id_to_marketDetails[tokenId].price <= msg.value, "Insufficient funds for purchase.");

        // Get seller Id
        address seller = id_to_marketDetails[tokenId].seller;

        // get price
        uint256 price = id_to_marketDetails[tokenId].price;

        // Remove NFT from market - do this before transferring ETH to prevent reentrancy
        _removeNFTfromMarket(tokenId, id_to_marketDetails[tokenId].seller);

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
    }

    // fetch by order: tokenURI, token price, token seller's address
    function fetchNFTDataById(uint256 tokenId) external view returns(string memory, uint256, address) {
        return (tokenURI(tokenId), id_to_marketDetails[tokenId].price, id_to_marketDetails[tokenId].seller);
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

contract AuxiunNFTMulticall {
    AuxiunNFT auxiunNFTContract;

    function setNFTContractAddress(address _address) public {
        auxiunNFTContract = AuxiunNFT(payable(_address));
    }

    // returns an array of token ids which are listed as forSale
    function _fetchTokenIdsOnMarket() internal view returns(uint256[] memory) {
        // initialize result's array length
        uint256[] memory result = new uint256[](auxiunNFTContract.NFTsOnMarket());
        // for loop to fetch all tokenIds where id_to_marketDetails[i].forSale == true
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.tokenIdCounter(); i++) {
            // only tokenIds which are for sale will be pushed into the result array
            bool forSale;
            (forSale,,) = auxiunNFTContract.id_to_marketDetails(i);
            if (forSale) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }

    /**
    * Multicall function to fetch all NFTs owned by an address
    * Returns 2 arrays which are:
    * 1. array of tokenIds owned by the address
    * 2. array of tokenURIs of the respective tokenIds
    */
    function multiCallNFTsOwnedByAddress(address _address) external view returns(uint256[] memory, string[] memory) {
        require(auxiunNFTContract.tokenIdCounter() > 0, "No NFTs exist");

        // initialize array lengths
        uint256[] memory tokenIds = new uint256[](auxiunNFTContract.balanceOf(_address));
        string[] memory tokenURIs = new string[](auxiunNFTContract.balanceOf(_address));

        // since tokenIdCounter increments after each new mint we don't need to + 1
        uint256 totalNumberOfNFTs = auxiunNFTContract.tokenIdCounter();

        uint256 counter = 0;

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        for (uint256 i = 0; i < totalNumberOfNFTs; i++) {
            if (_address == auxiunNFTContract.ownerOf(i)) {
                tokenIds[counter] = i;
                tokenURIs[counter] = auxiunNFTContract.tokenURI(i);
                counter++;
            }
        }
        
        return (tokenIds, tokenURIs);
    }

    /**
    * Multicall function to fetch all NFTs listed for sale on the market
    * Returns 4 arrays which are:
    * 1. array of tokenIds
    * 2. array of tokenURIs
    * 3. array of token prices
    * 4. array of token sellers
    */
    function multiCallNFTsOnMarket() external view returns(uint256[] memory, string[] memory, uint256[] memory, address[] memory) {
        // initialize tokenIds' array length
        uint256[] memory tokenIds = new uint256[](auxiunNFTContract.NFTsOnMarket());
        // fetch the tokenIds on the market
        tokenIds = _fetchTokenIdsOnMarket();

        // initialize array for tokenURIs, prices and sellers
        string[] memory tokenURIs = new string[](auxiunNFTContract.NFTsOnMarket());
        uint256[] memory tokenPrices = new uint256[](auxiunNFTContract.NFTsOnMarket());
        address[] memory tokenSellers = new address[](auxiunNFTContract.NFTsOnMarket());

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        for (uint256 i = 0; i < auxiunNFTContract.NFTsOnMarket(); i++) {
            uint256 _price;
            address _seller;
            (,_price, _seller) = auxiunNFTContract.id_to_marketDetails(tokenIds[i]);
            tokenURIs[i] = auxiunNFTContract.tokenURI(tokenIds[i]);
            tokenPrices[i] = _price;
            tokenSellers[i] = _seller;
        }
        
        return (tokenIds, tokenURIs, tokenPrices, tokenSellers);
    }

    // overloaded Multicall function to fetch NFTs listed on sale for a specific user's address
    function multiCallNFTsOnMarket(address seller) external view returns(uint256[] memory, string[] memory, uint256[] memory, address[] memory) {
        // initialize tokenIds' array length
        uint256[] memory tokenIds = new uint256[](auxiunNFTContract.NFTsOnMarketByAddress(seller));
        // fetch the tokenIds on the market
        tokenIds = _fetchTokenIdsOnMarket();

        // initialize array for tokenURIs, prices and sellers
        string[] memory tokenURIs = new string[](auxiunNFTContract.NFTsOnMarketByAddress(seller));
        uint256[] memory tokenPrices = new uint256[](auxiunNFTContract.NFTsOnMarketByAddress(seller));
        address[] memory tokenSellers = new address[](auxiunNFTContract.NFTsOnMarketByAddress(seller));

        // for loop to fetch all data of tokenIds and push into the 3 arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.NFTsOnMarket(); i++) {
            uint256 _price;
            address _seller;
            (,_price, _seller) = auxiunNFTContract.id_to_marketDetails(tokenIds[i]);
            if (seller == _seller) {
                tokenURIs[counter] = auxiunNFTContract.tokenURI(tokenIds[i]);
                tokenPrices[counter] = _price;
                tokenSellers[counter] = _seller;
                counter++;
            }
        }
        return (tokenIds, tokenURIs, tokenPrices, tokenSellers);
    }

  

    function multiCallTransactionDataByUser(address user) external view 
    returns(uint256[] memory, address[] memory, address[] memory,
             uint256[] memory, uint256[] memory, bool[] memory) {
        return (singleCallTransactionDataByUserTokenIds(user), 
                singleCallTransactionDataByUserBuyers(user), 
                singleTransactionDataByUserSellers(user), 
                singleCallTransactionDataByUserPrices(user), 
                singleCallTransactionDataByUserTimestamps(user), 
                singleCallTransactionDataByUserTransactionType(user));
    }

    // single functions to be combined in the multiCallTransactionDataByUser() multicall function
    function singleCallTransactionDataByUserTokenIds(address user) internal view returns(uint256[] memory) {
        // initialize return array
        uint256[] memory tokenIds = new uint256[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            uint256 _tokenId;
            address _buyer;
            address _seller;
            (_tokenId, _buyer, _seller,,) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                tokenIds[counter] = _tokenId;
                counter++;
            }
        }
        return tokenIds;
    }

    function singleCallTransactionDataByUserBuyers(address user) internal view returns(address[] memory) {
        // initialize return array
        address[] memory buyers = new address[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            uint256 _tokenId;
            address _buyer;
            address _seller;
            (_tokenId, _buyer, _seller,,) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                buyers[counter] = _buyer;
                counter++;
            }
        }
        return buyers;
    }

    function singleTransactionDataByUserSellers(address user) internal view returns(address[] memory) {
        // initialize return array
        address[] memory sellers = new address[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            uint256 _tokenId;
            address _buyer;
            address _seller;
            (_tokenId, _buyer, _seller,,) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                sellers[counter] = _seller;
                counter++;
            }
        }
        return sellers;
    }

    function singleCallTransactionDataByUserPrices(address user) internal view returns(uint256[] memory) {
        // initialize return arrays
        uint256[] memory prices = new uint256[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            address _buyer;
            address _seller;
            uint256 _price;
            (, _buyer, _seller, _price,) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                prices[counter] = _price;
                counter++;
            }
        }
        return (prices);
    }

    function singleCallTransactionDataByUserTimestamps(address user) internal view returns(uint256[] memory) {
        // initialize return array
        uint256[] memory timestamps = new uint256[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            address _buyer;
            address _seller;
            uint256 _timestamp;
            (, _buyer, _seller,, _timestamp) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                timestamps[counter] = _timestamp;
                counter++;
            }
        }
        return timestamps;
    }

    function singleCallTransactionDataByUserTransactionType(address user) internal view returns(bool[] memory) {
        // initialize return array
        // transactionType = true: it is a buy transaction for the user
        // transacitonType = false: it is a sell transaction for the user
        bool[] memory transactionType = new bool[](auxiunNFTContract.transactionHistoryCount(user));

        // for loop to fetch all data of tokenIds and push into the arrays
        uint256 counter = 0;
        for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
            address _buyer;
            address _seller;
            (, _buyer, _seller,,) = auxiunNFTContract.transactionHistory(i);
            if (user == _buyer|| user == _seller) {
                // determine transactionType
                if (user == _buyer) {
                    transactionType[counter] = true;
                }
                else {
                    transactionType[counter] = false;
                }
                counter++;
            }
        }
        return transactionType;
    }
}

  /**
    * Multicall functions to fetch transaction data
    * fetch transaction data by user's address
    * Returns 6 arrays sale which are:
    * 1. array of tokenIds
    * 2. array of buyers
    * 3. array of sellers
    * 4. array of prices
    * 5. array of timestamps
    * 6. array of transacitonType - true: buy ; false: sell
    */
    // function multiCallTransactionDataByUser(address user) external view returns(uint256[] memory, address[] memory, address[] memory, uint256[] memory, uint256[] memory, bool[] memory) {
    //     // initialize return arrays
    //     uint256[] memory tokenIds = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     address[] memory buyers = new address[](auxiunNFTContract.transactionHistoryCount(user));
    //     address[] memory sellers = new address[](auxiunNFTContract.transactionHistoryCount(user));
    //     uint256[] memory prices = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     uint256[] memory timestamps = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     // transactionType = true: it is a buy transaction for the user
    //     // transacitonType = false: it is a sell transaction for the user
    //     bool[] memory transactionType = new bool[](auxiunNFTContract.transactionHistoryCount(user));

    //     // for loop to fetch all data of tokenIds and push into the arrays
    //     uint256 counter = 0;
    //     for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
    //         uint256 _tokenId;
    //         address _buyer;
    //         address _seller;
    //         uint256 _price;
    //         uint256 _timestamp;
    //         (_tokenId, _buyer, _seller, _price, _timestamp) = auxiunNFTContract.transactionHistory(i);
    //         if (user == _buyer|| user == _seller) {
    //             tokenIds[counter] = _tokenId;
    //             buyers[counter] = _buyer;
    //             sellers[counter] = _seller;
    //             prices[counter] = _price;
    //             timestamps[counter] = _timestamp;

    //             // determine transactionType
    //             if (user == _buyer) {
    //                 transactionType[counter] = true;
    //             }
    //             else {
    //                 transactionType[counter] = false;
    //             }
    //             counter++;
    //         }
    //     }
        
    //     return (tokenIds, buyers, sellers, prices, timestamps, transactionType);
    // }


    // function multiCallTransactionDataByUserPartA(address user) internal view returns(uint256[] memory,  address[] memory, address[] memory) {
    //     // initialize return arrays
    //     uint256[] memory tokenIds = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     address[] memory buyers = new address[](auxiunNFTContract.transactionHistoryCount(user));
    //     address[] memory sellers = new address[](auxiunNFTContract.transactionHistoryCount(user));

    //     // for loop to fetch all data of tokenIds and push into the arrays
    //     uint256 counter = 0;
    //     for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
    //         uint256 _tokenId;
    //         address _buyer;
    //         address _seller;
    //         (_tokenId, _buyer, _seller,,) = auxiunNFTContract.transactionHistory(i);
    //         if (user == _buyer|| user == _seller) {
    //             tokenIds[counter] = _tokenId;
    //             buyers[counter] = _buyer;
    //             sellers[counter] = _seller;
    //             counter++;
    //         }
    //     }
    //     return (tokenIds, buyers, sellers);
    // }

    // function multiCallTransactionDataByUserPartB(address user) internal view returns(uint256[] memory, uint256[] memory, bool[] memory) {
    //     // initialize return arrays
    //     uint256[] memory prices = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     uint256[] memory timestamps = new uint256[](auxiunNFTContract.transactionHistoryCount(user));
    //     // transactionType = true: it is a buy transaction for the user
    //     // transacitonType = false: it is a sell transaction for the user
    //     bool[] memory transactionType = new bool[](auxiunNFTContract.transactionHistoryCount(user));

    //     // for loop to fetch all data of tokenIds and push into the arrays
    //     uint256 counter = 0;
    //     for (uint256 i = 0; i < auxiunNFTContract.getTransactionHistoryLength(); i++) {
    //         address _buyer;
    //         address _seller;
    //         uint256 _price;
    //         uint256 _timestamp;
    //         (, _buyer, _seller, _price, _timestamp) = auxiunNFTContract.transactionHistory(i);
    //         if (user == _buyer|| user == _seller) {
    //             prices[counter] = _price;
    //             timestamps[counter] = _timestamp;

    //             // determine transactionType
    //             if (user == _buyer) {
    //                 transactionType[counter] = true;
    //             }
    //             else {
    //                 transactionType[counter] = false;
    //             }
    //             counter++;
    //         }
    //     }
    //     return (prices, timestamps, transactionType);
    // }
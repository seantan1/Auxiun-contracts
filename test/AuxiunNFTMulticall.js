const AuxiunNFTMulticall = artifacts.require("AuxiunNFTMulticall")
const AuxiunNFT = artifacts.require("AuxiunNFT")
const utils = require("./helpers/utils")
const BigNumber = require('bignumber.js');  

contract("AuxiunNFTMulticall", (accounts) => {
    let contractInstance;

    let [alice, bob, charlie] = accounts;

    beforeEach(async () => {
        contractInstance = await AuxiunNFT.new()
        multicall = await AuxiunNFTMulticall.new();
        multicall.setNFTContractAddress(contractInstance.address)
    })

    /**
     *  Tests multiCallNFTsOnMarket() and  _fetchTokenIdsOnMarket()
        Should return 4 arrays:
        * 1. array of tokenIds
        * 2. array of tokenURIs
        * 3. array of token prices
        * 4. array of token sellers 
        * 
     */
    it("should get NFT data if they are listed on the market ", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        let baseURI = "https://auxiun-nft-market.com/";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});
        const correctURI = await contractInstance.tokenURI(0);

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Get token details
        const result = await multicall.multiCallNFTsOnMarket();

        // Check details are correct
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), correctURI)
        assert.equal(result[2][0].toString(), '10')
        assert.equal(result[3][0].toString(), alice)
    })

    /**
     * Tests: multiCallNFTsOnMarket() and _removeNFTfromMarket() 
     */
    it("token should be removed from the market after a successful purchase.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:10, from: bob});


        // Token 0 should not be for sale now.
        // fetchNFTById() should set the price of the NFT to 0 and the seller to the zero address.
        const fetchNFTById_result = await contractInstance.fetchNFTDataById(0);
        assert.equal(fetchNFTById_result[1].toString(), "0")
        assert.equal(fetchNFTById_result[2], "0x0000000000000000000000000000000000000000")

        // multiCallNFTsOnMarket() should return empty arrays
        const multiCallNFTsOnMarket_result = await multicall.multiCallNFTsOnMarket();
        assert.equal(multiCallNFTsOnMarket_result[0], '')
        assert.equal(multiCallNFTsOnMarket_result[1], '')
        assert.equal(multiCallNFTsOnMarket_result[2], '')
        assert.equal(multiCallNFTsOnMarket_result[3], '')
    })

   /** Tests: multiCallNFTsOnMarket(seller) */
   it("should get token data by seller when they have listed items", async () => {
        let gameId_1 = "bsg_escape_from_tarkov";
        let itemId_1 = "btc";
        let gameId_2 = "bethesda_skyrim";
        let itemId_2 = "daedric_sword";
        let baseURI = "https://auxiun-nft-market.com/";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.addAdminAddress(alice, {from: alice});
        await contractInstance.mint(alice, gameId_1, itemId_1, {from:alice});
        await contractInstance.mint(alice, gameId_2, itemId_2, {from:alice});
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        await contractInstance.listNFTOnMarket(1, 20, {from: alice});
        const tokenURI_1 = await contractInstance.tokenURI(0)
        const tokenURI_2 = await contractInstance.tokenURI(1)


        const result = await multicall.multiCallNFTsOnMarket(alice)
        
        assert.equal(result[0][0].toString(), "0")
        assert.equal(result[0][1].toString(), "1")
        assert.equal(result[1][0], tokenURI_1)
        assert.equal(result[1][1], tokenURI_2)
        assert.equal(result[2][0].toString(), '10')
        assert.equal(result[2][1].toString(), '20')
    })

    /** Tests: multiCallNFTsOnMarket(seller) */
    it("should not get any token data if a user has not listed any", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});

        const result = await multicall.multiCallNFTsOnMarket(alice)
        assert.equal(result[0], "")
        assert.equal(result[1], "")
        assert.equal(result[2], "")
    })

    /** Tests multiCallTransactionDataByUser() */
    it("should get correct transaction data by user for seller", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        const price = 100;
        await contractInstance.addAdminAddress(charlie);
        await contractInstance.mint(charlie, gameId, itemId, {from:charlie});

        // Charlie lists NFT
        await contractInstance.listNFTOnMarket(0, price, {from: charlie});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:price, from: bob});

        const result = await multicall.multiCallTransactionDataByUser(charlie);

        //  tokenIds, buyers, sellers, prices, timestamps, transactionType
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), bob)
        assert.equal(result[2][0].toString(), charlie)
        assert.equal(result[3][0].toString(), price.toString())
        // Don't need to assert equals for timestamp i.e result[4][0]
        assert.equal(result[5][0], false)
    })

       /** Tests multiCallTransactionDataByUser() */
       it("should get correct transaction data by user for buyer", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        const price = 100;
        await contractInstance.addAdminAddress(charlie);
        await contractInstance.mint(charlie, gameId, itemId, {from:charlie});

        // Charlie lists NFT
        await contractInstance.listNFTOnMarket(0, price, {from: charlie});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:price, from: bob});

        const result = await multicall.multiCallTransactionDataByUser(charlie);

        //  tokenIds, buyers, sellers, prices, timestamps, transactionType
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), bob)
        assert.equal(result[2][0].toString(), charlie)
        assert.equal(result[3][0].toString(), price.toString())
        // Don't need to assert equals for timestamp i.e result[4][0]
        assert.equal(result[5][0], true)
    })
})
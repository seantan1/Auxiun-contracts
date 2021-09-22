const AuxiunNFTMulticall = artifacts.require("AuxiunNFTMulticall")
const AuxiunNFT = artifacts.require("AuxiunNFT")
const utils = require("./helpers/utils")

contract("AuxiunNFTMulticall", (accounts) => {
    let contractInstance;

    let [alice, bob, charlie] = accounts;

    beforeEach(async () => {
        contractInstance = await AuxiunNFT.new()
        await contractInstance.addAdminAddress(alice);

        multicall = await AuxiunNFTMulticall.new();
        multicall.setNFTContractAddress(contractInstance.address)
    })
    afterEach(async () => {
        await contractInstance.kill();
    });


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
        const gameId_1 = "bsg_escape_from_tarkov";
        const itemId_1 = "btc";
        const gameId_2 = "bethesda_skyrim";
        const itemId_2 = "daedric_sword";
        let baseURI = "https://auxiun-nft-market.com/";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.mint(alice, gameId_1, itemId_1, {from:alice});

        // Although this is minted, Alice will not list this NFT
        await contractInstance.mint(alice, gameId_2, itemId_2, {from:alice});
       
        // Alice lists one of her NFTs (token 0)
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        const correctURI = await contractInstance.tokenURI(0);

        // Get token details
        const result = await multicall.multiCallNFTsOnMarket();

        // Check that only 1 NFT is on the market:
        assert.equal(result[0].length, 1)

        // Check details are correct
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), correctURI)
        assert.equal(result[2][0].toString(), '10')
        assert.equal(result[3][0].toString(), alice)
    })

    /**
     * Tests: multiCallNFTsOnMarket() and _removeNFTfromMarket() 
     */
    it("should remove NFT from the market after a successful purchase.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
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
   it("should get NFT data by seller when they have listed them", async () => {
        const gameId_1 = "bsg_escape_from_tarkov";
        const itemId_1 = "btc";
        const gameId_2 = "bethesda_skyrim";
        const itemId_2 = "daedric_sword";
        const gameId_3 = "valve_counter_strike_global_offensive";
        const itemId_3 = "m4a4_howl";
        const baseURI = "https://auxiun-nft-market.com/";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.mint(alice, gameId_1, itemId_1, {from:alice});
        await contractInstance.mint(alice, gameId_2, itemId_2, {from:alice});

        // Although Alice mints this item, this will not be listed
        await contractInstance.mint(alice, gameId_3, itemId_3, {from:alice});

        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        await contractInstance.listNFTOnMarket(1, 20, {from: alice});

        const tokenURI_1 = await contractInstance.tokenURI(0)
        const tokenURI_2 = await contractInstance.tokenURI(1)

        const result = await multicall.multiCallNFTsOnMarket(alice)
        
        // Check that the result returns two NFTs 
        assert.equal(result[0].length, 2)

        // Check the details are correct
        assert.equal(result[0][0].toString(), "0")
        assert.equal(result[0][1].toString(), "1")
        assert.equal(result[1][0], tokenURI_1)
        assert.equal(result[1][1], tokenURI_2)
        assert.equal(result[2][0].toString(), '10')
        assert.equal(result[2][1].toString(), '20')
    })

    /** Tests: multiCallNFTsOnMarket(seller) */
    it("should not get any NFT data if a seller has not listed any on the market", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
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
        await contractInstance.mint(charlie, gameId, itemId, {from:alice});

        // Charlie lists NFT
        await contractInstance.listNFTOnMarket(0, price, {from: charlie});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:price, from: bob});

        // Expected tokenURI
        const expectedTokenURI = await contractInstance.tokenURI(0)

        // Result
        const result = await multicall.multiCallTransactionDataByUser(charlie);

        //  tokenIds,tokenURIs, buyers, sellers, prices, timestamps, transactionType
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), expectedTokenURI)
        assert.equal(result[2][0].toString(), bob)
        assert.equal(result[3][0].toString(), charlie)
        assert.equal(result[4][0].toString(), price.toString())
        // Don't need to assert equals for timestamp i.e result[5][0]
        assert.equal(result[6][0], false)
    })

    /** Tests multiCallTransactionDataByUser() */
    it("should get correct transaction data by user for buyer", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        const price = 100;
        await contractInstance.mint(charlie, gameId, itemId, {from:alice});

        // Charlie lists NFT
        await contractInstance.listNFTOnMarket(0, price, {from: charlie});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:price, from: bob});

        // Expected tokenURI
        const expectedTokenURI = await contractInstance.tokenURI(0)

        // Result
        const result = await multicall.multiCallTransactionDataByUser(bob);

        //  tokenIds, buyers, sellers, prices, timestamps, transactionType
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), expectedTokenURI)
        assert.equal(result[2][0].toString(), bob)
        assert.equal(result[3][0].toString(), charlie)
        assert.equal(result[4][0].toString(), price.toString())
        // Don't need to assert equals for timestamp i.e result[5][0]
        assert.equal(result[6][0], true)
    })


    /**
     * Tests: multiCallNFTsOwnedByAddress()
     */
    it("should get NFTs owned by a specific address if they have NFTs", async () => {

        const gameId_1 = "bsg_escape_from_tarkov";
        const itemId_1 = "btc";
        const gameId_2 = "bethesda_skyrim";
        const itemId_2 = "daedric_sword";
        const gameId_3 = "valve_counter_strike_global_offensive";
        const itemId_3 = "m4a4_howl";
        const baseURI = "https://auxiun-nft-market.com/";
        
        await contractInstance.setBaseURI(baseURI, {from: alice})
        await contractInstance.mint(charlie, gameId_1, itemId_1, {from:alice});
        await contractInstance.mint(charlie, gameId_2, itemId_2, {from:alice});
        await contractInstance.mint(bob, gameId_3, itemId_3, {from:alice});
        const tokenURI_1 = await contractInstance.tokenURI(0)
        const tokenURI_2 = await contractInstance.tokenURI(1)
        const tokenURI_3 = await contractInstance.tokenURI(2)

        const charlie_result = await multicall.multiCallNFTsOwnedByAddress(charlie);
        const bob_result = await multicall.multiCallNFTsOwnedByAddress(bob);

        assert.equal(charlie_result[0][0], "0")
        assert.equal(charlie_result[0][1], "1")
        assert.equal(charlie_result[1][0], tokenURI_1)
        assert.equal(charlie_result[1][1], tokenURI_2)
        assert.equal(bob_result[0][0], "2")
        assert.equal(bob_result[1][0], tokenURI_3)
    })

      /**
     * Tests: multiCallNFTsOwnedByAddress()
     */
    it("should not get any NFTs owned by a specific address if they do not have any", async () => {
        await utils.throws(multicall.multiCallNFTsOwnedByAddress(charlie));
    })
})
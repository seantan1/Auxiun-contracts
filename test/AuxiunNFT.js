const AuxiunNFT = artifacts.require("AuxiunNFT")
const utils = require("./helpers/utils")

contract("AuxiunNFT", (accounts) => {
    let contractInstance;

    let [alice, bob] = accounts;

    beforeEach(async () => {
        contractInstance = await AuxiunNFT.new();
    })

    afterEach(async () => {
        await contractInstance.kill();
    });

    /* 
        Expected Result: Transaction should be successful 
        i.e receipt status == true.
    */
    it("#1 should set the baseURI.", async () => {
        // Set up
        let baseURI = "https://auxiun-nft-market.com";

        // Test setBaseURI()
        const result = await contractInstance.setBaseURI(baseURI);
        assert.equal(result.receipt.status, true);
    })

    /* 
        Expected Result: Transaction should be successful 
        i.e receipt status == true.
    */
    it("#2 should mint an asset, given a gameId and itemId.", async () => {
        // Set up
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";

        // Test mint()
        const result = await contractInstance.mint(gameId, itemId);
        assert.equal(result.receipt.status, true);
    })

    /* 
        Expected Result: TokenURI should return
        a URI structured like the following -
        "<baseURI> + <gameId> + / + <itemId>".
    */
    it("#3 should return an appropriate token URI.", async () => {
        // Set up
        let baseURI = "https://auxiun-nft-market.com/";
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.mint(gameId, itemId);

        // Test tokenURI()
        const result = await contractInstance.tokenURI(0);
        const expected = String(baseURI+gameId+"/"+itemId);
        assert.equal(result, expected);
    })

    /* 
        Expected Result: TokenURI() should throw an error after 
        attempting to get a token URI from a non-existant asset.
    */
    it("#4 should throw an error after attempting to access a non-existent asset.", async () => {
           // Set up
           let baseURI = "https://auxiun-nft-market.com/";
           await contractInstance.setBaseURI(baseURI)

           // Test tokenURI()
           await utils.throws(contractInstance.tokenURI(5))
    })


    /**
     * Tests: listNFTOnMarket(tokenId, price) 
     */ 
    it("#5 should be able list NFT on market.", async () => {

        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
       
        const result = await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        assert.equal(result.receipt.status, true);
    })


    it("#6 should not be able list NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.listNFTOnMarket(0, 10, {from: alice}))
    })


    it("#7 should not be able list NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:bob});
        await utils.throws(contractInstance.listNFTOnMarket(0, 10, {from: alice}))
    })


    /**
     * Tests:  removeNFTFromMarket()
     */
    it("#8 should be able to remove NFT on market if the NFT belongs to the owner", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
       
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        const result = await contractInstance.removeNFTFromMarket(0, {from: alice})
        assert.equal(result.receipt.status, true);
    })

    it("#9 should not be able to remove NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: alice}));
    })

    it("#10 should not be able to remove NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: bob}))
    })


    /**
     * Tests:  purchaseNFT()
     */
    it("#11 buyer should receive NFT after sending the correct amount of funds.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:10, from: bob});

        // Bob should now own the NFT
        result = await contractInstance.ownerOf(0);
        assert.equal(result, bob);
    })


    // NEED TO CHECK AGAIN

    /**
     * Tests purchaseNFT()
     */

    it("#12 seller should receive correct amount of funds after their NFT is purchased.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
    
        await contractInstance.mint(gameId, itemId, {from:alice});

       

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Get balance before the purchase
        const initialBalance = await web3.eth.getBalance(alice);

        
        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:10, from: bob});
      
        // Alice should have a balance of initialBalance + 10
        var expected = parseInt(initialBalance) + 10;
  
        console.log("Initial:  ", parseInt(initialBalance))
        console.log("Expected: ", expected)

        const result = await web3.eth.getBalance(alice);

        console.log("Final:    ", result)
        assert.equal(result, expected.toString());
    })


    it("#13 should throw an error if an attempt to purchase an NFT was made with insufficient funds.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Bob purchases NFT with insufficient funds
        await utils.throws(contractInstance.purchaseNFT(0, {value:5, from: bob}));
    })



    /**
    * Tests: fetchNFTDataById()
    * 
    */
    it("#14 should get NFT data by tokenId", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
        const correctURI = await contractInstance.tokenURI(0);

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        
        const result = await contractInstance.fetchNFTDataById(0);
        assert.equal(result[0], correctURI);
        assert.equal(result[1].toString(), '10');
        assert.equal(result[2], alice);
        
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
    it("#15 should get NFT data if they are listed on the market ", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
        const correctURI = await contractInstance.tokenURI(0);

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Get token details
        const result = await contractInstance.multiCallNFTsOnMarket();

        // Check details are correct
        assert.equal(result[0][0].toString(), '0')
        assert.equal(result[1][0].toString(), correctURI)
        assert.equal(result[2][0].toString(), '10')
        assert.equal(result[3][0].toString(), alice)
    })

    /**
     * Tests: multiCallNFTsOnMarket() and _removeNFTfromMarket() 
     */
   it("#16 token should be removed from the market after a successful purchase.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});

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
        const multiCallNFTsOnMarket_result = await contractInstance.multiCallNFTsOnMarket();
        assert.equal(multiCallNFTsOnMarket_result[0], '')
        assert.equal(multiCallNFTsOnMarket_result[1], '')
        assert.equal(multiCallNFTsOnMarket_result[2], '')
        assert.equal(multiCallNFTsOnMarket_result[3], '')


    })

})
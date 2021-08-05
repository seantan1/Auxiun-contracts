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
    it("should set the baseURI.", async () => {
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
    it("should mint an asset, given a gameId and itemId.", async () => {
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
    it("should return an appropriate token URI.", async () => {
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
    it("should throw an error after attempting to access a non-existent asset.", async () => {
           // Set up
           let baseURI = "https://auxiun-nft-market.com/";
           await contractInstance.setBaseURI(baseURI)

           // Test tokenURI()
           await utils.throws(contractInstance.tokenURI(5))
    })


    /**
     * Tests: listNFTOnMarket(tokenId, price) 
     */ 
    it("should be able list NFT on market.", async () => {

        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
       
        const result = await contractInstance.listNFTOnMarket(0, 100, {from: alice});
        assert.equal(result.receipt.status, true);
    })


    it("should not be able list NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.listNFTOnMarket(0, 100, {from: alice}))
    })


    it("should not be able list NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:bob});
        await utils.throws(contractInstance.listNFTOnMarket(0, 100, {from: alice}))
    })


    /**
     * Tests:  removeNFTFromMarket()
     */
    it("should be able to remove NFT on market if the NFT belongs to the owner", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
       
        await contractInstance.listNFTOnMarket(0, 100, {from: alice});
        const result = await contractInstance.removeNFTFromMarket(0, {from: alice})
        assert.equal(result.receipt.status, true);
    })

    it("should not be able to remove NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: alice}));
    })

    it("should not be able to remove NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});
        await contractInstance.listNFTOnMarket(0, 100, {from: alice});
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: bob}))
    })


    /**
     * Tests:  purchaseNFT()
     */
    it("buyer should receive NFT after sending the correct amount of funds.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.mint(gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 100, {from: alice});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:100, from: bob});

        // Bob should now own the NFT
        result = await contractInstance.ownerOf(0);
        assert.equal(result, bob);
    })

    // Need to fix
    it("seller should receive correct amount of funds after their NFT is purchased.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        
    
        await contractInstance.mint(gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 1000, {from: alice});

        // Get balance before the purchase
        const initialBalance = await web3.eth.getBalance(alice);
        console.log("Initial: ", initialBalance)


        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:1000, from: bob});

        // Alice should have a balance of initialBalance + 100
        const result = await web3.eth.getBalance(alice);
        let expected = parseInt(initialBalance) + 1000;

        console.log("Final:   ", result)
        assert.equal(result, expected);
    })


    it("should throw an error if an attempt to purchase an NFT was made with insufficient funds.", async () => {
    
    })


    /**
     * Tests: _removeNFTfromMarket()   PRIVATE FUNCTION
     */
    it("token should be removed from the market after a successful purchase.", async () => {
    
    })

    
   /**
    * Tests: fetchNFTDataById()
    */
    it("should get NFT data by tokenId", async () => {

    })

    /**
     *  Tests multiCallNFTsOnMarket() and  _fetchTokenIdsOnMarket()
        Should return 4 arrays:
        * 1. array of tokenIds
        * 2. array of tokenURIs
        * 3. array of token prices
        * 4. array of token sellers 
     */
    it("should get NFT data if they are listed on the market ", async () => {
        
    })



  



 
})
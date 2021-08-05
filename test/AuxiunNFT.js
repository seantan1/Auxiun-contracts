const AuxiunNFT = artifacts.require("AuxiunNFT")
const utils = require("./helpers/utils")

contract("AuxiunNFT", () => {
    let contractInstance;

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


    // Positive
    it("should be able list NFT on market.", async () => {
    
    })

    it("should be able to remove NFT on market.", async () => {
    
    })

    it("buyer should receive NFT after sending the correct amount of funds.", async () => {
    
    })

    it("token should be removed from the market after a successfule purchase.", async () => {
    
    })
    

    it("seller should be able to withdraw funds from userBalance.", async () => {
    
    })



    // Negative
    it("should not be able list NFT on market if token does not exist.", async () => {
    
    })

    it("should not be able list NFT on market if token does not belong to owner.", async () => {
    
    })


    it("should not be able to remove NFT on market if token does not exist.", async () => {
    
    })

    it("should not be able to remove NFT on market if token does not belong to owner.", async () => {
    
    })


    it("should throw an error if an attempt to purchase an NFT was made with insufficient funds.", async () => {
    
    })

    it("seller should not be able to withdraw funds from userBalance if their balance is equal or less than 0.", async () => {
    
    })

})
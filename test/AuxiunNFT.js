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

    /* Expected Result: Transaction should be successful */
    it("should set the baseURI.", async () => {
        // Set up
        let baseURI = "https://auxiun-nft-market.com";

        // Test setBaseURI()
        const result = await contractInstance.setBaseURI(baseURI);
        assert.equal(result.receipt.status, true);
    })

    /* Expected Result: Transaction should be successful */
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
        "<baseURI> + <gameId> + / + <itemId>"
    */
    it("should return a token URI.", async () => {
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
        attempting to get a token URI from a non-existant asset
    */
    it("should throw an error after attempting to access a non-existent asset.", async () => {
           // Set up
           let baseURI = "https://auxiun-nft-market.com/";
           await contractInstance.setBaseURI(baseURI)

           // Test tokenURI()
           await utils.throws(contractInstance.tokenURI(5))
    })


})
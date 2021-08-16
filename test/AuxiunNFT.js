const AuxiunNFT = artifacts.require("AuxiunNFT")
const utils = require("./helpers/utils")
const BigNumber = require('bignumber.js');

contract("AuxiunNFT", (accounts) => {
    let contractInstance;

    let [alice, bob, charlie, delta] = accounts;

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

    /** Tests addAdminAddress(), isAdminAddress */

    it("should be able to add admins, if the sender is also the owner of the contract", async () => {
        await contractInstance.addAdminAddress(alice);
        const result = await contractInstance.isAdminAddress(alice);
        assert.equal(result, true)
    })

    
    /** Tests mint()*/
    it("should not mint tokens if sender is not an admin", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await utils.throws(contractInstance.mint(delta, gameId, itemId, {from: delta}))
    })

    /** Tests mint(), addAdminAddress(), isAdminAddress() */
    it("should mint tokens if sender is an admin", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        const result = await contractInstance.mint(alice, gameId, itemId, {from: alice})
        assert.equal(result.receipt.status, true)
    })


    /** Tests addAdmin(), removeAdmin() */
    it("should remove an admin, if the sender is the owner", async () => {
        await contractInstance.addAdminAddress(bob, {from: alice});
        await contractInstance.removeAdminAddress(bob, {from: alice})
        const result = await contractInstance.isAdminAddress(bob);
        assert.equal(result, false)
    })

    /* 
        TestsL tokenURI()
    */
    it("should return an appropriate token URI.", async () => {
        // Set up
        let baseURI = "https://auxiun-nft-market.com/";
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.mint(alice, gameId, itemId);

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
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});
       
        const result = await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        assert.equal(result.receipt.status, true);
    })


    it("should not be able list NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.listNFTOnMarket(0, 10, {from: alice}))
    })


    it("should not be able list NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(bob);
        await contractInstance.mint(bob, gameId, itemId, {from:bob});
        await utils.throws(contractInstance.listNFTOnMarket(0, 10, {from: alice}))
    })


    /**
     * Tests:  removeNFTFromMarket()
     */
    it("should be able to remove NFT on market if the NFT belongs to the owner", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});
       
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        const result = await contractInstance.removeNFTFromMarket(0, {from: alice})
        assert.equal(result.receipt.status, true);
    })

    it("should not be able to remove NFT on market if token does not exist.", async () => {
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: alice}));
    })

    it("should not be able to remove NFT on market if token does not belong to owner.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        await utils.throws(contractInstance.removeNFTFromMarket(0, {from: bob}))
    })


    /**
     * Tests:  purchaseNFT()
     */
    it("buyer should receive NFT after sending the correct amount of funds.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:10, from: bob});

        // Bob should now own the NFT
        result = await contractInstance.ownerOf(0);
        assert.equal(result, bob);
    })


    /**
     * Tests purchaseNFT()
     */

    it("seller should receive correct amount of funds after their NFT is purchased.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        const price = 1111;
        await contractInstance.addAdminAddress(charlie);
        await contractInstance.mint(charlie, gameId, itemId, {from:charlie});

        // Charlie lists NFT
        await contractInstance.listNFTOnMarket(0, price, {from: charlie});

        // Get balance before the purchase
        const balance = await web3.eth.getBalance(charlie);

        // Bob purchases NFT
        await contractInstance.purchaseNFT(0, {value:price, from: bob});
      
        // Charlie should have a balance of initialBalance + price
        var initialBalance = new BigNumber(balance)
        var expected = initialBalance.plus(price);

        // Get actual result
        const result = await web3.eth.getBalance(charlie);
        assert.equal(result, expected.toString());
    })


    it("should throw an error if an attempt to purchase an NFT was made with insufficient funds.", async () => {
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});

        // Bob purchases NFT with insufficient funds
        await utils.throws(contractInstance.purchaseNFT(0, {value:5, from: bob}));
    })


    /**
    * Tests: fetchNFTDataById()
    * 
    */
    it("should get NFT data by tokenId", async () => {
        
        let gameId = "bsg_escape_from_tarkov";
        let itemId = "btc";
        let baseURI = "https://auxiun-nft-market.com/";
        await contractInstance.setBaseURI(baseURI)
        await contractInstance.addAdminAddress(alice);
        await contractInstance.mint(alice, gameId, itemId, {from:alice});
        const correctURI = await contractInstance.tokenURI(0);

        // Alice lists her NFT
        await contractInstance.listNFTOnMarket(0, 10, {from: alice});
        
        const result = await contractInstance.fetchNFTDataById(0);
        assert.equal(result[0], correctURI);
        assert.equal(result[1].toString(), '10');
        assert.equal(result[2], alice);
        
    })

   

  


   

 

    
  

    

})
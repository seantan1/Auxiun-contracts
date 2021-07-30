const AuxiunNFT = artifacts.require("AuxiunNFT")

contract("AuxiunNFT", (accounts) => {

    let contractInstance;
    let [lyra, will] = accounts;

    beforeEach(async () => {
        contractInstance = await AuxiunNFT.new();
    })

    afterEach(async () => {
        await contractInstance.kill();
    });

    it("Should set the baseURI.", async () => {
        let baseURI = "https://auxiun-nft-market.com";
        const result = await contractInstance.setBaseURI(baseURI);
        assert.equal(result.receipt.status, true);
    })

    it("Should mint the NFT", async () => {
        // Need game_id
        let gameId = "bsg_escape_from_tarkov";

        // Need item_id
        let itemId = "btc";

        // Mint the NFT
        const result = await contractInstance.mint(gameId, itemId);
        assert.equal(result.receipt.status, true);
    })

    it("Should return a token URI.", async () => {
        let baseURI = "https://auxiun-nft-market.com/";

        // Need game_id
        let gameId = "bsg_escape_from_tarkov";

        // Need item_id
        let itemId = "btc";

        // Need to set baseURI
        await contractInstance.setBaseURI(baseURI)

        // Mint the NFT
        await contractInstance.mint(gameId, itemId);

        // Collect result
        const result = await contractInstance.tokenURI(0);
        const expected = String(baseURI+gameId+"/"+itemId);

        assert.equal(result, expected);
    })
})
const AuxinNFT = artifacts.require("AuxinNFT")

contract("AuxinNFT", (accounts) => {

    let contractInstance;
    let [lyra, will] = accounts;

    beforeEach(async () => {
        contractInstance = await AuxinNFT.new();
    })
    afterEach(async () => {
        await contractInstance.kill();
     });

    // it("Should increment the token counter and mint the NFT", () => {
    // })

    it("Should return a token URI.", () => {
        let baseURI = "https://bsg.com";

        // Need game_id
        let gameId = "bsg_escape_from_tarkov";

        // Need item_id
        let itemId = "btc";

        // Need baseURI
        contractInstance.setBaseURI()

        // Mint the NFT
        contractInstance.mint(gameId, itemId);

        // Collect result
        const result = await contractInstance.tokenURI(0);
        const expected = str(baseURI+gameId+itemId);
        assert.equal(result, expected);
    })
})
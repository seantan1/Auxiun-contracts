# Auxiun NFT

How to use and setup a working truffle environment:
1. `truffle init`
2. `npm intall`
3. Setup contract codes in the contracts folder
4. Add infura, mnemonic, network details in truffle-config.js, remember to specify the version of the solc u want to use else u get an error when compiling.
5. Add your mnemonic key inside a new .secrets file (eg. metamask wallet private key), add it to gitignore
6. Delete the initial Migration.sol file
7. `truffle compile` will compile the contract code and add them in the build folder
8. Edit the initial 1_migration.js file inside migrations folder to your own contract code instead
9. `truffle migrate --network rinkeby` for example will deploy the contract on the rinkeby network

Cheatsheet: https://eattheblocks.com/truffle-framework-cheatsheet/

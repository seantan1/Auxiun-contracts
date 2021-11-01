# Auxiun NFT

How to use and setup a working truffle environment:
1. `truffle init`
2. `npm install`
3. Setup contract codes in the contracts folder
4. Add infura, mnemonic, network details in truffle-config.js, remember to specify the version of the solc u want to use else u get an error when compiling.
5. Add your mnemonic key inside a new .secrets file (eg. metamask wallet private key), add it to gitignore
6. Delete the initial Migration.sol file
7. `truffle compile` will compile the contract code and add them in the build folder
8. Edit the initial 1_migration.js file inside migrations folder to your own contract code instead
9. `truffle migrate --network rinkeby` for example will deploy the contract on the rinkeby network

Cheatsheet: https://eattheblocks.com/truffle-framework-cheatsheet/
  
## Setup after deploying contracts on blockchain
1. As there are 2 contracts for the application (due to size limit restrictions), we have to manually link the 2 contracts together
2. An easy way to do this is use a [simple React App](https://github.com/seantan1/smart-contracts-communicator) I have created to assist you with this
3. Firstly, copy and paste the output contract addresses and ABIs into `src/contractData.js`
4. Next, run `npm start` on the terminal within the directory
5. Using the simple interface you can connect to your Metamask wallet and press the `Execute` button which contains the function to link the two contracts together
6. Ensure that the Metamask wallet you interact with the React App is the same wallet you used to deploy the contract, else you will have insufficient permissions to interact with the contract (only the owner can call the linking function)

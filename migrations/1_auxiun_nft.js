const AxiunNFT = artifacts.require("./AuxiunNFT.sol");

module.exports = function (deployer) {
  deployer.deploy(AxiunNFT);
};

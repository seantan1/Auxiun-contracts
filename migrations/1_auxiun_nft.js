const AxiunNFT = artifacts.require("./AxiunNFT.sol");

module.exports = function (deployer) {
  deployer.deploy(AxiunNFT);
};

const AxiunNFTMulticall = artifacts.require("./AuxiunNFTMulticall.sol");

module.exports = function (deployer) {
  deployer.deploy(AxiunNFTMulticall);
};

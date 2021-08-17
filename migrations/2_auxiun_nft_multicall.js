const AuxiunNFTMulticall = artifacts.require("./AuxiunNFTMulticall");

module.exports = function (deployer) {
  deployer.deploy(AuxiunNFTMulticall);
};

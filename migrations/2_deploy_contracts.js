// var ConvertLib = artifacts.require("./ConvertLib.sol");
// var MetaCoin = artifacts.require("./MetaCoin.sol");

var MyAdvancedToken = artifacts.require("./MyAdvancedToken.sol");

module.exports = function(deployer) {
//  deployer.deploy(ConvertLib);
//  deployer.link(ConvertLib, MetaCoin);
//  deployer.deploy(MetaCoin);

    deployer.deploy(MyAdvancedToken,100,'EuroCoins','EUC');

};

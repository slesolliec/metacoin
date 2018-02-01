

var MetaCoin = artifacts.require("./contracts/MetaCoin.sol");
var account_one = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
var account_two = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";


function myCallback(err){
    console.log(err);
}


// Print the deployed version of MetaCoin.
// Note that getting the deployed version requires a promise, hence the .then.
module.exports = function ( myCallback ) {

    var meta;
    MetaCoin.deployed().then(function(instance) {
        meta = instance;
        // I get the contract address
        console.log(meta.address);

        // I get the balance
        return meta.getBalance.call(account_one);

    })
        .then(function(balance) {
            console.log("Balance of account1 = " +balance.toNumber());
        })

        .then(function() {
            return meta.getBalance.call(account_two);
        })
        .then(function(balance) {
            console.log("Balance of account2 = " +balance.toNumber());
        })

        .then(function() {
            return meta.sendCoin(account_two, 15, {from: account_one});
        })
        .then(function(result) {
            console.log("Gas used by tx = " + result.receipt.gasUsed);
        })

        .then(function() {
            return meta.getBalance.call(account_two);
        })
        .then(function(balance) {
            console.log("Balance of account2 = " +balance.toNumber());
        })

        .catch( function(err) { console.log(err); })

}




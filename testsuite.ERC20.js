

module.exports = function(tokenContract, tokenInfos, accounts) {

    // we get the contract instance
    var myToken;
    tokenContract.deployed().then(function (instance) {
        myToken = instance;
        // I get the contract address
        // console.log("Contract deployed to " + myToken.address);
    });

    const alice   = accounts[0];  // Alice created the token contract
    const bob     = accounts[1];
    const charlie = accounts[2];

    // todo: check that contract deployment has cost less than 2M gas


    //
    // Test token information: name, decimals, symbol ...
    //
    it("should have the right name", function () {
        return myToken.name.call()
            .then(function (name) {
                assert.equal(name, tokenInfos.name, "Token name is wrong");
            });
    });
    it("should have the right symbol", function () {
        return myToken.symbol.call()
            .then(function (symbol) {
                assert.equal(symbol, tokenInfos.symbol, "Symbol is wrong");
            });
    });
    it("should have " + tokenInfos.decimals + " decimals", function () {
        return myToken.decimals.call()
            .then(function (name) {
                assert.equal(name, tokenInfos.decimals, "Token has wrong number of decimals");
            });
    });


    // checking initial balance
    it("should have a "+ tokenInfos.initialSupply +" Token balance in first account", function () {
        return myToken.balanceOf.call(alice)
            .then(function (balance) {
                assert.equal(balance.toNumber(), tokenInfos.initialSupply * 10 ** tokenInfos.decimals , tokenInfos.initialSupply +" Tokens were not in the first account");
            });
    });
    it("Bob should have no Token", function () {
        return myToken.balanceOf.call(bob)
            .then(function (balance) {
                assert.equal(balance.toNumber(), 0 , "Bob had Tokens !!!");
            });
    });
    it("Charlie should have no Token", function () {
        return myToken.balanceOf.call(charlie)
            .then(function (balance) {
                assert.equal(balance.toNumber(), 0 , "Charlie had Tokens !!!");
            });
    });
    // checking initial total supply
    it("should have " + tokenInfos.initialSupply + " Tokens in total", function () {
        return myToken.totalSupply.call()
            .then(function (balance) {
                assert.equal(balance.toNumber(), tokenInfos.initialSupply * 10 ** tokenInfos.decimals , "The total supply of tokens was not "+ tokenInfos.initialSupply);
            });
    });


    // we check total supply (we sum all tokens in all accounts)
    function checkTotalSupply() {
        it("total supply should be correct", function () {
            var totalTokens = 0;
            accounts.forEach( function( oneAccount ) {
                return myToken.balanceOf.call(oneAccount).then( function(balance) {
                    totalTokens += balance.toNumber();
                })
            });
            return myToken.totalSupply.call()
                .then(function (balance) {
                    assert.equal(balance.toNumber(), totalTokens , "The total supply of tokens is written as "+ balance.toNumber() +" while the sum on all accounts is "+ totalTokens);
                });
        });
    }
    checkTotalSupply();




};




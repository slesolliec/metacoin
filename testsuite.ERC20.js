

module.exports = function(tokenContract, tokenInfos, accounts) {

//    console.log(tokenContract);exit;

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

    const initialSupplyInWei = tokenInfos.initialSupply * 10 ** tokenInfos.decimals;

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
                assert.equal(balance.toNumber(), initialSupplyInWei , tokenInfos.initialSupply +" Tokens were not in the first account");
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
        it("total supply should be the sum of all accounts balance", function () {
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


    //
    // testing transfert method
    //
    const errorPattern = /(StatusError: Transaction: 0x[0-9a-f]{64} exited with an error)+|(Error: VM Exception while processing transaction: revert)+/;

    // Alice gives 10 tokens to 0x0. (The trick here is to catch the failing Tx)
    it("should fail when sending tokens to the 0x0 address", function() {
        return myToken.transfer(0,10).then(
            function(result) {
                // hey! This shouldn't have worked!!!
                // console.log('Result is ' + result);
                assert(false, "you should not be able to transfert founds to the 0x0 address!!");
                return true;
            },
            function(err) {
                // console.log(err);
                assert.match(err, errorPattern, "transfert to 0x0 address should have raised an error!!");
            }
        )
    });

    // Alice gives 10 more tokens to Bob than initial supply
    it("should fail when sending more tokens than you have", function() {
        return myToken.transfer(bob, (tokenInfos.initialSupply + 10 ) * 10 ** tokenInfos.decimals) .then(
            function(result) {
                // hey! This shouldn't have worked!!!
                // console.log('Result is ' + result);
                assert(false, "you should not be able to transfert more tokens than you have!!");
                return true;
            },
            function(err) {
                // console.log('Error is' + err);
                assert.match(err, errorPattern, "transfert of " + (tokenInfos.initialSupply + 10) + " to Bob should have raised an error!!");
            }
        )
    });

    // todo: check for overflow

    // Alice sends 0 tokens to Bob
    it("Alice should be able to send 0 token to Bob", function() {
        return myToken.transfer(bob, 0).then(
            function(result) {
                assert(true, "Cannot fail :-)");
            },
            function(err) {
                // should not have failed
                assert(false, "Transferring 0 token to Bob should not fail");
            }
        )
    });

    // Alice sends 1 (wei) unit token to Bob
    it("Alice should be able to send 1 minimum unit of a token to Bob", function() {
        return myToken.transfer(bob, 1).then(
            function(result) {
                assert(true, "Cannot fail :-)");
            },
            function(err) {
                // should not have failed
                assert(false, "Transferring 1 minimum unit token to Bob should not fail");
            }
        )
    });

    // Check Alice has All but 1 wei token in her balance
    it("Alice should have all her tokens less one wei", function() {
        return myToken.balanceOf.call(alice).then(
            function(result) {
                assert.equal(result.toNumber(), initialSupplyInWei - 1, "Alice does not have the right amount of tokens !!");
            }
        );
    });

    // Check Bob has 1 wei in token in his balance
    it("Bob should have 1 wei token", function() {
        return myToken.balanceOf.call(bob).then(
            function(result) {
                assert.equal(result.toNumber(), 1, "Bob does not have the right amount of tokens !!");
            }
        );
    });

    // Check Alice can give all her tokens to Bob (transfer that ends with zero amount)
    it("Alice should be able to send all her tokens to Bob", function() {
        return myToken.transfer(bob, initialSupplyInWei - 1).then(
            function(result) {
                assert(true, "Transaction succeeded");
            },
            function(err) {
                // should not have failed
                assert(false, "Alice should have been able to send all her tokens");
            }
        )
    });

    // check that Alice has not token left
    it("Alice should have no token left", function() {
        return myToken.balanceOf.call(alice).then(
            function(result) {
                assert.equal(result.toNumber(), 0, "Alice shouldn't have any token left");
            }
        );
    });

    // check that Bob has all the tokens
    it("Bob should have all the tokens", function() {
        return myToken.balanceOf.call(bob).then(
            function(result) {
                assert.equal(result.toNumber(), initialSupplyInWei, "Bob should have all the tokens");
            }
        );
    });

    // check that Alice can still send zero tokens
    it("Alice should still be able to send zero token to Bob", function() {
        return myToken.transfer(bob, 0).then(
            function(result) {
                assert(true, "Transaction succeeded");
            },
            function(err) {
                // should not have failed
                assert(false, "Alice should have been able to send zero token to Bob");
            }
        )
    });

    // check that Alice can still send zero tokens
    it("Alice should still be able to send zero token to Charlie", function() {
        return myToken.transfer(charlie, 0).then(
            function(result) {
                assert(true, "Transaction succeeded");
            },
            function(err) {
                // should not have failed
                assert(false, "Alice should have been able to send zero token to Charlie");
            }
        )
    });

    // check that Alice cannot send one wei token
    it("Alice shouldn't be able to send 1 wei token to Charlie", function() {
        return myToken.transfer(charlie, 1).then(
            function(result) {
                assert(false, "That transaction shouldn't have succeeded!!!");
            },
            function(err) {
                // should have failed
                assert.match(err, errorPattern, "Alice should not have been able to send one wei token to Charlie");
            }
        )
    });

    // check that Bob can send 1 token to Charlie
    it("Bob should be able to send 1 token to Charlie", function() {
        return myToken.transfer(charlie, 1 * 10 ** tokenInfos.decimals , {from: bob}).then(
            function(result) {
                assert(true, "Transaction succeeded");
            },
            function(err) {
                // should not have failed
                assert.match(err, errorPattern, "Bob should have been able to send one token to Charlie");
            }
        )
    });

    // Bob should have all - 1 token
    it("Bob should have all the tokens minus 1", function() {
        return myToken.balanceOf.call(bob).then(
            function(result) {
                assert.equal(result.toNumber(), initialSupplyInWei - 1 * 10 ** tokenInfos.decimals, "Bob should have all the tokens minus one");
            }
        );
    });

    // Charlie should have 1 token
    it("Charlie should have 1 token", function() {
        return myToken.balanceOf.call(charlie).then(
            function(result) {
                assert.equal(result.toNumber(), 1 * 10 ** tokenInfos.decimals, "Charlie should have one token");
            }
        );
    });


// todo: counting gas spending

    // todo: test events


};




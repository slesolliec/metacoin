

module.exports = function(tokenContract, tokenInfos, accounts) {

//    console.log(tokenContract);exit;

    // we get the contract instance
    var myToken;
    tokenContract.deployed().then(function (instance) {
        myToken = instance;
        // I get the contract address
        // console.log("Contract deployed to " + myToken.address);
    });

    const errorPattern = /(StatusError: Transaction: 0x[0-9a-f]{64} exited with an error)+|(Error: VM Exception while processing transaction: revert)+/;

    const alice   = accounts[0];  // Alice created the token contract
    const bob     = accounts[1];
    const charlie = accounts[2];

    const name2account = {
        Alice:   alice,
        Bob:     bob,
        Charlie: charlie
    };

    const initialSupplyInWei = tokenInfos.initialSupply * 10 ** tokenInfos.decimals;

    // Charlie should have 1 token
    function checkBalanceOf(person,value)  {
        it(person + " should have " + value + " token", function() {
            return myToken.balanceOf.call(name2account[person]).then(
                function(result) {
                    assert.equal(result.toNumber(), value , person + " should have "+ value +" token");
                }
            );
        });
    }

    // we check total supply (we sum all tokens in all accounts)
    function checkTotalSupply() {
        it("total supply should be the sum of all accounts balance", function () {
            var totalTokens = 0;
            accounts.forEach(function (oneAccount) {
                return myToken.balanceOf.call(oneAccount).then(function (balance) {
                    totalTokens += balance.toNumber();
                })
            });
            return myToken.totalSupply.call()
                .then(function (balance) {
                    assert.equal(balance.toNumber(), totalTokens, "The total supply of tokens is written as " + balance.toNumber() + " while the sum on all accounts is " + totalTokens);
                });
        });
    }

    // check that a transaction has emitted the correct Transfer event
    function checkTransferEvent(tx, from, to, value) {
        var eventCount = 0;
        tx.logs.forEach( function(log) {
            if (log.event === 'Transfer') {
                eventCount++;
                assert.equal(log.args.from.valueOf(), name2account[from],  "Transfer event: incorrect sender. Should have been "+from);
                assert.equal(log.args.to.valueOf(),   name2account[to],    "Transfer event: incorrect receiver. Should have been "+to);
                assert.equal(log.args.value.valueOf(),value,               "Transfer event: incorrect value");
            }
        });
        assert.equal(eventCount,1, "Only ONE transfer event should have fired!!!");
    }

    // todo: check that contract deployment has cost less than 2M gas

    describe('ERC-20 token test suite', function () {

        //
        // Test token information: name, decimals, symbol ...
        //
        describe("Token informations", function () {
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
            })
        });

        describe("Initial balance", function () {
            // checking initial balance
            it("should have a " + tokenInfos.initialSupply + " Token balance in first account", function () {
                return myToken.balanceOf.call(alice)
                    .then(function (balance) {
                        assert.equal(balance.toNumber(), initialSupplyInWei, tokenInfos.initialSupply + " Tokens were not in the first account");
                    });
            });

            checkBalanceOf('Bob',0);
            checkBalanceOf('Charlie',0);

            // checking initial total supply
            it("should have " + tokenInfos.initialSupply + " Tokens in total", function () {
                return myToken.totalSupply.call()
                    .then(function (balance) {
                        assert.equal(balance.toNumber(), tokenInfos.initialSupply * 10 ** tokenInfos.decimals, "The total supply of tokens was not " + tokenInfos.initialSupply);
                    });
            });

            checkTotalSupply();

        });


        //
        // testing transfer method
        //
        describe("Testing transfer() method", function() {

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
                    function(tx) {
                        checkTransferEvent(tx,'Alice','Bob',0);
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
                    function(tx) {
                        checkTransferEvent(tx,'Alice','Bob',1);
                    },
                    function(err) {
                        // should not have failed
                        assert(false, "Transferring 1 minimum unit token to Bob should not fail");
                    }
                )
            });

            checkBalanceOf('Alice',initialSupplyInWei - 1);
            checkBalanceOf('Bob',  1);

            // Check Alice can give all her tokens to Bob (transfer that ends with zero amount)
            it("Alice should be able to send all her tokens to Bob", function() {
                return myToken.transfer(bob, initialSupplyInWei - 1).then(
                    function(tx) {
                        checkTransferEvent(tx,'Alice','Bob',initialSupplyInWei - 1);
                    },
                    function(err) {
                        // should not have failed
                        assert(false, "Alice should have been able to send all her tokens");
                    }
                )
            });

            checkBalanceOf('Alice',0);
            checkBalanceOf('Bob',  initialSupplyInWei);

            // check that Alice can still send zero tokens
            it("Alice should still be able to send zero token to Bob", function() {
                return myToken.transfer(bob, 0).then(
                    function(tx) {
                        checkTransferEvent(tx,'Alice','Bob',0);
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
                    function(tx) {
                        checkTransferEvent(tx,'Alice','Charlie',0);
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
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',1 * 10 ** tokenInfos.decimals);
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Bob should have been able to send one token to Charlie");
                    }
                )
            });

            checkBalanceOf('Bob',     initialSupplyInWei - 1 * 10 ** tokenInfos.decimals);
            checkBalanceOf('Charlie', 1 * 10 ** tokenInfos.decimals);


            // check that Alice cannot send negative tokens to Charlie
            it("Alice should not be able to send -10 wei tokens to Charlie", function() {
                return myToken.transfer(charlie, -10).then(
                    function(result) {
                        assert(false, "This should surely not have succeeded!!!");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send -10 wei tokens to Charlie");
                    }
                )
            });
        });


        //
        // testing allow and transferFrom methods
        //
        describe("Testing allow() and transferFrom() methods", function() {

            it("Alice allowance for Bob (to spend her tokens) should be zero", function() {
                return myToken.allowance.call(alice, bob).then(
                    function(result) {
                        assert.equal(result.toNumber(), 0, "Bob should not be allowed to spend Alice's tokens");
                    }
                );
            });

            it("Bob allowance for Alice (to spend his tokens) should be zero", function() {
                return myToken.allowance.call(bob, alice).then(
                    function(result) {
                        assert.equal(result.toNumber(), 0, "Alice should not be allowed to spend Bob's tokens");
                    }
                );
            });

            it("Alice should not be able to spend Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 1).then(
                    function(result) {
                        assert(false, "This should surely not have succeeded!!!");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send 1 wei tokens from Bob to Charlie");
                    }
                )
            });

            it("Alice should not be able to spend Bob tokens (even negative)", function() {
                return myToken.transferFrom(bob, charlie, -1).then(
                    function(result) {
                        assert(false, "This should surely not have succeeded!!!");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send 1 wei tokens from Bob to Charlie");
                    }
                )
            });

            it("Alice should be able to spend 0 Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 0).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',0);
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should have been able to send zero token from Bob to Charlie");
                    }
                )
            });

            checkBalanceOf('Alice', 0);

        });


    });

    // todo: counting gas spending with tx.receipt.gasUsed
    /*
    it("Total gas cost: "+totalGasUsed+" (contract deployment not included)", function() {
        assert(2000000 > totalGasUsed,"Gas used should be lesser than 2M gas.");

    });
    */



    // todo: testing transferFrom method


    // known issue: tests will fail if more than standard events are used: should find a work around


};




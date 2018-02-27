

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

    function checkBalanceOf(person,value)  {
        it(person + " should have " + value + " token", function() {
            return myToken.balanceOf.call(name2account[person]).then(
                function(result) {
                    assert.equal(result.toNumber(), value , person + " should have "+ value +" tokens");
                }
            );
        });
    }

    function checkAllowanceOf(person,spender,value)  {
        it(spender + " should be allowed to spend " + value + " wei tokens from "+ person, function() {
            return myToken.allowance.call(name2account[person],name2account[spender]).then(
                function(result) {
                    assert.equal(result.toNumber(), value , spender + " should have been allowed to spend "+ value +" wei tokens from "+ person);
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
        assert.equal(eventCount,1, "ONE and only ONE transfer event should have fired!!!");
    }

    // todo: check that contract deployment has cost less than 2M gas

    describe('ERC-20 token test suite', function () {

        //
        // Test token information: name, decimals, symbol ...
        //
        describe("Token informations (optional)", function () {
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

            // todo: try a negative number that underflows under the current balance of Charlie

        });


        //
        // testing allow and impossible transferFrom methods
        //
        describe("Testing transferFrom() when allowance is null", function() {

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

            // no balance should have changed
            checkBalanceOf('Alice', 0);
            checkBalanceOf('Bob',     initialSupplyInWei - 1 * 10 ** tokenInfos.decimals);
        });


        //
        // testing allow
        //
        describe("Testing allow()", function() {

            // we allow Alice to spend 10 wei tokens from Bob, and check allowances
            it("Bob allows Alice to spend 10 wei of his tokens", function() {
                return myToken.approve(alice,10, {from: bob}).then(
                    function(tx) {
                        assert(true);
                    },
                    function(err) {
                        console.log(err);
                        assert(false, "This Tx should have succeeded.");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  ,10);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);

            // we allow Alice to spend more tokens (20 wei) from Bob and check allowances
            it("Bob allows Alice to spend more (20 wei) of his tokens", function() {
                return myToken.approve(alice,20, {from: bob}).then(
                    function(tx) {
                        assert(true);
                    },
                    function(err) {
                        console.log(err);
                        assert(false, "This Tx should have succeeded.");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  ,20);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);

            // we allow Alice to spend less tokens (15 wei) from Bob and check allowances
            it("Bob allows Alice to spend less (15 wei) of his tokens", function() {
                return myToken.approve(alice,15, {from: bob}).then(
                    function(tx) {
                        assert(true);
                    },
                    function(err) {
                        console.log(err);
                        assert(false, "This Tx should have succeeded.");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  ,15);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);

            // we allow Alice to spend 0 tokens from Bob and check allowances
            it("Bob allows Alice to spend 0 of his tokens", function() {
                return myToken.approve(alice,0, {from: bob}).then(
                    function(tx) {
                        assert(true);
                    },
                    function(err) {
                        console.log(err);
                        assert(false, "This Tx should have succeeded.");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  , 0);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);

            // we allow Alice to spend negative tokens (-5 wei) from Bob and check allowances
            it("Bob allows Alice to spend -5 of his tokens", function() {
                return myToken.approve(alice,-5, {from: bob}).then(
                    function(tx) {
                        // console.log(tx);
                        assert(false, "Approval of negative values should not pass!!!");
                    },
                    function(err) {
                        // console.log(err);
                        assert(true, "This Tx should succeed.");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  , 0);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);


        });


        //
        // testing transferFrom methods
        //
        describe("Testing allow() and transferFrom() methods", function() {
            // arrange: allow Alice to spend 10 tokens of Bob
            it("Bob allows Alice 10 of his tokens", function() {
                return myToken.approve(alice,10, {from: bob}).then(
                    function(tx) {
                        // console.log(tx);
                        assert(true, "This should work");
                    },
                    function(err) {
                        // console.log(err);
                        assert(false, "This Tx should have succeeded.");
                    }
                )
            });
            // check allowance is good
            checkAllowanceOf('Bob','Alice',10);

            // we let Alice spend: 0, -2, 2, 10, 8, 0, 2, -2
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
            // check allowance has not changed
            checkAllowanceOf('Bob','Alice',10);

            it("Alice should not be able to spend -2 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, -2).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',0);
                        assert(false, "This Tx should have failed");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should have been able to send -2 token from Bob to Charlie");
                    }
                )
            });
            // check allowance has not changed
            checkAllowanceOf('Bob','Alice',10);

            it("Alice should be able to spend 2 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 2).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',2);
                    },
                    function(err) {
                        // should not have failed
                        assert(false, "Alice should have been able to send 2 wei tokens from Bob to Charlie");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  , 8);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);
            checkBalanceOf('Alice',   0);
            checkBalanceOf('Bob',     initialSupplyInWei -  1 * 10 ** tokenInfos.decimals - 2);
            checkBalanceOf('Charlie', 1 * 10 ** tokenInfos.decimals + 2);

            it("Alice should not be able to spend 10 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 10).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',10);
                        assert(false, "This Tx should have failed");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send 10 wei tokens from Bob to Charlie");
                    }
                )
            });

            // we let Alice spend: 8
            it("Alice should be able to spend 8 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 8).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',8);
                    },
                    function(err) {
                        // should not have failed
                        assert(false, "Alice should have been able to send 8 wei tokens from Bob to Charlie");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  , 0);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);
            checkBalanceOf('Alice',   0);
            checkBalanceOf('Bob',     initialSupplyInWei -  1 * 10 ** tokenInfos.decimals - 10);
            checkBalanceOf('Charlie', 1 * 10 ** tokenInfos.decimals + 10);

            // we let Alice spend: 0
            it("Alice should be able to spend 0 Bob token", function() {
                return myToken.transferFrom(bob, charlie, 0).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',0);
                    },
                    function(err) {
                        // should not have failed
                        assert(false, "Alice should have been able to send 0 token from Bob to Charlie");
                    }
                )
            });
            checkAllowanceOf('Bob',  'Alice'  , 0);
            checkAllowanceOf('Bob',  'Charlie', 0);
            checkAllowanceOf('Alice','Bob'    , 0);
            checkAllowanceOf('Alice','Charlie', 0);
            checkBalanceOf('Alice',   0);
            checkBalanceOf('Bob',     initialSupplyInWei -  1 * 10 ** tokenInfos.decimals - 10);
            checkBalanceOf('Charlie', 1 * 10 ** tokenInfos.decimals + 10);

            // we let Alice spend: 2
            it("Alice should not be able to spend 2 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, 2).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',2);
                        assert(false, "This Tx should have failed");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send 2 wei tokens from Bob to Charlie");
                    }
                )
            });

            // we let Alice spend: -2
            it("Alice should not be able to spend -2 wei Bob tokens", function() {
                return myToken.transferFrom(bob, charlie, -2).then(
                    function(tx) {
                        checkTransferEvent(tx,'Bob','Charlie',-2);
                        assert(false, "This Tx should have failed");
                    },
                    function(err) {
                        // should not have failed
                        assert.match(err, errorPattern, "Alice should NOT have been able to send -2 wei tokens from Bob to Charlie");
                    }
                )
            });

        });


    });


    // todo: counting gas spending with tx.receipt.gasUsed
    /*
    it("Total gas cost: "+totalGasUsed+" (contract deployment not included)", function() {
        assert(2000000 > totalGasUsed,"Gas used should be lesser than 2M gas.");

    });
    */


};




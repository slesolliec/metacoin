
var suite = require('../node_modules/token-test-suite/suite');

const MyToken = artifacts.require('MyAdvancedToken')

let options = {
    // accounts to test with, accounts[0] being the contract owner
    accounts: accounts,

    // factory method to create new token contract
    create: async function () {
        return await MyToken.new()
    },

    // factory callbacks to mint or transfer the tokens
    mint: async function (token, to, amount) {
        return await token.transfer(to, amount, { from: accounts[0] })
    },

    // optional:
    // also test the increaseApproval/decreaseApproval methods (not part of the ERC-20 standard)
    increaseDecreaseApproval: true,

    // token info to test
    name: 'MyToken',
    symbol: 'MTK',
    decimals: 18,

    // initial state to test
    initialSupply: 100,
    initialBalances: [
        [accounts[0], 100]
    ],
    initialAllowances: [
        [accounts[0], accounts[1], 0]
    ]
}

contract('MyToken', function (accounts) { suite(options) })
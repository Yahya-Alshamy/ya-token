const { assert } = require("chai");

/* eslint-disable no-undef */
const Token = artifacts.require("Token");
const EthSwap = artifacts.require("EthSwap");

require("chai")
  .use(require("chai-as-promised"))
  .should();

function tokens(n) {
  return web3.utils.toWei(n, "ether");
}

contract("EthSwap", ([deployer, investor]) => {
  let token, ethSwap;
  before(async () => {
    token = await Token.new();
    ethSwap = await EthSwap.new(token.address);
    token.transfer(ethSwap.address, tokens("1000000"));
  });

  describe("Token deployment", async () => {
    it("contract has a name", async () => {
      const name = await token.name();
      assert.equal(name, "DApp Token");
    });
  });
  describe("EthSwap deployment", async () => {
    it("contract has a name", async () => {
      const name = await ethSwap.name();
      assert.equal(name, "EthSwap Instant Exchange");
    });
    it("contract has the tokens", async () => {
      let balance = await token.balanceOf(ethSwap.address);
      assert.equal(balance.toString(), tokens("1000000"));
    });
  });
  describe("buy Tokens", async () => {
    let result;
    before(async () => {
      // purchase tokens before each example
      result = await ethSwap.buyTokens({ from: investor, value: tokens("1") });
    });
    it("Allows use to instantly purchase tokens from ehtswap for a fixed price", async () => {
      // check investor token balance after purchase
      let investorBalance = await token.balanceOf(investor);
      assert.equal(investorBalance.toString(), tokens("100"));

      let ethSwapBalance = await token.balanceOf(ethSwap.address);
      assert.equal(
        ethSwapBalance.toString(),
        tokens("1000000") - tokens("100")
      );
      ethSwapBalance = await web3.eth.getBalance(ethSwap.address);
      assert.equal(ethSwapBalance.toString(), web3.utils.toWei("1", "ether"));

      const event = result.logs[0].args;
      assert.equal(event.account, investor);
      assert.equal(event.amount.toString(), tokens("100").toString());
      assert.equal(event.rate.toString(), "100");
    });
  });
  describe("sell Tokens", async () => {
    let result;
    before(async () => {
      // investor must approve tokens before the purchase
      await token.approve(ethSwap.address, tokens("100"), { from: investor });
      // investor sells the tokens
      result = await ethSwap.sellTokens(tokens("100"), { from: investor });
    });
    it("Allows use to instantly sell tokens to ehtswap for a fixed price", async () => {
      // check investor balance after purchase
      let investorBalance = await token.balanceOf(investor);
      assert.equal(investorBalance.toString(), tokens("0"));
      let ethSwapBalance = await token.balanceOf(ethSwap.address);
      assert.equal(ethSwapBalance.toString(), tokens("1000000"));
      ethSwapBalance = await web3.eth.getBalance(ethSwap.address);
      assert.equal(ethSwapBalance.toString(), web3.utils.toWei("0", "ether"));

      // check logs to insure the event was emitted after the sale
      const event = result.logs[0].args;
      assert.equal(event.account, investor);
      assert.equal(event.amount.toString(), tokens("100").toString());
      assert.equal(event.rate.toString(), "100");

      // FAILURE: investor can't sell more tokens than they have
      await ethSwap.sellTokens(tokens("500"), { from: investor }).should.be
        .rejected;
    });
  });
});

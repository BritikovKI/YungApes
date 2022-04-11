const { expect } = require("chai");
const { ethers } = require("hardhat");
const { expectRevert } = require("@openzeppelin/test-helpers");

const init = require("./test-init.js");

let yapes;
let setup;
let root;
let admin;
let minter;
let user;
let beneficiary;

const ONE_TOKEN = ethers.BigNumber.from("1000000000000000000");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const deploy = async () => {
  const setup = await init.initialize(await ethers.getSigners());

  setup.data = {};

  return setup;
};


describe("Yapes", function () {

  before("!! setup", async () => {
    setup = await deploy();

    root = setup.roles.root;
    beneficiary = setup.roles.beneficiary;
    admin = setup.roles.owner;
    minter = setup.roles.minter;
    user = setup.roles.user;

    const Yapes = await ethers.getContractFactory("Yapes");
    yapes = await Yapes.deploy(beneficiary.address);
    await yapes.deployed();
  });

  context("check initialization", async () => {
    it("Check name", async function () {
      expect(await yapes.name()).to.equal("Yapes Token");
    });

    it("Check symbol", async function () {
      expect(await yapes.symbol()).to.equal("YAPES");
    });

    it("Check decimals", async function () {
      expect(await yapes.decimals()).to.equal(18);
    });
  })

  context("whitelist", async () => {

    it("Should whitelist address", async function () {
      await yapes.whitelist(beneficiary.address);
      expect(await yapes.noTaxWhitelist(beneficiary.address)).to.equal(true);
    });

    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).whitelist(beneficiary.address));
    });

  });

  context("removeFromWhitelist", async () => {

    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).removeFromWhitelist(beneficiary.address));
    });

    it("Should remove address from whitelist", async function () {
      await yapes.removeFromWhitelist(beneficiary.address);
      expect(await yapes.noTaxWhitelist(beneficiary.address)).to.equal(false);
    });

  });

  context("addMinter", async () => {

    it("Should add minter", async function () {
      await yapes.addMinter(beneficiary.address);
      expect(await yapes.minters(beneficiary.address)).to.equal(true);
    });

    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).addMinter(beneficiary.address));
    });

  });


  context("removeMinter", async () => {

    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).removeMinter(beneficiary.address));
    });

    it("Should remove minter", async function () {
      await yapes.removeMinter(beneficiary.address);
      expect(await yapes.minters(beneficiary.address)).to.equal(false);
    });

  });

  context("mint", async () => {
    before("Adds minter", async () => {
      await yapes.addMinter(beneficiary.address);
    })


    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.connect(root).
      mint(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).mint(beneficiary.address, ONE_TOKEN));
    });

    it("Should mint money from Owner", async function () {
      await yapes.mint(beneficiary.address, ONE_TOKEN);
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN);
    });

    it("Should mint money from Minter", async function () {
      await yapes.connect(beneficiary).mint(beneficiary.address, ONE_TOKEN);
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN.mul(2));
    });

    it("Check totalSupply", async function () {
      expect(await  await yapes.totalSupply()).to.equal(ONE_TOKEN.mul(2));
    });

  });

  context("burn", async () => {
    it("Should revert with 'Ownable: caller is not the owner'", async function () {
      await expectRevert.unspecified(yapes.connect(user).burn(beneficiary.address, ONE_TOKEN));
    });

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.connect(root).
      burn(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should revert with 'ERC20: burn amount exceeds balance'", async function () {
      await expectRevert.unspecified(yapes.burn(beneficiary.address, ONE_TOKEN.mul(3)));
    });

    it("Should burn money from Owner", async function () {
      await yapes.burn(beneficiary.address, ONE_TOKEN);
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN);
    });

    it("Should mint money from Minter", async function () {
      await yapes.connect(beneficiary).burn(beneficiary.address, ONE_TOKEN);
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(0);
    });

    it("Check totalSupply", async function () {
      expect(await  await yapes.totalSupply()).to.equal(0);
    });

  });

  context("transfer", async () => {

    before("Mints tokens", async () => {
      await yapes.connect(beneficiary).mint(user.address, ONE_TOKEN.mul(2));
      await yapes.connect(beneficiary).mint(beneficiary.address, ONE_TOKEN);
      await yapes.whitelist(beneficiary.address);
    })

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.transfer(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should revert with 'ERC20: transfer amount exceeds balance'", async function () {
      await expectRevert.unspecified(yapes.transfer(user.address, ONE_TOKEN));
    });

    it("Should revert with 'ERC20: unable to pay fee from transfer'", async function () {
      await expectRevert.unspecified(yapes.connect(user).transfer(beneficiary.address, ONE_TOKEN.mul(2)));
    });

    it("Should transfer money from user", async function () {
      await yapes.connect(user).transfer(root.address, ONE_TOKEN);
      expect(await yapes.balanceOf(root.address)).to.equal(ONE_TOKEN);
      expect(await yapes.balanceOf(user.address)).to.equal(ONE_TOKEN.sub(ONE_TOKEN.div(100).mul(15)));
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN.add(ONE_TOKEN.div(100).mul(5)));
      await yapes.burn(user.address, ONE_TOKEN.sub(ONE_TOKEN.div(100).mul(15)));
    });

    it("Should transfer money from beneficiary", async function () {
      await yapes.connect(beneficiary).transfer(root.address, ONE_TOKEN);
      expect(await yapes.balanceOf(root.address)).to.equal(ONE_TOKEN.mul(2));
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN.div(100).mul(5));
      await yapes.burn(beneficiary.address, ONE_TOKEN.div(100).mul(5));
      await yapes.burn(root.address, ONE_TOKEN.mul(2));
    });

  });


  context("transferFrom", async () => {

    before("Mints tokens", async () => {
      await yapes.connect(beneficiary).mint(user.address, ONE_TOKEN.mul(2));
      await yapes.connect(beneficiary).mint(beneficiary.address, ONE_TOKEN);
      await yapes.whitelist(beneficiary.address);
      await yapes.connect(beneficiary).approve(root.address, ONE_TOKEN);
      await yapes.connect(user).approve(root.address, ONE_TOKEN.mul(2));
    })

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.connect(root).
        transferFrom(beneficiary.address, ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should revert with 'ERC20: transfer amount exceeds balance'", async function () {
      await expectRevert.unspecified(yapes.connect(root).
        transferFrom(beneficiary.address ,root.address, ONE_TOKEN.mul(2)));
    });

    it("Should revert with 'ERC20: unable to pay fee from transfer'", async function () {
      await expectRevert.unspecified(yapes.connect(root).
        transferFrom(user.address, root.address, ONE_TOKEN.mul(2)));
    });

    it("Should transfer money from user", async function () {
      await yapes.connect(root).transferFrom(user.address, root.address, ONE_TOKEN);
      expect(await yapes.balanceOf(root.address)).to.equal(ONE_TOKEN);
      expect(await yapes.balanceOf(user.address)).to.equal(ONE_TOKEN.sub(ONE_TOKEN.div(100).mul(15)));
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN.add(ONE_TOKEN.div(100).mul(5)));
    });

    it("Should transfer money from beneficiary", async function () {
      await yapes.connect(root).transferFrom(beneficiary.address, root.address, ONE_TOKEN);
      expect(await yapes.balanceOf(root.address)).to.equal(ONE_TOKEN.mul(2));
      expect(await yapes.balanceOf(beneficiary.address)).to.equal(ONE_TOKEN.div(100).mul(5));
    });

  });


  context("approve", async () => {

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.approve(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should approve transfer", async function () {
      await yapes.connect(root).approve(user.address, ONE_TOKEN);
      expect(await yapes.allowance(root.address, user.address)).to.equal(ONE_TOKEN);
    });

    it("Should reapprove transfer", async function () {
      await yapes.connect(root).approve(user.address, 0);
      expect(await yapes.allowance(root.address, user.address)).to.equal(0);
    });

  });

  context("increaseAllowance", async () => {

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.increaseAllowance(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should approve transfer", async function () {
      await yapes.connect(root).increaseAllowance(user.address, ONE_TOKEN);
      expect(await yapes.allowance(root.address, user.address)).to.equal(ONE_TOKEN);
    });

  });

  context("decreaseAllowance", async () => {

    it("Should revert with 'ERC20: transfer to the zero address'", async function () {
      await expectRevert.unspecified(yapes.decreaseAllowance(ZERO_ADDRESS, ONE_TOKEN));
    });

    it("Should approve transfer", async function () {
      await yapes.connect(root).decreaseAllowance(user.address, ONE_TOKEN);
      expect(await yapes.allowance(root.address, user.address)).to.equal(0);
    });

  });

});

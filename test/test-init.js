const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;




const PROXY_CREATION = "ProxyCreation";

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    owner: accounts[1],
    beneficiary: accounts[2],
    minter: accounts[3],
    user: accounts[4],
  };

  return setup;
};

const getGnosisProxyInstance = async (setup) => {
  const gnosisSafeProxyFactoryFactory = await ethers.getContractFactory(
    "GnosisSafeProxyFactory",
    setup.roles.prime
  );
  const gnosisSafeProxyFactoryInstance =
    await gnosisSafeProxyFactoryFactory.deploy();

  const proxy_tx = await gnosisSafeProxyFactoryInstance
    .connect(setup.roles.prime)
    .createProxy(setup.gnosisSafe.address, "0x00");
  const proxy_receit = await proxy_tx.wait();
  const proxy_addr = proxy_receit.events.filter((data) => {
    return data.event === PROXY_CREATION;
  })[0].args["proxy"];
  return await ethers.getContractAt("GnosisSafe", proxy_addr);
};

const getLBPManagerFactory = async (setup) => {
  return await ethers.getContractFactory("LBPManager", setup.roles.root);
};

const getContractInstance = async (factoryName, address, args) => {
  const Factory = await ethers.getContractFactory(factoryName, address);
  const parameters = args ? args : [];
  return await Factory.deploy(...parameters);
};

const signerV2 = async (setup) => {
  const signerV2Factory = await ethers.getContractFactory(
    "SignerV2",
    setup.roles.root
  );
  return await signerV2Factory.deploy(setup.roles.root.address, [], []);
};

module.exports = {
  initialize,
  getGnosisProxyInstance,
  getLBPManagerFactory,
  getContractInstance,
  signerV2,
};
const hre = require("hardhat");
const deployFunction = async ({ getNamedAccounts, deployments, ethers }) => {
    const { deploy } = deployments;
    const { root } = await getNamedAccounts();

    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    await deploy("Yapes", {
        from: root,
        args: [ZERO_ADDRESS],
        log: true,
    });
};

module.exports = deployFunction;
module.exports.tags = ["Seed"];
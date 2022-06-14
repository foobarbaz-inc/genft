const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const RLAgentFactory = await hre.ethers.getContractFactory("RLAgent");
  const tictactoe = await RLAgentFactory.deploy(
    deployer.address,
    deployer.address,
    "0x2AA101B3734e9868F4AD0cB8e97D291bA4E7dD58",
    true,
    0,
    ""
  );

  console.log("RLAgent address:", tictactoe.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

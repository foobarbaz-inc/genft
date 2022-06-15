const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const TicTacToeFactory = await hre.ethers.getContractFactory("TicTacToe");
  const tictactoe = await TicTacToeFactory.deploy(
    "0x3A706a5287edBeA4b0aef5eD75742B3049Ba4d3C", //RLAgent address
    0
  );

  console.log("TicTacToe address:", tictactoe.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

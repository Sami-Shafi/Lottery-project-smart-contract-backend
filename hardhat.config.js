require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("dotenv").config();

const {
	GOERLI_RPC_URL,
	PRIVATE_KEY,
	ALCHEMY_MAINNET_RPC_URL,
	REPORT_GAS,
	COINMARKETCAP_API_KEY,
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.7",
	networks: {
		hardhat: {
			// // If you want to do some forking, uncomment this
			// forking: {
			//   url: MAINNET_RPC_URL
			// }
			chainId: 31337,
			blockConfirmations: 1,
		},
		localhost: {
			chainId: 31337,
		},
		goerli: {
			url: GOERLI_RPC_URL,
			accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
			//   accounts: {
			//     mnemonic: MNEMONIC,
			//   },
			saveDeployments: true,
			chainId: 5,
			blockConfirmations: 6,
		},
		// polygon: {
		//     url: POLYGON_MAINNET_RPC_URL,
		//     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
		//     saveDeployments: true,
		//     chainId: 137,
		// },
	},
	gasReporter: {
		enabled: REPORT_GAS == "true" ? true : false,
		currency: "USD",
		outputFile: "gas-report.txt",
		noColors: true,
		coinmarketcap: COINMARKETCAP_API_KEY,
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
		player: {
			default: 1,
		},
	},
};

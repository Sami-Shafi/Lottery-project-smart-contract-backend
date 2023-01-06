const networkConfig = {
	default: {
		name: "hardhat",
		interval: "30",
		entranceFee: ethers.utils.parseEther("0.01"),
	},
	31337: {
		name: "localhost",
		subId: "588",
		keyHash:
			"0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
		interval: "30",
		entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
		callbackGasLimit: "500000", // 500,000 gas
	},
	5: {
		name: "goerli",
		subId: "8309",
		keyHash:
			"0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
		interval: "30",
		entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
		callbackGasLimit: "500000", // 500,000 gas
		vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
	},
	1: {
		name: "mainnet",
		interval: "30",
	},
};

const devChains = ["hardhat", "localhost"];

module.exports = { networkConfig, devChains };

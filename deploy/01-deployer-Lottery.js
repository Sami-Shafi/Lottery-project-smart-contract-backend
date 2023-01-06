const { network, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../helper-hardhat.config");
const { verify } = require("../utils/verify");
require("dotenv").config();

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainId = network.config.chainId;
	let vrfCoordinatorV2Address, subId, vrfCoordinatorV2Mock;

	if (devChains.includes(network.name)) {
		// create VRFV2 Subscription
		vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

		const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
		const transactionReceipt = await transactionResponse.wait();
		subId = transactionReceipt.events[0].args.subId;
		// Fund the subscription
		// Our mock makes it so we don't actually have to worry about sending fund
		await vrfCoordinatorV2Mock.fundSubscription(subId, VRF_SUB_FUND_AMOUNT);
	} else {
		vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
		subId = networkConfig[chainId]["subId"];
	}

	// get all the constructor values from helper config
	const args = [
		vrfCoordinatorV2Address,
		networkConfig[chainId]["entranceFee"],
		networkConfig[chainId]["keyHash"],
		subId,
		networkConfig[chainId]["callbackGasLimit"],
		networkConfig[chainId]["interval"],
	];

	const lottery = await deploy("Lottery", {
		from: deployer,
		args: args,
		log: true,
		waitConfirmations: network.config.blockConfirmations || 1,
	});

	// need to add consumer on new mock version
	if (devChains.includes(network.name)) {
		await vrfCoordinatorV2Mock.addConsumer(subId, lottery.address);

		log("Consumer is added");
	}

	// verify
	if (!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		log("Verifying...");
		await verify(lottery.address, args);
	}
	log(
		"--------------------------------------------------------------------------"
	);
};

module.exports.tags = ["all", "lottery"];

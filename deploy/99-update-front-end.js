const { ethers, network } = require("hardhat");
const fs = require("fs");

const ADDRESSES_FILE_LOCATION =
	"../react-nextjs-lottery-frontend/constants/contractAddresses.json";
const ABI_FILE_LOCATION = "../react-nextjs-lottery-frontend/constants/abi.json";

module.exports = async () => {
	if (process.env.UPDATE_FRONT_END) {
		console.log("Updating Front End...");
		updateContractAddresses();
		updateAbi();
	}
};

const updateAbi = async () => {
	const lottery = await ethers.getContract("Lottery");

	fs.writeFileSync(
		ABI_FILE_LOCATION,
		// get abi with one line of code
		lottery.interface.format(ethers.utils.FormatTypes.json)
	);
};

const updateContractAddresses = async () => {
	const lottery = await ethers.getContract("Lottery");
	const chainId = network.config.chainId.toString();

	const currentAddresses = JSON.parse(
		fs.readFileSync(ADDRESSES_FILE_LOCATION, "utf8")
	);

	if (chainId in currentAddresses) {
		// if the address json has the requested chainId but haven't the contract address yet
		if (!currentAddresses[chainId].includes(lottery.address)) {
			currentAddresses[chainId].push(lottery.address);
		}
	} else {
		// make a new object with key chainId and value address
		currentAddresses[chainId] = [lottery.address];
	}

	fs.writeFileSync(ADDRESSES_FILE_LOCATION, JSON.stringify(currentAddresses));
};

module.exports.tags = ["all", "frontend"];

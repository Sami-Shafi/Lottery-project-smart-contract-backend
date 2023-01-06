const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../../helper-hardhat.config");

!devChains.includes(network.name)
	? describe("Lottery", () => {
			let lottery, entranceFee, deployer;

			beforeEach(async () => {
				deployer = (await getNamedAccounts()).deployer;
				// connect contracts
				lottery = await ethers.getContract("Lottery", deployer);
				entranceFee = await lottery.getEntranceFee();
			});

			describe("FulfillRandomWords", () => {
				it("works with chainlink keepers and VRF, we get a random winner from the oracle", async () => {
					const startingTimestamp = await lottery.getLatestTimestamp();
					const accounts = await ethers.getSigners();

					await new Promise(async (resolve, reject) => {
						lottery.once("WinnerPicked", async () => {
							console.log("WinnerPicked Event Fired!");
							try {
								const recentWinner = await lottery.getRecentWinner();
								const lotteryState = await lottery.getLotteryState();
								const winnerEndingBalance = await accounts[0].getBalance();
								const endingTimestamp = await lottery.getLatestTimestamp();

								await expect(lottery.getPlayer(0)).to.be
									.reverted;
								assert.equal(
									recentWinner.toString(),
									accounts[0].address
								);
								assert.equal(lotteryState, 0);

								// same code as unit testing
								const totalReward = entranceFee
									.mul(additionalEntries)
									.add(entranceFee);
								assert.equal(
									winnerEndingBalance.toString(),
									winnerStartingBalance
										.add(totalReward)
										.toString()
								);
								resolve();
							} catch (err) {
								console.log(err);
								reject(err);
							}
						});

						await lottery.enterTheLottery({ value: entranceFee });
						const winnerStartingBalance = await accounts[0].getBalance();
					});
				});
			});
	  })
	: describe.skip;

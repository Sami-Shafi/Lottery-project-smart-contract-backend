const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../../helper-hardhat.config");

!devChains.includes(network.name)
	? describe.skip
	: describe("Lottery", () => {
			let lottery, vrfCoordinatorV2Mock, entranceFee, deployer, interval;
			const chainId = network.config.chainId;

			beforeEach(async () => {
				deployer = (await getNamedAccounts()).deployer;
				await deployments.fixture(["all"]);

				// connect contracts
				lottery = await ethers.getContract("Lottery", deployer);
				vrfCoordinatorV2Mock = await ethers.getContract(
					"VRFCoordinatorV2Mock",
					deployer
				);

				entranceFee = await lottery.getEntranceFee();
				interval = await lottery.getInterval();
			});

			describe("Constructor", () => {
				it("Initializes Correctly", async () => {
					const lotteryState = await lottery.getLotteryState();
					assert.equal(lotteryState.toString(), "0");
					assert.equal(
						interval.toString(),
						networkConfig[chainId]["interval"]
					);
				});
			});

			describe("Enter Lottery", () => {
				it("It reverts if you don't pay enough", async () => {
					await expect(
						lottery.enterTheLottery()
					).to.be.revertedWithCustomError(
						lottery,
						"Lottery_NotEnoughETHEntered"
					);
				});

				it("It records players when they enter", async () => {
					await lottery.enterTheLottery({ value: entranceFee });
					const playerFromContract = await lottery.getPlayer(0);
					assert.equal(playerFromContract, deployer);
				});

				it("Emits event after entering", async () => {
					await expect(
						lottery.enterTheLottery({ value: entranceFee })
					).to.emit(lottery, "LotteryEntered");
				});

				it("Doesn't allow entry when lottery is calculating", async () => {
					await lottery.enterTheLottery({ value: entranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
					await lottery.performUpkeep([]);

					await expect(
						lottery.enterTheLottery({ value: entranceFee })
					).to.be.revertedWithCustomError(lottery, "Lottery_NotOpen");
				});

				describe("CheckUpkeep", () => {
					it("Returns false if people haven't sent any ETH", async () => {
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.send("evm_mine", []);

						const {
							upkeepNeeded,
						} = await lottery.callStatic.checkUpkeep([]);
						assert(!upkeepNeeded);
					});

					it("Returns false if lottery is not open", async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.send("evm_mine", []);
						await lottery.performUpkeep([]);

						const lotteryState = await lottery.getLotteryState();
						const {
							upkeepNeeded,
						} = await lottery.callStatic.checkUpkeep([]);

						assert.equal(lotteryState.toString(), 1);
						assert.equal(upkeepNeeded, false);
					});

					it("returns false if enough time hasn't passed", async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() - 5,
						]); // use a higher number here if this test fails
						await network.provider.request({
							method: "evm_mine",
							params: [],
						});
						const {
							upkeepNeeded,
						} = await lottery.callStatic.checkUpkeep([]); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
						assert(!upkeepNeeded);
					});
					it("returns true if enough time has passed, has players, eth, and is open", async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.request({
							method: "evm_mine",
							params: [],
						});
						const {
							upkeepNeeded,
						} = await lottery.callStatic.checkUpkeep([]); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
						assert(upkeepNeeded);
					});
				});

				describe("PerformUpkeep", () => {
					it("It will only work if checkUpkeep is true", async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.send("evm_mine", []);

						const tx = await lottery.performUpkeep([]);
						assert(tx);
					});

					it("It reverts if checkUpkeep is false", async () => {
						await expect(
							lottery.performUpkeep([])
						).to.be.revertedWithCustomError(
							lottery,
							"Lottery_UpkeepNotNeeded"
						);
					});

					it("It updates lottery state, emits event, and calls the vrf coordinator", async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.send("evm_mine", []);

						const txResponse = await lottery.performUpkeep([]);
						const txReceipt = await txResponse.wait(1);

						const requestId = txReceipt.events[1].args.requestId;
						assert(requestId.toNumber() > 0);

						const lotteryState = await lottery.getLotteryState();
						assert(lotteryState.toString() == "1");
					});
				});

				describe("FulfillRandomWords", () => {
					beforeEach(async () => {
						await lottery.enterTheLottery({ value: entranceFee });
						await network.provider.send("evm_increaseTime", [
							interval.toNumber() + 1,
						]);
						await network.provider.send("evm_mine", []);
					});

					it("Can only be called after performUpkeep", async () => {
						await expect(
							vrfCoordinatorV2Mock.fulfillRandomWords(
								0,
								lottery.address
							)
						).to.be.revertedWith("nonexistent request");
						await expect(
							vrfCoordinatorV2Mock.fulfillRandomWords(
								1,
								lottery.address
							)
						).to.be.revertedWith("nonexistent request");
					});

					it.only("Picks a winner, resets lottery, and sends money", async () => {
						// add some fake players to test. the deployer index is 0
						// so starting account index is 1
						const additionalEntries = 3;
						const startingAccountIndex = 1;
						const accounts = await ethers.getSigners();

						for (
							i = startingAccountIndex;
							i <= additionalEntries;
							i++
						) {
							const connectedAccount = lottery.connect(
								accounts[i]
							);
							await connectedAccount.enterTheLottery({
								value: entranceFee,
							});
						}
						const startingTimestamp = await lottery.getLatestTimestamp();

						await new Promise(async (resolve, reject) => {
							lottery.once("WinnerPicked", async () => {
								console.log("Found the Event!");
								try {
									const recentWinner = await lottery.getRecentWinner();
									const lotteryState = await lottery.getLotteryState();
									const timestamp = await lottery.getLatestTimestamp();
									const numPlayers = await lottery.getNumOfPlayers();
									console.log(recentWinner);
									console.log(accounts[0].address);
									console.log(accounts[1].address);
									console.log(accounts[2].address);
									console.log(accounts[3].address);

									assert.equal(numPlayers.toString(), "0");
									assert.equal(lotteryState.toString(), "0");
									assert(timestamp > startingTimestamp);
								} catch (err) {
									reject(err);
								}
								resolve();
							});

							const tx = await lottery.performUpkeep([]);
							const txReceipt = await tx.wait(1);
							await vrfCoordinatorV2Mock.fulfillRandomWords(
								txReceipt.events[1].args.requestId,
								lottery.address
							);
						});
					});
				});
			});
	  });

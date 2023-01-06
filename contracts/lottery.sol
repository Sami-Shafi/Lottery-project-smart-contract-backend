// Tasks
// Enter the lottery by paying
// pick winner randomly
// restart lottery every X minute

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// imports
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery_NotEnoughETHEntered();
error Lottery_TransferFailed();
error Lottery_NotOpen();
error Lottery_UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 lotteryState
);

// subId: 8309
// Consuming Contract: 0xf3CF907EbE9085A3493AD3962F0a82Df56723F8b
// KeyHash: 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15
// vrf Coordinator: 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D

/**
 * @title A sample Raffle Contract
 * @author Sami Shafi
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // Types
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // state variable
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // lottery variables
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Events
    event LotteryEntered(address indexed player);
    event RequstedRandomWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // functions
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 keyHash,
        uint64 subId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyHash = keyHash;
        i_subscriptionId = subId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    // payable
    function enterTheLottery() public payable {
        // if enough eth is not payed, give error
        if (msg.value < i_entranceFee) {
            revert Lottery_NotEnoughETHEntered();
        }

        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery_NotOpen();
        }

        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }

    /**
     * @dev CheckUpKeep from chainlink
     * This function look for the UpkeepNeeded to return true
     * These 3 needs to be true:
     * 1. Our Time Interval should pass
     * 2. The Lottery should have at least 1 player and some ETH
     * 3. Our Subscription needs to be funded with link
     * 4. The Lottery should be "Open" and ready to restart
     */

    // public
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = s_lotteryState == LotteryState.OPEN;
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    // external
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = this.checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery_UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }

        // put state to calculating
        s_lotteryState = LotteryState.CALCULATING;

        // chainlink code
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequstedRandomWinner(requestId);
    }

    // fullfillRandomWords chainlink vrf
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        // get randomWinner from players
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;

        // change the lottery state
        s_lotteryState = LotteryState.OPEN;

        // remove the players and transfer money
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery_TransferFailed();
        }

        emit WinnerPicked(recentWinner);
    }

    // view and pure function
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimestamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }
}

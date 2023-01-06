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

// subId: 8309
// Consuming Contract: 0xf3CF907EbE9085A3493AD3962F0a82Df56723F8b
// KeyHash: 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15
// vrf Coordinator: 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // state variable
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // lottery variables
    address private s_recentWinner;

    // Events
    event LotteryEntered(address indexed player);
    event RequstedRandomWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 keyHash,
        uint64 subId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyHash = keyHash;
        i_subscriptionId = subId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterTheLottery() public payable {
        // if enough eth is not payed, give error
        if (msg.value < i_entranceFee) {
            revert Lottery_NotEnoughETHEntered();
        }

        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }

    /*
     * @dev CheckUpKeep from chainlink
     */

    // function checkUpKeep(bytes calldata checkData) external override {
        
    // }

    // external
    function requestRandomWinner() external {
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
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
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
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

enum EscrowState {
    Open,
    Delivered,
    Resolved,
    Disputed,
    Refunded
}

struct EscrowDetails {
    address client;
    address provider;
    address admin;
    address token;
    uint256 amount;
    EscrowState state;
    bool clientApproved;
    bool providerMarkedDone;
}

contract Escrow {
    EscrowDetails public details;

    event Funded(address indexed client, uint256 amount);
    event MarkedDelivered(address indexed provider);
    event Approved(address indexed client);
    event Released(address indexed provider, uint256 amount);
    event Disputed(address indexed by);
    event Resolved(address indexed admin, address indexed to, uint256 amount);
    event Refunded(address indexed client, uint256 amount);

    error Unauthorized();
    error InvalidState();
    error TransferFailed();

    modifier onlyClient() {
        if (msg.sender != details.client) revert Unauthorized();
        _;
    }

    modifier onlyProvider() {
        if (msg.sender != details.provider) revert Unauthorized();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != details.admin) revert Unauthorized();
        _;
    }

    modifier inState(EscrowState expected) {
        if (details.state != expected) revert InvalidState();
        _;
    }

    constructor(address client, address provider, address admin, address token, uint256 amount) {
        details.client = client;
        details.provider = provider;
        details.admin = admin;
        details.token = token;
        details.amount = amount;
        details.state = EscrowState.Open;
    }

    /// Fund the escrow by transferring tokens in. Caller must have approved this contract.
    function fund() external onlyClient inState(EscrowState.Open) {
        bool ok = IERC20(details.token).transferFrom(msg.sender, address(this), details.amount);
        if (!ok) revert TransferFailed();
        emit Funded(msg.sender, details.amount);
    }

    /// Receive native ETH into escrow (for native-token escrows where token == address(0)).
    receive() external payable {
        if (details.token != address(0)) revert InvalidState();
        if (msg.sender != details.client) revert Unauthorized();
        emit Funded(msg.sender, msg.value);
    }

    /// Provider signals work is delivered.
    function markDelivered() external onlyProvider inState(EscrowState.Open) {
        details.providerMarkedDone = true;
        details.state = EscrowState.Delivered;
        emit MarkedDelivered(msg.sender);
    }

    /// Client approves the delivery and releases funds to provider.
    function approve() external onlyClient inState(EscrowState.Delivered) {
        details.clientApproved = true;
        details.state = EscrowState.Resolved;
        _pay(details.provider);
        emit Approved(msg.sender);
        emit Released(details.provider, details.amount);
    }

    /// Either party can raise a dispute after delivery is marked.
    function dispute() external inState(EscrowState.Delivered) {
        if (msg.sender != details.client && msg.sender != details.provider) revert Unauthorized();
        details.state = EscrowState.Disputed;
        emit Disputed(msg.sender);
    }

    /// Admin resolves dispute — sends funds to the winner (client or provider).
    function resolve(address payable to) external onlyAdmin inState(EscrowState.Disputed) {
        if (to != details.client && to != details.provider) revert Unauthorized();
        details.state = EscrowState.Resolved;
        _pay(to);
        emit Resolved(msg.sender, to, details.amount);
    }

    /// Client can reclaim funds if escrow is still open (provider hasn't delivered).
    function refund() external onlyClient inState(EscrowState.Open) {
        details.state = EscrowState.Refunded;
        _pay(details.client);
        emit Refunded(msg.sender, details.amount);
    }

    function getDetails() external view returns (EscrowDetails memory) {
        return details;
    }

    function _pay(address to) internal {
        if (details.token == address(0)) {
            (bool ok,) = to.call{value: address(this).balance}("");
            if (!ok) revert TransferFailed();
        } else {
            bool ok = IERC20(details.token).transfer(to, details.amount);
            if (!ok) revert TransferFailed();
        }
    }
}

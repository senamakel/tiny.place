// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Escrow} from "./Escrow.sol";

contract EscrowFactory {
    event EscrowCreated(address indexed escrow, address indexed client, address indexed provider);

    address public admin;
    address[] public escrows;

    error Unauthorized();

    constructor(address _admin) {
        admin = _admin;
    }

    function createEscrow(
        address client,
        address provider,
        address token,
        uint256 amount
    ) external returns (address) {
        Escrow escrow = new Escrow(client, provider, admin, token, amount);
        escrows.push(address(escrow));
        emit EscrowCreated(address(escrow), client, provider);
        return address(escrow);
    }

    function getEscrows() external view returns (address[] memory) {
        return escrows;
    }

    function setAdmin(address _admin) external {
        if (msg.sender != admin) revert Unauthorized();
        admin = _admin;
    }
}

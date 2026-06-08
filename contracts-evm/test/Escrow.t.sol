// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Escrow, EscrowState, EscrowDetails} from "../src/Escrow.sol";
import {EscrowFactory} from "../src/EscrowFactory.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name = "Mock";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract EscrowTest is Test {
    Escrow escrow;
    MockERC20 token;
    address client = address(0x1);
    address provider = address(0x2);
    address admin = address(0x3);
    uint256 amount = 1000e18;

    function setUp() public {
        token = new MockERC20();
        escrow = new Escrow(client, provider, admin, address(token), amount);
        token.mint(client, amount);
        vm.prank(client);
        token.approve(address(escrow), amount);
    }

    function test_fund() public {
        vm.prank(client);
        escrow.fund();
        assertEq(token.balanceOf(address(escrow)), amount);
    }

    function test_happyPath() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(provider);
        escrow.markDelivered();

        vm.prank(client);
        escrow.approve();

        EscrowDetails memory d = escrow.getDetails();
        assertTrue(d.state == EscrowState.Resolved);
        assertEq(token.balanceOf(provider), amount);
    }

    function test_dispute_resolveToClient() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(provider);
        escrow.markDelivered();

        vm.prank(client);
        escrow.dispute();

        vm.prank(admin);
        escrow.resolve(payable(client));

        assertEq(token.balanceOf(client), amount);
    }

    function test_dispute_resolveToProvider() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(provider);
        escrow.markDelivered();

        vm.prank(provider);
        escrow.dispute();

        vm.prank(admin);
        escrow.resolve(payable(provider));

        assertEq(token.balanceOf(provider), amount);
    }

    function test_refund() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(client);
        escrow.refund();

        assertEq(token.balanceOf(client), amount);
    }

    function test_revert_unauthorizedApprove() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(provider);
        escrow.markDelivered();

        vm.prank(provider);
        vm.expectRevert(Escrow.Unauthorized.selector);
        escrow.approve();
    }

    function test_revert_resolveNotAdmin() public {
        vm.prank(client);
        escrow.fund();

        vm.prank(provider);
        escrow.markDelivered();

        vm.prank(client);
        escrow.dispute();

        vm.prank(client);
        vm.expectRevert(Escrow.Unauthorized.selector);
        escrow.resolve(payable(client));
    }
}

contract EscrowFactoryTest is Test {
    EscrowFactory factory;
    MockERC20 token;
    address admin = address(0x3);

    function setUp() public {
        factory = new EscrowFactory(admin);
        token = new MockERC20();
    }

    function test_createEscrow() public {
        address e = factory.createEscrow(address(0x1), address(0x2), address(token), 1000e18);
        assertEq(factory.getEscrows().length, 1);
        assertEq(factory.getEscrows()[0], e);
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;

// Wrapped native token (WOPN) interface used by the router.
interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function withdraw(uint256) external;
}

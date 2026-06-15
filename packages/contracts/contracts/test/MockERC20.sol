// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Test ERC-20 with configurable decimals and an open faucet, for use on
///         OPN Testnet only (mUSDC / mUSDT / mDAI). Do NOT deploy to mainnet.
contract MockERC20 is ERC20, Ownable {
    uint8 private immutable _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply * 10 ** decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Owner mint (for seeding liquidity / distributing test funds).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Public testnet faucet: anyone can claim 1,000 tokens.
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** _decimals);
    }
}

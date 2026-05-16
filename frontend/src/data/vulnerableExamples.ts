import type { ContractExample } from "./contractExamples";

/** Additional vulnerable patterns for the examples library (security education). */
export const vulnerableContractExamples: ContractExample[] = [
  {
    id: "tx-origin-auth",
    name: "tx.origin Authentication",
    description: "Uses tx.origin for auth — vulnerable to phishing via malicious contracts",
    category: "vulnerable",
    difficulty: "intermediate",
    tags: ["security", "tx-origin", "phishing", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TxOriginWallet {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // VULNERABLE: tx.origin can differ from msg.sender in nested calls
    function withdraw() public {
        require(tx.origin == owner, "Not owner");
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {}
}`,
  },
  {
    id: "missing-access-control",
    name: "Missing Access Control",
    description: "Anyone can drain funds — no owner check on sensitive function",
    category: "vulnerable",
    difficulty: "beginner",
    tags: ["security", "access-control", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OpenVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // VULNERABLE: no access control — any address can withdraw any amount
    function emergencyWithdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    // VULNERABLE: owner-only logic missing entirely
    function drainAll(address to) external {
        payable(to).transfer(address(this).balance);
    }
}`,
  },
  {
    id: "unchecked-call",
    name: "Unchecked Low-Level Call",
    description: "Ignores return value of call — silent failures and inconsistent state",
    category: "vulnerable",
    difficulty: "intermediate",
    tags: ["security", "unchecked-call", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UncheckedCaller {
    mapping(address => uint256) public credits;

    function deposit() external payable {
        credits[msg.sender] += msg.value;
    }

    function payout(address to, uint256 amount) external {
        require(credits[msg.sender] >= amount, "credit");
        credits[msg.sender] -= amount;
        // VULNERABLE: return value ignored
        to.call{value: amount}("");
    }
}`,
  },
  {
    id: "honeypot-token",
    name: "Honeypot Token (sell blocked)",
    description: "Meme-token pattern: trading gate and blacklist — common rug vector",
    category: "vulnerable",
    difficulty: "advanced",
    tags: ["security", "honeypot", "trading", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HoneypotToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public blacklist;
    address public owner;
    bool public tradingEnabled;
    uint256 public buyFee = 5;
    uint256 public sellFee = 99;

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        tradingEnabled = false;
    }

    function enableTrading() external onlyOwner {
        tradingEnabled = true;
    }

    function setBlacklist(address account, bool blocked) external onlyOwner {
        blacklist[account] = blocked;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(tradingEnabled, "Trading not enabled");
        require(!blacklist[msg.sender], "Blacklisted");
        // VULNERABLE: sell path can be blocked via fees / gates in real deployments
        if (to == address(this)) {
            revert("cannot sell");
        }
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        balanceOf[to] += amount;
    }
}`,
  },
  {
    id: "unlimited-mint",
    name: "Unlimited Owner Mint",
    description: "Owner can mint arbitrary supply — dilution / rug risk",
    category: "vulnerable",
    difficulty: "intermediate",
    tags: ["security", "mint", "ownership", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InflationToken {
    string public name = "Inflation";
    string public symbol = "INF";
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    // VULNERABLE: uncapped mint to any wallet
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }
}`,
  },
  {
    id: "dangerous-delegatecall",
    name: "Dangerous Delegatecall",
    description: "Arbitrary delegatecall to user-supplied implementation",
    category: "vulnerable",
    difficulty: "advanced",
    tags: ["security", "delegatecall", "upgrade", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UnsafeProxy {
    address public implementation;

    function setImplementation(address impl) external {
        // VULNERABLE: no timelock / multisig — anyone can point logic
        implementation = impl;
    }

    function execute(bytes calldata data) external payable {
        (bool ok, ) = implementation.delegatecall(data);
        require(ok, "delegatecall failed");
    }
}`,
  },
  {
    id: "selfdestruct-rug",
    name: "Unrestricted Selfdestruct",
    description: "Anyone can destroy the contract and send ETH elsewhere",
    category: "vulnerable",
    difficulty: "intermediate",
    tags: ["security", "selfdestruct", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KillableBank {
    mapping(address => uint256) public deposits;

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
    }

    // VULNERABLE: no access control on selfdestruct
    function destroyAndSend(address payable recipient) external {
        selfdestruct(recipient);
    }
}`,
  },
  {
    id: "oracle-manipulation",
    name: "Single Oracle Price",
    description: "Uses one spot price with no TWAP — flash-loan manipulation risk",
    category: "vulnerable",
    difficulty: "advanced",
    tags: ["security", "oracle", "defi", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPair {
    function getReserves() external view returns (uint112, uint112, uint32);
}

contract NaiveLending {
    IPair public pair;
    mapping(address => uint256) public debt;

    constructor(address _pair) {
        pair = IPair(_pair);
    }

    function borrow(uint256 amount) external {
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        // VULNERABLE: spot reserve ratio — manipulable in one block
        uint256 price = (uint256(r1) * 1e18) / uint256(r0);
        uint256 collateralValue = price * amount / 1e18;
        require(collateralValue > 0, "price");
        debt[msg.sender] += amount;
    }
}`,
  },
  {
    id: "reentrancy-erc20",
    name: "ERC20 Reentrancy",
    description: "External call before balance update on token withdrawal pattern",
    category: "vulnerable",
    difficulty: "advanced",
    tags: ["security", "reentrancy", "erc20", "vulnerable"],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract VulnerableStaking {
    IERC20 public token;
    mapping(address => uint256) public staked;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function stake(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "xfer");
        staked[msg.sender] += amount;
    }

    function unstake(uint256 amount) external {
        require(staked[msg.sender] >= amount, "stake");
        // VULNERABLE: state updated after external call
        require(token.transfer(msg.sender, amount), "xfer");
        staked[msg.sender] -= amount;
    }
}`,
  },
];

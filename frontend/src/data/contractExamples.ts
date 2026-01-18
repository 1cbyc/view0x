/**
 * Contract Examples Library
 * A collection of example Solidity contracts for users to learn from and test with
 */

export interface ContractExample {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'erc20' | 'erc721' | 'security' | 'vulnerable' | 'best-practice';
  code: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const contractExamples: ContractExample[] = [
  {
    id: 'simple-storage',
    name: 'Simple Storage',
    description: 'A basic storage contract to get started with Solidity',
    category: 'basic',
    difficulty: 'beginner',
    tags: ['storage', 'basic', 'learning'],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public storedValue;

    function set(uint256 x) public {
        storedValue = x;
    }

    function get() public view returns (uint256) {
        return storedValue;
    }
}`
  },
  {
    id: 'erc20-token',
    name: 'ERC20 Token',
    description: 'A standard ERC20 token implementation',
    category: 'erc20',
    difficulty: 'intermediate',
    tags: ['token', 'erc20', 'standard'],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ERC20Token is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        _totalSupply = initialSupply * 10**decimals;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            _approve(owner, spender, currentAllowance - amount);
        }
    }
}`
  },
  {
    id: 'vulnerable-wallet',
    name: 'Vulnerable Wallet',
    description: 'A wallet contract with reentrancy vulnerability - use this to test security scanning',
    category: 'vulnerable',
    difficulty: 'advanced',
    tags: ['security', 'reentrancy', 'vulnerable', 'example'],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableWallet {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // VULNERABILITY: State update happens after external call
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
}`
  },
  {
    id: 'safe-wallet',
    name: 'Safe Wallet',
    description: 'A secure wallet implementation with proper checks-effects-interactions pattern',
    category: 'best-practice',
    difficulty: 'advanced',
    tags: ['security', 'best-practice', 'reentrancy-protection'],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeWallet {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // SECURE: Update state before external call (Checks-Effects-Interactions pattern)
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}`
  },
  {
    id: 'basic-nft',
    name: 'Basic NFT',
    description: 'A simple ERC721 NFT contract',
    category: 'erc721',
    difficulty: 'intermediate',
    tags: ['nft', 'erc721', 'token'],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract BasicNFT is IERC721 {
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    
    uint256 private _nextTokenId = 1;
    
    function mint(address to) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to]++;
        return tokenId;
    }
    
    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return _balances[owner];
    }
    
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");
        return owner;
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_owners[tokenId] == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");
        
        _owners[tokenId] = to;
        _balances[from]--;
        _balances[to]++;
    }
}`
  }
];

export const getExampleByCategory = (category: ContractExample['category']): ContractExample[] => {
  return contractExamples.filter(example => example.category === category);
};

export const getExampleById = (id: string): ContractExample | undefined => {
  return contractExamples.find(example => example.id === id);
};

export const getExamplesByDifficulty = (difficulty: ContractExample['difficulty']): ContractExample[] => {
  return contractExamples.filter(example => example.difficulty === difficulty);
};

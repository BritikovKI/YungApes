pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Yapes is IERC20, Ownable {

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) public noTaxWhitelist;
    mapping(address => bool) public minters;
    uint256 fee;
    address benefactor;


    string private _name;
    string private _symbol;
    uint256 private _totalSupply;

    /**
     * @dev Emitted when tokens are moved from one account to
     * another and fee `amount` is taken.
     */
    event Fee( uint256 amount);

    modifier onlyMinter() {
        require(minters[msg.sender] || owner() == msg.sender);
        _;
    }

    constructor(address _benefactor) public {
        _name = "Yapes Token";
        _symbol = "YAPES";
        benefactor = _benefactor;
    }

    function changeBenefactor(address _benefactor) public {
        benefactor = _benefactor;
    }

    /**
     * @dev Adds address to the notTaxWhitelist.
     *
     * @param account - address to add
     */
    function whitelist(address account) public onlyOwner {
        noTaxWhitelist[account] = true;
    }


    /**
     * @dev Removes address from the notTaxWhitelist.
     *
     * @param account - address to remove
     */
    function removeFromWhitelist(address account) public onlyOwner {
        noTaxWhitelist[account] = false;
    }



    /**
     * @dev Adds address to the minters.
     *
     * @param account - address to add
     */
    function addMinter(address account) public onlyOwner {
        minters[account] = true;
    }


    /**
     * @dev Removes address from the minters.
     *
     * @param account - address to remove
     */
    function removeMinter(address account) public onlyOwner {
        minters[account] = false;
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * @param to - recipient of transfer
     * @param amount - amount to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * @param from - sender of transfer
     * @param to - recipient of transfer
     * @param amount - amount to transfer
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * @param spender - address which will be spending tokens
     * @param addedValue - increase in value which will be allowed to spend
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, _allowances[owner][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * @param spender - address which will be spending tokens
     * @param subtractedValue - decrease of value which will be allowed to spend
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = _allowances[owner][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
    unchecked {
        _approve(owner, spender, currentAllowance - subtractedValue);
    }

        return true;
    }

    /**
     * @dev Mints `amount` of tokens  to `recipient`.
     *
     * @param account - recipient of mint
     * @param amount - amount to transfer
     */
    function mint(address account, uint256 amount) public onlyMinter {
        _mint(account, amount);
    }

    /**
     * @dev Burns `amount` of tokens from ``recipient`.
     *
     * @param account - recipient of burn
     * @param amount - amount to transfer
     */
    function burn(address account, uint256 amount) public onlyMinter {
        _burn(account, amount);
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * @param spender - address that will be allowed to spend tokens
     * @param amount - amount of allowed tokens to spend
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *  @param account - account to which token is minted
     *  @param amount - amount of minted token
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *  @param account - account from which token is burned
     *  @param amount - amount of burned token
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
    unchecked {
        _balances[account] = accountBalance - amount;
    }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }


    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * @param from - sender of transfer
     * @param to - recipient of transfer
     * @param amount - amount to transfer
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {

        uint256 tax = 0;
        if(!noTaxWhitelist[from]){
            tax = amount * 15 / 100;
        }

        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        require(fromBalance >= amount + tax, "ERC20: unable to pay fee from transfer");
    unchecked {
        _balances[from] = fromBalance - (amount + tax);
    }
        _balances[to] += amount;
        _balances[benefactor] += tax/3;

        emit Transfer(from, to, amount);
        emit Fee(fee);

    }

    /**
 * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * @param owner - address which tokens will be spent
     * @param spender - address which will be spending tokens
     * @param amount - amount of tokens to be spent
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Spend `amount` form the allowance of `owner` toward `spender`.
     *
     * @param owner - owner of the tokens
     * @param spender - spender of the tokens
     * @param amount - amount of the tokens to send
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
        unchecked {
            _approve(owner, spender, currentAllowance - amount);
        }
        }
    }

    /**
 * @dev Returns the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     */
    function decimals() public view returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

}

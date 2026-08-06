// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TransparentDonations — Donaciones transparentes para una ONG (demo)
 * @notice Cualquiera puede donar ETH a una causa. La ONG puede retirar fondos,
 *         pero SOLO explicando en qué los va a usar — esa razón queda grabada
 *         en la blockchain para siempre, junto al monto y la fecha.
 *
 * La idea central que esto demuestra: en una ONG tradicional, tienes que
 * CONFIAR en que te dicen la verdad sobre cómo gastan el dinero. Aquí no
 * hace falta confiar — cualquiera puede verificar matemáticamente que:
 *
 *     totalDonado - totalRetirado == balance actual del contrato
 *
 * Si esa cuenta no cuadra, es imposible (el contrato no lo permite).
 * Y cada retiro queda públicamente asociado a una razón declarada.
 */
contract TransparentDonations {
    /// La wallet de la ONG — se fija UNA sola vez, al desplegar el contrato,
    /// y no se puede cambiar después (immutable = ni siquiera la ONG puede
    /// redirigir los fondos a otra dirección más adelante).
    address public immutable ngo;

    /// Nombre de la causa, solo informativo (ej. "Comedores comunitarios").
    string public causeName;

    struct Donation {
        address donor;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    struct Withdrawal {
        uint256 amount;
        string reason; // obligatorio: en qué se va a usar el dinero
        uint256 timestamp;
    }

    Donation[] private donations;
    Withdrawal[] private withdrawals;

    /// Totales acumulados — se pueden leer gratis (view) en cualquier momento.
    uint256 public totalDonated;
    uint256 public totalWithdrawn;

    event NewDonation(address indexed donor, uint256 amount, string message, uint256 timestamp);
    event FundsWithdrawn(uint256 amount, string reason, uint256 timestamp);

    /// Restringe una función para que SOLO la wallet de la ONG pueda llamarla.
    modifier onlyNGO() {
        require(msg.sender == ngo, "Solo la ONG puede retirar fondos");
        _;
    }

    /// Al desplegar, quien despliega el contrato queda registrado como la ONG.
    constructor(string memory _causeName) {
        ngo = msg.sender;
        causeName = _causeName;
    }

    /**
     * Donar ETH a la causa. "payable" permite que la función reciba ETH
     * junto con la llamada — msg.value es la cantidad enviada.
     */
    function donate(string calldata _message) external payable {
        require(msg.value > 0, "La donacion debe ser mayor a 0");

        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp
        }));

        totalDonated += msg.value;

        emit NewDonation(msg.sender, msg.value, _message, block.timestamp);
    }

    /**
     * La ONG retira fondos — SIEMPRE con una razón obligatoria.
     * No hay forma de retirar "en silencio": la razón y el monto quedan
     * grabados para siempre y son públicos.
     */
    function withdraw(uint256 _amount, string calldata _reason) external onlyNGO {
        require(_amount > 0, "El monto debe ser mayor a 0");
        require(_amount <= address(this).balance, "Fondos insuficientes en el contrato");
        require(bytes(_reason).length > 0, "Debes explicar en que se usaran los fondos");

        totalWithdrawn += _amount;
        withdrawals.push(Withdrawal({
            amount: _amount,
            reason: _reason,
            timestamp: block.timestamp
        }));

        emit FundsWithdrawn(_amount, _reason, block.timestamp);

        // Transferencia real del ETH a la wallet de la ONG.
        (bool success, ) = payable(ngo).call{value: _amount}("");
        require(success, "La transferencia fallo");
    }

    // ---- Lecturas públicas (gratis, sin transacción) ----

    function getDonations() external view returns (Donation[] memory) {
        return donations;
    }

    function getWithdrawals() external view returns (Withdrawal[] memory) {
        return withdrawals;
    }

    function donationCount() external view returns (uint256) {
        return donations.length;
    }

    function withdrawalCount() external view returns (uint256) {
        return withdrawals.length;
    }

    /// El balance real del contrato ahora mismo — debe ser SIEMPRE igual a
    /// totalDonated - totalWithdrawn. Cualquiera puede verificar esta cuenta.
    function currentBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

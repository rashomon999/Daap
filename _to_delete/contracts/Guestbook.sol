// SPDX-License-Identifier: MIT
// ^ Toda fuente Solidity declara su licencia. MIT = código abierto permisivo.

pragma solidity ^0.8.28;
// ^ Versión del compilador. El "^" significa "0.8.28 o superior, pero menor que 0.9".

/**
 * @title Guestbook — Libro de visitas on-chain
 * @notice Cualquier persona puede dejar un mensaje firmado con su dirección.
 *         Los mensajes quedan guardados PARA SIEMPRE en la blockchain.
 *
 * Conceptos que este contrato enseña:
 *  - struct:   una estructura de datos personalizada (como un objeto en JS).
 *  - array:    almacenamiento dinámico en la blockchain (variable de estado).
 *  - event:    "logs" que el frontend puede escuchar para reaccionar en vivo.
 *  - require:  validaciones que revierten la transacción si no se cumplen.
 *  - msg.sender: la dirección de la wallet que llama a la función.
 *  - block.timestamp: la hora (unix) del bloque en que se minó la transacción.
 *  - view:     funciones de solo lectura, que NO cuestan gas al llamarlas.
 */
contract Guestbook {
    // ---- Tipos de datos ----

    /// Cada entrada del libro de visitas.
    struct Entry {
        address author;    // dirección de la wallet que escribió el mensaje
        string message;    // el texto del mensaje
        uint256 timestamp; // cuándo se escribió (segundos unix)
    }

    // ---- Estado (esto vive en la blockchain) ----

    /// Todas las entradas, en orden de llegada.
    Entry[] private entries;

    /// Cuántos mensajes ha dejado cada dirección (mapping = diccionario).
    mapping(address => uint256) public messageCount;

    // ---- Eventos ----

    /// Se emite cada vez que alguien firma el libro.
    /// "indexed" permite filtrar eventos por autor desde el frontend.
    event NewEntry(address indexed author, string message, uint256 timestamp);

    // ---- Funciones ----

    /**
     * Escribir un mensaje en el libro de visitas.
     * Es una transacción: modifica el estado, así que cuesta gas
     * (gas ficticio en la red local / testnet — por eso todo es gratis).
     */
    function signGuestbook(string calldata _message) external {
        // Validaciones: si fallan, la transacción se revierte completa.
        require(bytes(_message).length > 0, "El mensaje no puede estar vacio");
        require(bytes(_message).length <= 280, "Maximo 280 caracteres");

        // Guardar la entrada en el array (esto es lo que cuesta gas).
        entries.push(Entry({
            author: msg.sender,
            message: _message,
            timestamp: block.timestamp
        }));

        // Actualizar el contador del autor.
        messageCount[msg.sender] += 1;

        // Emitir el evento para que cualquier frontend conectado se entere.
        emit NewEntry(msg.sender, _message, block.timestamp);
    }

    /**
     * Leer TODAS las entradas.
     * "view" = solo lectura = GRATIS siempre (no crea transacción).
     */
    function getEntries() external view returns (Entry[] memory) {
        return entries;
    }

    /// Cuántas entradas hay en total.
    function totalEntries() external view returns (uint256) {
        return entries.length;
    }
}

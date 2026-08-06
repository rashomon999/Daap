require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
// ^ Lee el archivo .env (que NUNCA se sube a git) y carga sus variables
//   como si fueran variables de entorno normales (process.env.ALGO).

// --- Solo necesario en este entorno de nube (sin acceso a binaries.soliditylang.org):
// usamos el compilador solc instalado desde npm en vez de descargarlo.
// En tu computador este bloque NO hace falta: Hardhat descarga el compilador solo.
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
const path = require("path");

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.28") {
    const compilerPath = path.join(path.dirname(require.resolve("solc")), "soljson.js");
    return {
      compilerPath,
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: "0.8.28",
    };
  }
  return runSuper(args);
});
// --- Fin del bloque especial ---

// Variables que vienen de tu archivo .env local (nunca de este código, nunca de git).
const { ALCHEMY_SEPOLIA_URL, DEPLOYER_PRIVATE_KEY } = process.env;

/**
 * Configuración de Hardhat.
 *
 * - solidity: la versión del compilador de Solidity que usamos.
 * - networks: las redes donde podemos desplegar el contrato.
 *   - hardhat: red efímera en memoria que Hardhat crea automáticamente para
 *     cada corrida de `npx hardhat test` (o `npx hardhat run` sin --network).
 *     No hace falta declararla aquí, y no queda nada corriendo después.
 *   - sepolia: testnet PÚBLICA de Ethereum — el único destino real de
 *     despliegue de este proyecto. Cualquiera con la dirección del contrato
 *     puede verlo/usarlo. El ETH es de prueba (gratis, de un faucet).
 *
 * A propósito NO hay una red "localhost" (nodo persistente vía
 * `npx hardhat node`) configurada aquí: mezclar despliegues locales con el
 * despliegue público causaba que los dos pisaran el mismo archivo de
 * dirección que usa el frontend. Todo lo que antes se probaba a mano contra
 * un nodo local ahora lo cubren las pruebas automáticas (`npx hardhat test`),
 * que no tocan ningún archivo del frontend ni necesitan MetaMask.
 */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // Solo se activa si .env tiene las dos variables definidas.
    ...(ALCHEMY_SEPOLIA_URL && DEPLOYER_PRIVATE_KEY
      ? {
          sepolia: {
            url: ALCHEMY_SEPOLIA_URL,
            accounts: [DEPLOYER_PRIVATE_KEY],
          },
        }
      : {}),
  },
};

/**
 * Paso 1 de despliegue robusto para redes lentas (ej. Sepolia):
 * Envía la transacción de despliegue y sale INMEDIATAMENTE, sin esperar
 * a que se mine (la dirección del contrato ya es determinística apenas
 * se envía la transacción). Guarda el hash en deploy-pending.json para
 * que scripts/check-deploy.js verifique la confirmación después.
 */
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Red: ${network.name}`);
  console.log("Desplegando con la cuenta:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const Guestbook = await ethers.getContractFactory("Guestbook");
  const guestbook = await Guestbook.deploy(); // envía la tx, no espera confirmación

  const address = await guestbook.getAddress(); // determinística, ya disponible
  const tx = guestbook.deploymentTransaction();

  console.log("📤 Transacción enviada:", tx.hash);
  console.log("📍 Dirección (pendiente de confirmar):", address);

  fs.writeFileSync(
    path.join(__dirname, "deploy-pending.json"),
    JSON.stringify({ address, txHash: tx.hash, network: network.name }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

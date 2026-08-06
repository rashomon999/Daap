/**
 * Paso 2: verifica si la transacción de deploy-send.js ya se minó.
 * Si ya está confirmada, escribe frontend/contract-address.json
 * (lo mismo que hacía el deploy.js original) y borra deploy-pending.json.
 * Si no, simplemente informa que sigue pendiente — se puede correr de nuevo.
 */
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const pendingPath = path.join(__dirname, "deploy-pending.json");
  if (!fs.existsSync(pendingPath)) {
    console.log("No hay ningún despliegue pendiente (deploy-pending.json no existe).");
    return;
  }

  const { address, txHash } = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
  console.log("Verificando tx:", txHash);

  const receipt = await ethers.provider.getTransactionReceipt(txHash);

  if (!receipt) {
    console.log("⏳ Todavía sin minar. Intenta de nuevo en unos segundos.");
    return;
  }

  if (receipt.status === 0) {
    console.log("❌ La transacción se minó pero FALLÓ (revertida).");
    fs.unlinkSync(pendingPath);
    return;
  }

  console.log("✅ Confirmada en el bloque", receipt.blockNumber);
  console.log("✅ Guestbook desplegado en:", address);

  const outPath = path.join(__dirname, "..", "frontend", "contract-address.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ address, network: network.name, chainId: network.config.chainId }, null, 2)
  );
  console.log("📝 Dirección guardada en frontend/contract-address.json");
  console.log(`🔍 Ver: https://sepolia.etherscan.io/address/${address}`);

  fs.unlinkSync(pendingPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

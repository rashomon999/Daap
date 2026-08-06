/**
 * Script de despliegue.
 *
 * Único uso real de este proyecto:
 *   npx hardhat run scripts/deploy.js --network sepolia
 *   (requiere el archivo .env con ALCHEMY_SEPOLIA_URL y DEPLOYER_PRIVATE_KEY,
 *    ver docs/GUIA.md → "Desplegar en Sepolia")
 *
 * Además de imprimir la dirección, la guarda automáticamente en
 * frontend/contract-address.json para que app.js la lea sola —
 * no hay que copiar/pegar nada a mano.
 *
 * ⚠️ A propósito, ese archivo SOLO se actualiza cuando la red es "sepolia".
 * Si corres este script contra otra red (por ejemplo, la efímera "hardhat"
 * que usan las pruebas), el despliegue funciona igual pero el archivo del
 * frontend público NO se toca — así nunca se pisa por accidente la dirección
 * que usan tus compañeros.
 */
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Red: ${network.name}`);
  console.log("Desplegando con la cuenta:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance de esa cuenta:", ethers.formatEther(balance), "ETH");
  if (balance === 0n && network.name !== "hardhat") {
    console.warn(
      "⚠️  Esa cuenta tiene 0 ETH en esta red. Si es Sepolia, pide fondos en un faucet antes de continuar."
    );
  }

  const Guestbook = await ethers.getContractFactory("Guestbook");
  const guestbook = await Guestbook.deploy();
  await guestbook.waitForDeployment();

  const address = await guestbook.getAddress();
  console.log("✅ Guestbook desplegado en:", address);

  // Solo escribimos el archivo que lee el frontend público si esto es
  // realmente un despliegue en Sepolia — cualquier otra red no lo toca.
  if (network.name === "sepolia") {
    const outPath = path.join(__dirname, "..", "frontend", "contract-address.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify({ address, network: network.name }, null, 2)
    );
    console.log("📝 Dirección guardada en frontend/contract-address.json (el frontend la lee sola)");
    console.log(`🔍 Ver el contrato: https://sepolia.etherscan.io/address/${address}`);
  } else {
    console.log(`(Red "${network.name}": no se tocó frontend/contract-address.json — solo Sepolia lo actualiza)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

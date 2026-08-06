/**
 * Despliega el contrato TransparentDonations.
 *
 * Único uso real de este proyecto:
 *   npx hardhat run scripts/deploy-donations.js --network sepolia
 *
 * Guarda la dirección en frontend/donations-address.json (independiente del
 * Guestbook, que usa su propio frontend/contract-address.json) — pero SOLO
 * cuando la red es "sepolia", para no pisar por accidente la dirección
 * pública con la de un despliegue de prueba.
 */
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const CAUSE_NAME = "Comedores Comunitarios Bogotá"; // cámbialo por tu causa ficticia

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Red: ${network.name}`);
  console.log("Desplegando con la cuenta (será la ONG):", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance de esa cuenta:", ethers.formatEther(balance), "ETH");

  const Donations = await ethers.getContractFactory("TransparentDonations");
  const donations = await Donations.deploy(CAUSE_NAME);

  const address = await donations.getAddress();
  const tx = donations.deploymentTransaction();
  console.log("📤 Transacción enviada:", tx.hash);
  console.log("📍 Dirección del contrato:", address);

  // En redes lentas (Sepolia) esto puede tardar; si tu terminal tiene
  // límite de tiempo corto, puedes cortar el proceso después de ver la
  // dirección de arriba — ya es válida — y solo falta esta confirmación
  // para guardar el archivo. Si tu terminal es normal (sin límite), espera.
  await donations.waitForDeployment();
  console.log("✅ Confirmado en la red.");

  if (network.name === "sepolia") {
    const outPath = path.join(__dirname, "..", "frontend", "donations-address.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify({ address, network: network.name, causeName: CAUSE_NAME }, null, 2)
    );
    console.log("📝 Dirección guardada en frontend/donations-address.json");
    console.log(`🔍 Ver: https://sepolia.etherscan.io/address/${address}`);
  } else {
    console.log(`(Red "${network.name}": no se tocó frontend/donations-address.json — solo Sepolia lo actualiza)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

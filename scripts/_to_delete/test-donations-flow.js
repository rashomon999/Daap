const { ethers } = require("hardhat");
async function main() {
  const [ngo, donor1, donor2] = await ethers.getSigners();
  const donations = await ethers.getContractAt("TransparentDonations", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

  await (await donations.connect(donor1).donate("¡Ánimo!", { value: ethers.parseEther("0.5") })).wait();
  await (await donations.connect(donor2).donate("", { value: ethers.parseEther("0.3") })).wait();
  console.log("Total donado:", ethers.formatEther(await donations.totalDonated()), "ETH");
  console.log("Balance:", ethers.formatEther(await donations.currentBalance()), "ETH");

  await (await donations.connect(ngo).withdraw(ethers.parseEther("0.4"), "Compra de 200 almuerzos")).wait();
  console.log("Total retirado:", ethers.formatEther(await donations.totalWithdrawn()), "ETH");
  console.log("Balance tras el retiro:", ethers.formatEther(await donations.currentBalance()), "ETH");

  // Intento no autorizado — debe fallar
  try {
    await donations.connect(donor1).withdraw(ethers.parseEther("0.01"), "intento no autorizado");
    console.log("❌ ERROR: un donante pudo retirar (no debería)");
  } catch (e) {
    console.log("✅ Correcto: un donante NO puede retirar (rechazado por el contrato)");
  }

  const donadas = await donations.getDonations();
  const retiros = await donations.getWithdrawals();
  console.log(`\nHistorial: ${donadas.length} donaciones, ${retiros.length} retiro(s)`);
  console.log("Retiro registrado:", retiros[0].reason, "->", ethers.formatEther(retiros[0].amount), "ETH");

  const cuadra = (await donations.totalDonated()) - (await donations.totalWithdrawn()) === (await donations.currentBalance());
  console.log(cuadra ? "✅ La contabilidad cuadra exactamente" : "❌ ALGO NO CUADRA");
}
main().catch((e) => { console.error(e); process.exit(1); });

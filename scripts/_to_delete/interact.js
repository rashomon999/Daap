// Simula lo que hace el frontend: firmar y leer, contra el nodo local.
const { ethers } = require("hardhat");
async function main() {
  const [a, b] = await ethers.getSigners();
  const gb = await ethers.getContractAt("Guestbook", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  await (await gb.connect(a).signGuestbook("Hola desde la cuenta 0")).wait();
  await (await gb.connect(b).signGuestbook("Hola desde la cuenta 1")).wait();
  const entries = await gb.getEntries();
  console.log("Total:", entries.length);
  for (const e of entries) console.log(`- [${e.author.slice(0,8)}...] "${e.message}" @ ${e.timestamp}`);
}
main().catch(e => { console.error(e); process.exit(1); });

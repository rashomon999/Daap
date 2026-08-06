/**
 * Frontend de la demo "Donaciones Transparentes".
 *
 * Patrón estándar de dapp: ethers.js + MetaMask + un contrato.
 * Lo interesante para la clase: aquí SÍ se mueve valor real
 * (ETH de prueba) y el panel de la ONG solo aparece si la wallet conectada
 * es la que desplegó el contrato — eso también lo decide el contrato, no
 * el frontend (el frontend solo lo oculta visualmente; el contrato es el
 * que de verdad rechazaría un retiro de cualquier otra cuenta).
 */
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

const ABI = [
  "function donate(string _message) external payable",
  "function withdraw(uint256 _amount, string _reason) external",
  "function getDonations() external view returns (tuple(address donor, uint256 amount, string message, uint256 timestamp)[])",
  "function getWithdrawals() external view returns (tuple(uint256 amount, string reason, uint256 timestamp)[])",
  "function totalDonated() external view returns (uint256)",
  "function totalWithdrawn() external view returns (uint256)",
  "function currentBalance() external view returns (uint256)",
  "function ngo() external view returns (address)",
  "function causeName() external view returns (string)",
  "event NewDonation(address indexed donor, uint256 amount, string message, uint256 timestamp)",
  "event FundsWithdrawn(uint256 amount, string reason, uint256 timestamp)",
];

let CONTRACT_ADDRESS = null;
let DEPLOY_NETWORK = null;
let provider, signer, contract, connectedAddress;

const $ = (id) => document.getElementById(id);

// ---- 0. Cargar dirección del contrato ----
async function init() {
  try {
    const res = await fetch("donations-address.json", { cache: "no-store" });
    const data = await res.json();
    CONTRACT_ADDRESS = data.address;
    DEPLOY_NETWORK = data.network;
    if (data.causeName) {
      $("causeSubtitle").textContent = `Causa: "${data.causeName}" — cada donación y cada retiro quedan públicamente registrados en la blockchain.`;
    }
    setStatus("connectStatus", `Contrato en red "${DEPLOY_NETWORK}": ${CONTRACT_ADDRESS}`, "");
  } catch (err) {
    setStatus("connectStatus", "No se encontró donations-address.json — despliega el contrato primero", "err");
  }
}
init();

// ---- 1. Conectar wallet ----
$("connectBtn").addEventListener("click", async () => {
  try {
    if (!window.ethereum) {
      setStatus("connectStatus", "Instala MetaMask primero: https://metamask.io", "err");
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setStatus("connectStatus", "Todavía no se cargó la dirección del contrato", "err");
      return;
    }

    if (DEPLOY_NETWORK === "sepolia") {
      await ensureSepoliaNetwork();
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    $("account").textContent = connectedAddress;
    setStatus("connectStatus", "✅ Wallet conectada", "ok");
    $("donateBtn").disabled = false;

    // Mostrar el panel de la ONG solo si la wallet conectada es la ONG.
    // (Esto es solo cosmético: el contrato mismo rechazaría un withdraw()
    // de cualquier otra cuenta, sin importar lo que muestre esta página.)
    const ngoAddress = await contract.ngo();
    if (connectedAddress.toLowerCase() === ngoAddress.toLowerCase()) {
      $("ngoPanel").classList.remove("hidden");
    } else {
      $("ngoPanel").classList.add("hidden");
    }

    contract.on("NewDonation", () => loadData());
    contract.on("FundsWithdrawn", () => loadData());

    await loadData();
  } catch (err) {
    setStatus("connectStatus", "Error: " + (err.shortMessage || err.message), "err");
  }
});

async function ensureSepoliaNetwork() {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === SEPOLIA_CHAIN_ID_HEX) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
    } else {
      throw switchError;
    }
  }
}

// ---- 2. Donar ----
$("donateBtn").addEventListener("click", async () => {
  const amountStr = $("donateAmount").value.trim();
  const message = $("donateMessage").value.trim();

  if (!amountStr || Number(amountStr) <= 0) {
    setStatus("donateStatus", "Ingresa una cantidad válida en ETH", "err");
    return;
  }

  try {
    $("donateBtn").disabled = true;
    setStatus("donateStatus", "⏳ Confirma en MetaMask...", "");

    const tx = await contract.donate(message, { value: ethers.parseEther(amountStr) });

    setStatus("donateStatus", "⛏️ Transacción enviada, esperando confirmación...", "");
    await tx.wait();

    setStatus("donateStatus", "✅ ¡Gracias por tu donación!", "ok");
    $("donateAmount").value = "";
    $("donateMessage").value = "";
    await loadData();
  } catch (err) {
    setStatus("donateStatus", "Error: " + (err.shortMessage || err.message), "err");
  } finally {
    $("donateBtn").disabled = false;
  }
});

// ---- 3. Retirar (panel de la ONG) ----
$("withdrawBtn").addEventListener("click", async () => {
  const amountStr = $("withdrawAmount").value.trim();
  const reason = $("withdrawReason").value.trim();

  if (!amountStr || Number(amountStr) <= 0) {
    setStatus("withdrawStatus", "Ingresa una cantidad válida en ETH", "err");
    return;
  }
  if (!reason) {
    setStatus("withdrawStatus", "La razón es obligatoria — es lo que hace esto transparente", "err");
    return;
  }

  try {
    $("withdrawBtn").disabled = true;
    setStatus("withdrawStatus", "⏳ Confirma en MetaMask...", "");

    const tx = await contract.withdraw(ethers.parseEther(amountStr), reason);

    setStatus("withdrawStatus", "⛏️ Transacción enviada, esperando confirmación...", "");
    await tx.wait();

    setStatus("withdrawStatus", "✅ Retiro registrado públicamente", "ok");
    $("withdrawAmount").value = "";
    $("withdrawReason").value = "";
    await loadData();
  } catch (err) {
    setStatus("withdrawStatus", "Error: " + (err.shortMessage || err.message), "err");
  } finally {
    $("withdrawBtn").disabled = false;
  }
});

// ---- 4. Cargar y mostrar datos ----
$("refreshBtn").addEventListener("click", loadData);

async function loadData() {
  if (!contract) return;

  const [donated, withdrawn, balance, donationsList, withdrawalsList] = await Promise.all([
    contract.totalDonated(),
    contract.totalWithdrawn(),
    contract.currentBalance(),
    contract.getDonations(),
    contract.getWithdrawals(),
  ]);

  $("totalDonated").textContent = ethers.formatEther(donated);
  $("totalWithdrawn").textContent = ethers.formatEther(withdrawn);
  $("balance").textContent = ethers.formatEther(balance);
  $("donationCount").textContent = donationsList.length;
  $("withdrawalCount").textContent = withdrawalsList.length;

  const donationsEl = $("donationsList");
  donationsEl.innerHTML = donationsList.length
    ? [...donationsList].reverse().map((d) => `
      <div class="entry donation">
        <div class="top"><span class="who">${d.donor}</span><span class="amount">+${ethers.formatEther(d.amount)} ETH</span></div>
        ${d.message ? `<div class="msg">${escapeHtml(d.message)}</div>` : ""}
        <div class="time">${new Date(Number(d.timestamp) * 1000).toLocaleString()}</div>
      </div>`).join("")
    : '<p class="empty">Aún no hay donaciones. ¡Sé el primero!</p>';

  const withdrawalsEl = $("withdrawalsList");
  withdrawalsEl.innerHTML = withdrawalsList.length
    ? [...withdrawalsList].reverse().map((w) => `
      <div class="entry withdrawal">
        <div class="top"><span class="who">Retiro de la ONG</span><span class="amount">−${ethers.formatEther(w.amount)} ETH</span></div>
        <div class="msg">${escapeHtml(w.reason)}</div>
        <div class="time">${new Date(Number(w.timestamp) * 1000).toLocaleString()}</div>
      </div>`).join("")
    : '<p class="empty">Todavía no se ha retirado nada.</p>';
}

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    $("donationsList").classList.toggle("hidden", tab !== "donations");
    $("withdrawalsList").classList.toggle("hidden", tab !== "withdrawals");
  });
});

// ---- Utilidades ----
function setStatus(id, text, kind) {
  const el = $(id);
  el.textContent = text;
  el.className = "status " + (kind || "");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

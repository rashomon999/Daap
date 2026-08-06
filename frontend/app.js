/**
 * Frontend de la dapp Guestbook.
 *
 * Flujo:
 *  1. El usuario conecta su wallet (MetaMask) → obtenemos un "signer".
 *  2. Con el signer + la dirección del contrato + el ABI creamos un objeto
 *     Contract de ethers.js que nos deja llamar sus funciones como si fueran JS.
 *  3. Leer (getEntries) es gratis. Escribir (signGuestbook) abre MetaMask
 *     para firmar una transacción.
 *
 * La dirección del contrato NO está escrita a mano aquí: se lee de
 * contract-address.json, que scripts/deploy.js actualiza solo cada vez
 * que despliegas (local o Sepolia). Así nunca hay que copiar/pegar nada.
 */

// Sepolia = la testnet pública donde vive la versión "para compañeros".
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // 11155111 en hexadecimal
const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"], // RPC público de respaldo (por si el usuario no tiene Alchemy/Infura configurado)
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

let CONTRACT_ADDRESS = null; // se llena en init() desde contract-address.json
let DEPLOY_NETWORK = null;

/**
 * ABI (Application Binary Interface): la "carta de presentación" del contrato.
 * Le dice a ethers.js qué funciones existen y qué parámetros reciben.
 * Este es un ABI "humano" — ethers acepta las firmas tal cual.
 * (La versión completa en JSON está en artifacts/ tras compilar.)
 */
const ABI = [
  "function signGuestbook(string _message) external",
  "function getEntries() external view returns (tuple(address author, string message, uint256 timestamp)[])",
  "function totalEntries() external view returns (uint256)",
  "function messageCount(address) external view returns (uint256)",
  "event NewEntry(address indexed author, string message, uint256 timestamp)",
];

// ---- Estado de la app ----
let provider; // conexión de solo lectura a la blockchain
let signer;   // la wallet del usuario (puede firmar transacciones)
let contract; // el contrato listo para usarse desde JS

// ---- Elementos del DOM ----
const $ = (id) => document.getElementById(id);
const connectBtn = $("connectBtn");
const signBtn = $("signBtn");
const refreshBtn = $("refreshBtn");
const messageInput = $("message");

// Contador de caracteres en vivo
messageInput.addEventListener("input", () => {
  $("charCount").textContent = messageInput.value.length;
});

// ---- 0. Cargar la dirección del contrato (la escribe scripts/deploy.js) ----
async function init() {
  try {
    const res = await fetch("contract-address.json", { cache: "no-store" });
    const data = await res.json();
    CONTRACT_ADDRESS = data.address;
    DEPLOY_NETWORK = data.network;
    setStatus(
      "connectStatus",
      `Contrato en red "${DEPLOY_NETWORK}": ${CONTRACT_ADDRESS}`,
      ""
    );
  } catch (err) {
    setStatus(
      "connectStatus",
      "No se encontró contract-address.json — despliega el contrato primero (ver GUIA.md)",
      "err"
    );
  }
}
init();

// ---- 1. Conectar la wallet ----
connectBtn.addEventListener("click", async () => {
  try {
    // window.ethereum lo inyecta MetaMask en la página.
    if (!window.ethereum) {
      setStatus("connectStatus", "Instala MetaMask primero: https://metamask.io", "err");
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setStatus("connectStatus", "Todavía no se cargó la dirección del contrato", "err");
      return;
    }

    // Si el contrato vive en Sepolia, aseguramos que MetaMask esté en esa red
    // (si no, cualquier lectura/escritura apuntaría a la red equivocada).
    if (DEPLOY_NETWORK === "sepolia") {
      await ensureSepoliaNetwork();
    }

    // BrowserProvider envuelve a MetaMask para usarlo con ethers.js.
    provider = new ethers.BrowserProvider(window.ethereum);

    // Esto abre el popup de MetaMask pidiendo permiso.
    signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Creamos el objeto contrato conectado a la wallet.
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    $("account").textContent = address;
    setStatus("connectStatus", "✅ Wallet conectada", "ok");
    signBtn.disabled = false;

    // Escuchar el evento NewEntry: si ALGUIEN MÁS firma, la lista se actualiza sola.
    contract.on("NewEntry", () => loadEntries());

    await loadEntries();
  } catch (err) {
    setStatus("connectStatus", "Error: " + (err.shortMessage || err.message), "err");
  }
});

/**
 * Le pide a MetaMask cambiarse a Sepolia. Si el usuario no la tiene agregada,
 * se la ofrece agregar automáticamente (con un RPC público de respaldo).
 */
async function ensureSepoliaNetwork() {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === SEPOLIA_CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // Código 4902 = MetaMask no conoce esa red todavía → se la agregamos.
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [SEPOLIA_PARAMS],
      });
    } else {
      throw switchError;
    }
  }
}

// ---- 2. Firmar el libro (transacción de escritura) ----
signBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!message) {
    setStatus("signStatus", "Escribe un mensaje primero", "err");
    return;
  }

  try {
    signBtn.disabled = true;
    setStatus("signStatus", "⏳ Esperando confirmación en MetaMask...", "");

    // Esto abre MetaMask para que el usuario firme y pague el gas (ficticio en local).
    const tx = await contract.signGuestbook(message);

    setStatus("signStatus", "⛏️ Transacción enviada, esperando que se mine...", "");
    await tx.wait(); // espera a que la transacción quede incluida en un bloque

    setStatus("signStatus", "✅ ¡Mensaje guardado en la blockchain!", "ok");
    messageInput.value = "";
    $("charCount").textContent = "0";
    await loadEntries();
  } catch (err) {
    // Si el usuario cancela en MetaMask, o el require() del contrato falla, caemos aquí.
    setStatus("signStatus", "Error: " + (err.shortMessage || err.message), "err");
  } finally {
    signBtn.disabled = false;
  }
});

// ---- 3. Leer las entradas (llamada view = gratis) ----
refreshBtn.addEventListener("click", loadEntries);

async function loadEntries() {
  if (!contract) return;

  const entries = await contract.getEntries();
  $("total").textContent = entries.length;

  const container = $("entries");
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty">Aún no hay entradas. ¡Sé la primera persona en firmar!</p>';
    return;
  }

  // Mostramos las más recientes primero.
  container.innerHTML = [...entries]
    .reverse()
    .map(
      (e) => `
      <div class="entry">
        <div class="author">${e.author}</div>
        <div class="msg">${escapeHtml(e.message)}</div>
        <div class="time">${new Date(Number(e.timestamp) * 1000).toLocaleString()}</div>
      </div>`
    )
    .join("");
}

// ---- Utilidades ----
function setStatus(id, text, kind) {
  const el = $(id);
  el.textContent = text;
  el.className = "status " + (kind || "");
}

// Nunca insertes texto de usuarios directo en el HTML: podría contener <script>.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

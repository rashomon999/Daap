# Guía paso a paso: Donaciones Transparentes (100% gratis)

> **Proyecto:** una dapp — sistema de donaciones para una ONG ficticia donde cada donación y cada retiro quedan públicamente registrados en la blockchain, con una razón obligatoria para cada retiro.
>
> **Costo total: $0.** Todo corre en Sepolia, la testnet pública de Ethereum, con ETH de prueba gratis de un faucet — nunca dinero real.

---

## Parte 0 — Conceptos antes de tocar código

### ¿Qué es una dapp?

Una **dapp** (decentralized application) tiene dos mitades:

1. **El contrato inteligente (backend):** un programa que vive en la blockchain. Una vez desplegado, nadie puede apagarlo ni modificarlo. Se escribe en **Solidity**.
2. **El frontend:** una página web normal (HTML/JS) que habla con ese contrato a través de una wallet como MetaMask.

La diferencia con una app tradicional: no hay servidor tuyo. El "servidor" es la blockchain, y la "base de datos" es el estado del contrato.

### El problema que resuelve esta dapp en particular

Cuando donas a una ONG tradicional, tienes que **confiar** en que usan el dinero como dicen — no hay forma de comprobarlo tú mismo. Con este contrato no hace falta confiar: se puede **verificar matemáticamente** que todo lo donado menos todo lo retirado da exactamente el balance que hay en el contrato, y cada retiro exige una razón que queda grabada para siempre. Es un ejemplo de por qué blockchain resuelve un problema real más allá de "mover dinero entre computadoras": integridad de registros que nadie controla unilateralmente.

### Vocabulario mínimo

| Término | Qué es |
|---|---|
| **Wallet** | Tu identidad: un par de llaves criptográficas. La dirección (`0xabc...`) es pública; la llave privada firma transacciones. |
| **Transacción** | Cualquier acción que *modifica* la blockchain (donar, retirar). Cuesta **gas**. |
| **Gas** | La comisión que se paga por ejecutar código en la blockchain. En una testnet es ETH de prueba → gratis. |
| **Llamada `view`** | Leer datos sin modificar nada. **Siempre gratis**, en cualquier red. |
| **Desplegar (deploy)** | Subir el contrato compilado a la blockchain. Es una transacción especial que le asigna una dirección. |
| **ABI** | La "carta de presentación" del contrato: lista de funciones y sus parámetros, para que JavaScript sepa cómo llamarlas. |
| **Testnet** | Copia de la red real pero con ETH ficticio que pides gratis en un "faucet". Para probar antes de gastar dinero real. |
| **Hardhat** | El entorno de desarrollo: compila Solidity, corre pruebas y despliega. Todo en JavaScript. |
| **ethers.js** | La librería JS para hablar con la blockchain (desde tests, scripts y el frontend). |

### ¿Por qué es gratis aprender esto?

- Las **pruebas automáticas** (`npx hardhat test`) corren en una blockchain efímera en memoria — cero costo, cero configuración.
- Las **testnets** (Sepolia) regalan ETH de prueba en faucets.
- Solo pagarías al desplegar en **mainnet** (la red real), y eso es opcional y no es parte de este proyecto.

---

## Parte 1 — Preparar el entorno

### Requisitos

- **Node.js** v18 o superior (`node --version` para verificar). Descarga: https://nodejs.org
- Un editor de código (VS Code recomendado, con la extensión "Solidity" de Nomic Foundation).

### Crear el proyecto

```bash
mkdir donaciones-dapp && cd donaciones-dapp
npm init -y
npm install --save-dev hardhat@^2.26.0 @nomicfoundation/hardhat-toolbox@^5.0.0 dotenv
```

**¿Qué instalamos?**

- `hardhat`: el entorno de desarrollo.
- `@nomicfoundation/hardhat-toolbox`: paquete todo-en-uno que trae ethers.js, chai (aserciones), mocha (tests) y utilidades de red.
- `dotenv`: para leer tu archivo `.env` con la configuración de Sepolia sin escribir secretos en el código.

Crea las carpetas del proyecto:

```bash
mkdir contracts test scripts frontend
```

- `contracts/` → código Solidity
- `test/` → pruebas en JavaScript
- `scripts/` → script de despliegue
- `frontend/` → la página web

### Configurar Hardhat

```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    // Solo se activa si .env tiene tu URL de RPC y tu llave del deployer.
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
```

No hace falta declarar ninguna red "local" — para eso ya está la red efímera `hardhat` que Hardhat trae integrada, y la usan automáticamente `npx hardhat test` y cualquier `npx hardhat run script.js` sin `--network`.

> **Nota:** el `hardhat.config.js` de este proyecto incluye un bloque extra que carga el compilador desde npm en vez de descargarlo. Solo fue necesario porque el entorno donde se creó este proyecto no tenía acceso a `binaries.soliditylang.org`. Si tu computador sí tiene internet normal, puedes borrar ese bloque — Hardhat descarga el compilador solo.

---

## Parte 2 — El contrato inteligente

Abre `contracts/Donations.sol`. El contrato se llama `TransparentDonations` y tiene un solo trabajo: llevar la cuenta de donaciones y retiros de forma que nadie pueda falsificarla.

### El concepto central

El contrato lleva dos contadores públicos:

```solidity
uint256 public totalDonated;   // suma de todo lo donado, para siempre
uint256 public totalWithdrawn; // suma de todo lo retirado, para siempre
```

Y una regla que es imposible de romper porque la garantiza el propio código, no una promesa:

```
totalDonated - totalWithdrawn == balance real del contrato
```

Cualquiera puede comprobar esa ecuación en Etherscan sin pedirle permiso a nadie.

### Estructura del contrato

```
contract TransparentDonations {
    address public immutable ngo;   ← la wallet de la ONG, fijada al desplegar
    string public causeName;        ← nombre de la causa, informativo

    struct Donation { ... }         ← una donación: quién, cuánto, mensaje, cuándo
    struct Withdrawal { ... }       ← un retiro: cuánto, razón obligatoria, cuándo

    event NewDonation(...);         ← se emite en cada donación
    event FundsWithdrawn(...);      ← se emite en cada retiro

    function donate(...)            ← ESCRIBIR: cualquiera puede donar (payable, cuesta gas)
    function withdraw(...)          ← ESCRIBIR: solo la ONG, con razón obligatoria
    function getDonations(...)      ← LEER: historial completo (view, gratis)
    function getWithdrawals(...)    ← LEER: historial completo (view, gratis)
    function currentBalance(...)    ← LEER: balance real del contrato (view, gratis)
}
```

### Los conceptos clave, uno a uno

**`struct`** — como un objeto de JS, pero con tipos:

```solidity
struct Donation {
    address donor;      // dirección de quien donó
    uint256 amount;      // cuánto ETH (en wei)
    string message;      // mensaje opcional
    uint256 timestamp;    // cuándo (segundos unix)
}
```

**Variables de estado** — todo lo declarado a nivel de contrato (`donations`, `totalDonated`, etc.) se guarda **en la blockchain**. Escribir ahí es lo que cuesta gas.

**`payable`** — marca una función que puede recibir ETH junto con la llamada:

```solidity
function donate(string calldata _message) external payable {
    require(msg.value > 0, "La donacion debe ser mayor a 0");
    ...
}
```

`msg.value` es cuánto ETH te mandaron junto con la transacción.

**`immutable`** — la dirección de la ONG se fija **una sola vez**, en el `constructor`, y ya no se puede cambiar — ni la propia ONG puede redirigir los fondos después:

```solidity
address public immutable ngo;

constructor(string memory _causeName) {
    ngo = msg.sender; // quien despliega el contrato queda registrado como la ONG
    causeName = _causeName;
}
```

**`modifier onlyNGO`** — un "filtro" reusable que rechaza la transacción si quien llama no es la ONG:

```solidity
modifier onlyNGO() {
    require(msg.sender == ngo, "Solo la ONG puede retirar fondos");
    _;
}

function withdraw(uint256 _amount, string calldata _reason) external onlyNGO {
    ...
}
```

Es lo mismo que un `require` al principio de la función, pero declarado una vez y reusable en varias funciones.

**Transferencia real de ETH** — así es como un contrato le manda ETH de verdad a una dirección (el patrón recomendado en Solidity moderno):

```solidity
(bool success, ) = payable(ngo).call{value: _amount}("");
require(success, "La transferencia fallo");
```

**`event` + `emit`** — los eventos son "logs" baratos que quedan registrados en la blockchain. El frontend se suscribe a ellos para actualizarse en tiempo real, y cualquiera puede leerlos después desde Etherscan:

```solidity
event FundsWithdrawn(uint256 amount, string reason, uint256 timestamp);
emit FundsWithdrawn(_amount, _reason, block.timestamp);
```

**`view`** — marca funciones de solo lectura. Llamarlas no crea transacción → gratis siempre.

### Compilar

```bash
npx hardhat compile
```

Esto genera la carpeta `artifacts/` con el **bytecode** (lo que se sube a la blockchain) y el **ABI** (lo que usa JavaScript para llamar al contrato).

---

## Parte 3 — Las pruebas

Antes de desplegar nada, se prueba. En blockchain esto es aún más importante que en web tradicional: **un contrato desplegado no se puede corregir** (en mainnet, un bug puede costar dinero real).

```bash
npx hardhat test
```

Abre `test/Donations.test.js`. Corren en una blockchain efímera en memoria — cada test empieza desde cero, no necesitan ningún nodo corriendo, no cuestan nada.

Puntos clave del archivo:

**El fixture** — despliega el contrato una vez por test, con cuentas de prueba que Hardhat regala automáticamente:

```js
async function deployFixture() {
  const [ngo, donor1, donor2, extraño] = await ethers.getSigners();
  const Donations = await ethers.getContractFactory("TransparentDonations");
  const donations = await Donations.connect(ngo).deploy("Comedores Comunitarios Bogotá");
  return { donations, ngo, donor1, donor2, extraño };
}
```

**Probar que algo funciona:**

```js
await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });
expect(await donations.totalDonated()).to.equal(ethers.parseEther("1.0"));
```

**Probar que algo falla — tan importante como probar que funciona.** Este es el test que demuestra en código la garantía de seguridad central de la dapp:

```js
await expect(
  donations.connect(extraño).withdraw(ethers.parseEther("0.1"), "intento no autorizado")
).to.be.revertedWith("Solo la ONG puede retirar fondos");
```

Resultado esperado: **12 tests en verde** ✔ (despliegue, donaciones, validaciones, y todo el bloque de retiros — incluyendo que un donante NO puede retirar).

---

## Parte 4 — Por qué no hay un paso de "blockchain local" aquí

En muchos tutoriales de dapps, el siguiente paso sería levantar un nodo local (`npx hardhat node`) y desplegar ahí antes de tocar una testnet pública. Este proyecto lo tuvo al principio, y se quitó a propósito — vale la pena explicar por qué, porque es una lección real de por qué duele mezclar entornos.

El problema: el script de despliegue guardaba la dirección del contrato en `frontend/donations-address.json`, sin distinguir de qué red venía el despliegue. Cada vez que alguien probaba algo contra un nodo local para explorar sin gastar ETH real, ese archivo se sobrescribía con la dirección local — pisando silenciosamente la dirección de Sepolia que el sitio público (Netlify) necesitaba. El síntoma: el sitio en vivo, que la gente ya estaba usando, de repente dejaba de funcionar, sin ningún error visible.

La solución que quedó en el proyecto tiene dos partes:

1. **`npx hardhat test` reemplaza por completo la necesidad de un nodo local.** Las pruebas ya corren en una blockchain efímera en memoria, prueban exactamente el mismo código, y no tocan ningún archivo.
2. **El script de despliegue se niega a escribir el archivo del frontend a menos que la red sea literalmente `"sepolia"`.** Así, aunque alguien intente un despliegue de prueba contra otra red, el sitio público queda protegido.

---

## Parte 5 — El frontend

Está en `frontend/`: un `index.html` con los estilos y un `donaciones.js` con la lógica. Sin frameworks — así se ve claramente qué hace cada pieza.

### Las tres piezas para hablar con un contrato desde el navegador

```js
// 1. La dirección del contrato — se lee sola de donations-address.json
//    (ese archivo lo escribe scripts/deploy-donations.js en cada despliegue
//    a Sepolia, así nunca hay que copiar/pegar una dirección a mano)
const { address: CONTRACT_ADDRESS } = await fetch("donations-address.json").then(r => r.json());

// 2. El ABI: qué funciones tiene el contrato
const ABI = ["function donate(string _message) external payable", ...];

// 3. ethers.js + MetaMask
const provider = new ethers.BrowserProvider(window.ethereum); // MetaMask inyecta window.ethereum
const signer = await provider.getSigner();                    // la wallet del usuario
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

Con eso, llamar al contrato es casi como llamar una función JS:

```js
await contract.currentBalance();                                          // leer: gratis, instantáneo
const tx = await contract.donate("hola", { value: ethers.parseEther("0.01") }); // escribir: abre MetaMask
await tx.wait();                                                          // esperar a que se mine
```

### Instalar MetaMask

1. Instala la extensión: https://metamask.io (gratis).
2. No hace falta agregar ninguna red a mano — la propia página, al conectar la wallet, detecta si no estás en Sepolia y te ofrece cambiarte (o agregarla) automáticamente (ver `ensureSepoliaNetwork()` en `donaciones.js`).

### Servir la página (para probarla en tu compu antes de publicarla)

Los navegadores bloquean `window.ethereum` en archivos abiertos con doble clic, así que sírvela con un servidor local:

```bash
cd frontend
npx serve .        # o: python3 -m http.server 8000
```

Esto **no despliega nada nuevo** ni levanta una blockchain — solo sirve los archivos estáticos que ya apuntan al contrato real en Sepolia. Abre la URL que te indique (ej. `http://localhost:3000`), conecta la wallet, dona con ETH de prueba de Sepolia. 🎉

### El panel de la ONG

Si la wallet conectada es la misma que desplegó el contrato, aparece un panel extra para retirar fondos con una razón obligatoria:

```js
const ngoAddress = await contract.ngo();
if (connectedAddress.toLowerCase() === ngoAddress.toLowerCase()) {
  $("ngoPanel").classList.remove("hidden");
}
```

Esto es **solo cosmético** — el contrato mismo rechazaría un `withdraw()` de cualquier otra cuenta sin importar lo que muestre la página. La seguridad real vive en el contrato, no en el frontend.

### Detalle de seguridad incluido

En `donaciones.js` hay una función `escapeHtml()`: **nunca** insertes texto escrito por usuarios directamente en el HTML, porque alguien podría donar con un mensaje `<script>...</script>` y ejecutar código en el navegador de los demás visitantes (ataque XSS). Esto aplica a cualquier app web, no solo dapps.

---

## Parte 6 — Cómo encaja todo (el mapa completo)

```
┌─────────────────────┐        ┌──────────────────────┐
│  frontend (HTML/JS) │        │   Sepolia (testnet)  │
│                     │        │                      │
│  ethers.js          │  RPC   │                      │
│  ┌───────────────┐  │ ─────► │  ┌────────────────┐  │
│  │   MetaMask    │  │ firma  │  │ Donations.sol  │  │
│  │ (tu wallet)   │  │  tx    │  │ (desplegado)   │  │
│  └───────────────┘  │        │  └────────────────┘  │
└─────────────────────┘        └──────────────────────┘

Donar/retirar: frontend → MetaMask firma → transacción → se mina → estado cambia
Leer:          frontend → llamada view → respuesta inmediata (sin firma, sin gas)
Eventos:       contrato emite NewDonation/FundsWithdrawn → frontend se actualiza solo
```

---

## Parte 7 — Publicar para que otros accedan (todo gratis)

### 7.1 — Crear una wallet dedicada SOLO para desplegar

**Nunca reutilices tu wallet principal para esto.** Aunque el ETH de prueba no vale dinero real, es buena práctica separar siempre "cuenta que despliega contratos" de "cuenta con fondos".

1. Abre MetaMask → el círculo de cuenta (arriba a la derecha) → **"Agregar cuenta o wallet"** → "Agregar una cuenta nueva".
2. Ponle un nombre claro, ej. `deployer-testnet`.
3. Copia su dirección (`0x...`) — la necesitas para el faucet en el siguiente paso.

### 7.2 — Conseguir ETH de prueba (faucet)

1. Ve a https://cloud.google.com/application/web3/faucet/ethereum/sepolia
2. Pega la dirección de tu cuenta `deployer-testnet` y pide los fondos.
3. Espera uno o dos minutos y verifica en MetaMask (cambia la red a Sepolia) que llegó el ETH de prueba.

> Ese faucet regala una vez por cuenta/dispositivo cada 24 horas. Si necesitas más antes de eso, alternativas: https://sepoliafaucet.com o el faucet de Alchemy en su dashboard.

### 7.3 — Obtener tu URL de RPC en Alchemy

1. Entra a tu app en https://dashboard.alchemy.com
2. Confirma que la red configurada sea **Ethereum → Sepolia**.
3. Click en **"API Key"** o **"View Key"** → copia la URL HTTPS. Se ve así:
   ```
   https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
   ```

### 7.4 — Configurar el proyecto localmente (en TU computador)

```bash
cd donaciones-dapp
cp .env.example .env
```

> ⚠️ Este paso es solo la **primera vez**. Una vez que tu `.env` ya tiene tu URL y tu llave, no lo vuelvas a correr — `cp` sobrescribe el archivo destino, así que repetirlo borraría lo que ya configuraste.

Abre `.env` con tu editor y rellena las dos líneas:

```
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
DEPLOYER_PRIVATE_KEY=la_llave_privada_de_deployer-testnet
```

Para obtener la llave privada: MetaMask → selecciona la cuenta `deployer-testnet` → los 3 puntos → **"Detalles de la cuenta"** → **"Mostrar clave privada"** → tu contraseña de MetaMask.

> ⚠️ **Reglas de oro con `.env`:**
> - Nunca lo subas a git (ya está en `.gitignore`, pero verifícalo con `git status` antes de un `git add .`).
> - Nunca pegues su contenido en un chat, ticket, correo o mensaje.
> - Es solo para tu cuenta `deployer-testnet` — si por error se filtrara, lo peor que pasa es que alguien gaste tu ETH de prueba (sin valor real). Por eso NUNCA la reutilices en una cuenta con fondos reales.

```bash
npm install
```

### 7.5 — Desplegar en Sepolia

```bash
npx hardhat run scripts/deploy-donations.js --network sepolia
```

Verás algo como:

```
Red: sepolia
Desplegando con la cuenta (será la ONG): 0xTU_DEPLOYER...
Balance de esa cuenta: 0.05 ETH
📤 Transacción enviada: 0x...
📍 Dirección del contrato: 0x...
✅ Confirmado en la red.
📝 Dirección guardada en frontend/donations-address.json
🔍 Ver: https://sepolia.etherscan.io/address/0x...
```

Abre ese link de Etherscan: ahí está tu contrato, público, verificable por cualquiera. `donations-address.json` en `frontend/` ya quedó actualizado automáticamente — no hay que tocar `donaciones.js`.

### 7.6 — Publicar el frontend con Netlify Drop

Netlify Drop te da una URL pública en segundos, sin crear cuenta ni usar la terminal:

1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `frontend/` completa (con `index.html`, `donaciones.js`, `donations-address.json`) a la zona de "arrastra y suelta".
3. En unos segundos te da una URL tipo `https://algo-al-azar.netlify.app` — **esa es la URL que compartes.**

> Netlify asigna un nombre aleatorio. Si quieres uno más memorable, o que el sitio no expire, dale clic a **"Claim this site"** (gratis, sin tarjeta) — así queda permanente y puedes actualizarlo después desde la pestaña "Deploys" de ese mismo sitio, arrastrando la carpeta de nuevo, sin crear un link distinto cada vez.

### 7.7 — Lo que otros necesitan hacer

Para que cualquiera use la dapp necesita:

1. Instalar MetaMask (gratis): https://metamask.io
2. Tener algo de ETH de prueba de Sepolia en SU wallet (piden el suyo propio en el mismo faucet) — solo para donar o interactuar. Leer los totales no necesita fondos.
3. Abrir la URL de Netlify y darle clic a "Conectar wallet". La app detecta si MetaMask no está en Sepolia y le ofrece cambiar de red automáticamente.

### 7.8 — Volver a desplegar más adelante

Si cambias el contrato y quieres redesplegar:

```bash
npx hardhat run scripts/deploy-donations.js --network sepolia   # nueva dirección, se guarda sola
```

Luego vuelve a arrastrar la carpeta `frontend/` al mismo sitio de Netlify ya reclamado (pestaña "Deploys"), o a un drop nuevo si aún no lo reclamaste.

---

## Parte 8 — Siguientes pasos (todos gratis)

### 1. Ideas para extender la dapp

- **Meta de recaudación:** agregar `uint256 public goal` y mostrar una barra de progreso en el frontend.
- **Varias causas en un solo contrato:** en vez de una ONG fija, una lista de causas, cada una con su propia wallet y sus propios totales.
- **Retiros con múltiples firmas:** que un retiro necesite la aprobación de 2 de 3 personas (patrón "multisig") en vez de una sola wallet — más realista para una ONG de verdad.
- **Frontend con framework:** migra a React + wagmi/viem, el stack más usado en producción.

### 2. Puntos de discusión para la clase

El contrato garantiza que la *contabilidad* no se puede falsificar, pero la *razón* del retiro ("Compra de 200 almuerzos") sigue siendo un texto que la ONG declara — la blockchain no verifica que eso sea cierto en el mundo real. Es un buen momento para hablar de qué problemas SÍ resuelve blockchain (integridad de los registros) y cuáles NO resuelve por sí sola (honestidad de la información que se ingresa).

### 3. Recursos gratuitos recomendados

- **Solidity docs (español disponible):** https://docs.soliditylang.org
- **CryptoZombies:** curso interactivo gratuito de Solidity — https://cryptozombies.io
- **Hardhat docs:** https://hardhat.org/docs
- **ethers.js v6 docs:** https://docs.ethers.org/v6/
- **Speedrun Ethereum:** retos prácticos progresivos — https://speedrunethereum.com

---

## Apéndice — Comandos de referencia rápida

| Comando | Qué hace |
|---|---|
| `npx hardhat compile` | Compila el contrato → `artifacts/` |
| `npx hardhat test` | Corre las 12 pruebas en la red efímera en memoria — gratis, sin wallet, sin tocar el frontend |
| `cd frontend && npx serve .` | Sirve la página web localmente (previsualiza el sitio de Sepolia antes de subirlo) |
| `cp .env.example .env` | Crea tu archivo de configuración para Sepolia (⚠️ solo la primera vez — repetirlo borra tu .env ya configurado) |
| `npx hardhat run scripts/deploy-donations.js --network sepolia` | Despliega (o redespliega) en la testnet pública Sepolia |
| Arrastra `frontend/` a https://app.netlify.com/drop | Publica el sitio en una URL pública gratis |

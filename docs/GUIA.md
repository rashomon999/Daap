# Guía paso a paso: dos dapps con blockchain (100% gratis)

> **Proyecto:** dos aplicaciones descentralizadas (dapps) desplegadas en Sepolia, la testnet pública de Ethereum:
>
> - **💚 Donaciones Transparentes** — sistema de donaciones para una ONG ficticia donde cada donación y cada retiro quedan públicamente registrados. Pensado para mostrar en clase por qué blockchain resuelve un problema real de confianza.

> **Costo total: $0.** Todo corre en Sepolia con ETH de prueba, gratis de un faucet — nunca dinero real.

---

## Parte 0 — Conceptos antes de tocar código

### ¿Qué es una dapp?

Una **dapp** (decentralized application) tiene dos mitades:

1. **El contrato inteligente (backend):** un programa que vive en la blockchain. Una vez desplegado, nadie puede apagarlo ni modificarlo. Se escribe en **Solidity**.
2. **El frontend:** una página web normal (HTML/JS) que habla con ese contrato a través de una wallet como MetaMask.

La diferencia con una app tradicional: no hay servidor tuyo. El "servidor" es la blockchain, y la "base de datos" es el estado del contrato.

### Vocabulario mínimo

| Término | Qué es |
|---|---|
| **Wallet** | Tu identidad: un par de llaves criptográficas. La dirección (`0xabc...`) es pública; la llave privada firma transacciones. |
| **Transacción** | Cualquier acción que *modifica* la blockchain (escribir un mensaje). Cuesta **gas**. |
| **Gas** | La comisión que se paga por ejecutar código en la blockchain. En tu red local es ficticio → gratis. |
| **Llamada `view`** | Leer datos sin modificar nada. **Siempre gratis**, en cualquier red. |
| **Desplegar (deploy)** | Subir el contrato compilado a la blockchain. Es una transacción especial que le asigna una dirección. |
| **ABI** | La "carta de presentación" del contrato: lista de funciones y sus parámetros, para que JavaScript sepa cómo llamarlas. |
| **Testnet** | Copia de la red real pero con ETH ficticio que pides gratis en un "faucet". Para probar antes de gastar dinero real. |
| **Hardhat** | El entorno de desarrollo: compila Solidity, corre una blockchain local y ejecuta tests. Todo en JavaScript. |
| **ethers.js** | La librería JS para hablar con la blockchain (desde tests, scripts y el frontend). |

### ¿Por qué es gratis aprender esto?

- La **red local de Hardhat** corre en tu máquina: 20 cuentas con 10,000 ETH ficticios cada una.
- Las **testnets** (ej. Sepolia) regalan ETH de prueba en faucets.
- Solo pagarías al desplegar en **mainnet** (la red real), y eso es opcional y para el final.

---

## Parte 1 — Preparar el entorno

### Requisitos

- **Node.js** v18 o superior (`node --version` para verificar). Descarga: https://nodejs.org
- Un editor de código (VS Code recomendado, con la extensión "Solidity" de Nomic Foundation).

### Crear el proyecto

```bash
mkdir guestbook-dapp && cd guestbook-dapp
npm init -y
npm install --save-dev hardhat@^2.26.0 @nomicfoundation/hardhat-toolbox@^5.0.0
```

**¿Qué instalamos?**

- `hardhat`: el entorno de desarrollo.
- `@nomicfoundation/hardhat-toolbox`: paquete todo-en-uno que trae ethers.js, chai (aserciones), mocha (tests) y utilidades de red.

Crea las carpetas del proyecto:

```bash
mkdir contracts test scripts frontend
```

- `contracts/` → código Solidity
- `test/` → pruebas en JavaScript
- `scripts/` → scripts de despliegue e interacción
- `frontend/` → la página web

### Configurar Hardhat

Crea `hardhat.config.js` en la raíz (ver el archivo del proyecto). Lo esencial:

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

No hace falta declarar ninguna red "local" — para eso ya está la red efímera `hardhat` que Hardhat trae integrada (la usan automáticamente `npx hardhat test` y cualquier `npx hardhat run script.js` sin `--network`). Ver la **Parte 4** para por qué este proyecto evita a propósito un nodo local persistente.

> **Nota:** el `hardhat.config.js` de este proyecto incluye un bloque extra que carga el compilador desde npm. Solo fue necesario porque el entorno de nube donde se creó no podía descargar el compilador. **En tu computador puedes borrar ese bloque** — Hardhat descarga el compilador automáticamente la primera vez.

---

## Parte 2 — El contrato inteligente

Abre `contracts/Guestbook.sol`. Está comentado línea por línea, pero aquí va el mapa mental:

### Estructura del contrato

```
contract Guestbook {
    struct Entry { ... }        ← el "modelo de datos" de una entrada
    Entry[] private entries;    ← el array donde viven los mensajes (estado)
    mapping(...) messageCount;  ← diccionario: dirección → nº de mensajes
    event NewEntry(...);        ← notificación que el frontend puede escuchar
    function signGuestbook(...) ← ESCRIBIR (transacción, cuesta gas)
    function getEntries(...)    ← LEER (view, gratis)
}
```

### Los conceptos clave, uno a uno

**`struct`** — como un objeto de JS, pero con tipos:

```solidity
struct Entry {
    address author;    // dirección de wallet (tipo nativo de Solidity)
    string message;
    uint256 timestamp; // entero sin signo de 256 bits
}
```

**Variables de estado** — todo lo declarado a nivel de contrato (como `entries`) se guarda **en la blockchain**. Escribir ahí es lo que cuesta gas; por eso los contratos guardan lo mínimo necesario.

**`msg.sender`** — variable global: la dirección de quien llama la función. Es imposible de falsificar (viene de la firma criptográfica de la transacción). Así sabemos quién escribió cada mensaje sin pedir login ni contraseña.

**`require(condición, "mensaje")`** — si la condición es falsa, la transacción entera se **revierte**: es como si nunca hubiera pasado, y el usuario ve el mensaje de error.

```solidity
require(bytes(_message).length > 0, "El mensaje no puede estar vacio");
```

**`event` + `emit`** — los eventos son "logs" baratos que quedan registrados en la blockchain. El frontend se suscribe a ellos para actualizarse en tiempo real cuando alguien más firma.

**`view`** — marca funciones de solo lectura. Llamarlas no crea transacción → gratis siempre.

**`calldata` / `memory`** — indican dónde vive un dato temporalmente. Regla práctica: `calldata` para parámetros de entrada (más barato), `memory` para valores de retorno.

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

Abre `test/Guestbook.test.js`. Puntos clave:

**El fixture** — despliega el contrato en una blockchain *en memoria* y guarda una "foto" del estado. Cada test parte de esa foto limpia:

```js
async function deployFixture() {
  const [owner, visitor1, visitor2] = await ethers.getSigners(); // cuentas de prueba
  const Guestbook = await ethers.getContractFactory("Guestbook");
  const guestbook = await Guestbook.deploy();
  return { guestbook, owner, visitor1, visitor2 };
}
```

**Firmar como distintas cuentas** — `.connect(visitor1)` hace que la siguiente llamada la firme esa wallet:

```js
await guestbook.connect(visitor1).signGuestbook("Hola blockchain!");
```

**Probar que algo falla** — tan importante como probar que funciona:

```js
await expect(guestbook.signGuestbook("")).to.be.revertedWith("El mensaje no puede estar vacio");
```

Resultado esperado: **7 tests en verde** ✔ (despliegue, escritura, orden, contador por autor, evento, y los dos rechazos).

---

## Parte 4 — Por qué no hay un paso de "blockchain local" aquí

En muchos tutoriales de dapps, el siguiente paso sería levantar un nodo local (`npx hardhat node`) y desplegar ahí antes de tocar una testnet pública. Este proyecto lo tuvo al principio, y lo quitamos a propósito — vale la pena explicar por qué, porque es una lección real de por qué duele mezclar entornos.

El problema: `scripts/deploy.js` guardaba la dirección del contrato en `frontend/contract-address.json`, y esa función no distinguía de qué red venía el despliegue. Cada vez que alguien probaba algo contra el nodo local para explorar sin gastar ETH real, ese archivo se sobrescribía con la dirección local — pisando silenciosamente la dirección de Sepolia que el sitio público (Netlify) necesitaba. El síntoma: el sitio en vivo, que tus compañeros ya estaban usando, de repente decía `"network": "localhost"` y dejaba de funcionar para ellos, sin ningún error visible.

La solución que quedó en el proyecto tiene dos partes:

1. **`npx hardhat test` reemplaza por completo la necesidad de un nodo local.** Las pruebas ya corren en una blockchain efímera en memoria (la incluida por defecto en Hardhat), prueban exactamente el mismo código, y no tocan ningún archivo — es estrictamente más seguro y más rápido que un nodo persistente.
2. **Los scripts de despliegue ahora se niegan a escribir el archivo del frontend a menos que la red sea literalmente `"sepolia"`.** Así, aunque alguien vuelva a intentar un despliegue de prueba contra otra red, el sitio público queda protegido — el peor caso es que el script no actualice nada, nunca que lo rompa.

Si en algún momento quieres explorar interactivamente contra una red local (por ejemplo para probar muchas transacciones sin límite de faucet), puedes volver a levantar `npx hardhat node` en una terminal y correr `npx hardhat run scripts/deploy.js --network localhost` — funciona igual que antes, solo que ahora **no tocará** `frontend/contract-address.json`, así que no hay forma de que rompa el sitio público por accidente.

---

## Parte 5 — El frontend

Está en `frontend/`: un `index.html` con los estilos y un `app.js` con la lógica. Sin frameworks — así se ve claramente qué hace cada pieza.

> 📌 Nota de la Parte 9: una vez que agregamos la segunda dapp (Donaciones), decidimos que fuera la portada del sitio — por eso hoy el archivo del Guestbook se llama `guestbook.html`, no `index.html`. Todo lo que se explica aquí abajo sigue aplicando igual, solo cambia el nombre del archivo.

### Las tres piezas para hablar con un contrato desde el navegador

```js
// 1. La dirección del contrato — se lee sola de contract-address.json
//    (ese archivo lo escribe scripts/deploy.js en cada despliegue, así
//    nunca hay que copiar/pegar una dirección a mano)
const { address: CONTRACT_ADDRESS } = await fetch("contract-address.json").then(r => r.json());

// 2. El ABI: qué funciones tiene el contrato
const ABI = ["function signGuestbook(string _message) external", ...];

// 3. ethers.js + MetaMask
const provider = new ethers.BrowserProvider(window.ethereum); // MetaMask inyecta window.ethereum
const signer = await provider.getSigner();                    // la wallet del usuario
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

Con eso, llamar al contrato es casi como llamar una función JS:

```js
await contract.getEntries();              // leer: gratis, instantáneo
const tx = await contract.signGuestbook("hola"); // escribir: abre MetaMask
await tx.wait();                          // esperar a que se mine
```

### Instalar MetaMask

1. Instala la extensión: https://metamask.io (gratis).
2. No hace falta agregar ninguna red a mano para Sepolia — la propia página, al conectar la wallet, detecta si no estás en Sepolia y te ofrece cambiarte (o agregarla) automáticamente (ver `ensureSepoliaNetwork()` en `app.js` / `donaciones.js`).

### Servir la página (para probarla en tu compu antes de publicarla)

Los navegadores bloquean `window.ethereum` en archivos abiertos con doble clic, así que sírvela con un servidor local:

```bash
cd frontend
npx serve .        # o: python3 -m http.server 8000
```

Esto **no despliega nada nuevo** ni levanta una blockchain — solo sirve los archivos estáticos que ya apuntan al contrato real en Sepolia. Abre la URL que te indique (ej. `http://localhost:3000`), conecta la wallet, escribe un mensaje y firma con ETH de prueba de Sepolia. 🎉

### Detalle de seguridad incluido

En `app.js` hay una función `escapeHtml()`: **nunca** insertes texto escrito por usuarios directamente en el HTML, porque alguien podría firmar el libro con `<script>...</script>` y ejecutar código en el navegador de los demás visitantes (ataque XSS). Esto aplica a cualquier app web, no solo dapps.

---

## Parte 6 — Cómo encaja todo (el mapa completo)

```
┌─────────────────────┐        ┌──────────────────────┐
│  frontend (HTML/JS) │        │ blockchain local     │
│                     │        │ (npx hardhat node)   │
│  ethers.js          │  RPC   │                      │
│  ┌───────────────┐  │ ─────► │  ┌────────────────┐  │
│  │   MetaMask    │  │ firma  │  │ Guestbook.sol  │  │
│  │ (tu wallet)   │  │  tx    │  │ (desplegado en │  │
│  └───────────────┘  │        │  │  0x5FbD...)    │  │
└─────────────────────┘        │  └────────────────┘  │
                               └──────────────────────┘

Escribir: frontend → MetaMask firma → transacción → se mina → estado cambia
Leer:     frontend → llamada view → respuesta inmediata (sin firma, sin gas)
Eventos:  contrato emite NewEntry → frontend suscrito se actualiza solo
```

---

## Parte 7 — Publicar para que tus compañeros accedan (todo gratis)

Esta parte cubre exactamente lo que necesitas para un trabajo en equipo: el contrato en una red **pública** (Sepolia) y la página web en una **URL pública** (Netlify Drop), sin gastar nada.

### 7.1 — Crear una wallet dedicada SOLO para desplegar

**Nunca reutilices tu wallet principal para esto.** Aunque el ETH de prueba no vale dinero real, es buena práctica separar siempre "cuenta que despliega contratos" de "cuenta con fondos".

1. Abre MetaMask → el círculo de cuenta (arriba a la derecha) → **"Agregar cuenta o wallet"** → "Agregar una cuenta nueva".
2. Ponle un nombre claro, ej. `deployer-testnet`.
3. Copia su dirección (`0x...`) — la necesitas para el faucet en el siguiente paso.

### 7.2 — Conseguir ETH de prueba (faucet)

1. Ve a https://cloud.google.com/application/web3/faucet/ethereum/sepolia (ya tienes esa página abierta).
2. Pega la dirección de tu cuenta `deployer-testnet` y pide los fondos.
3. Espera uno o dos minutos y verifica en MetaMask (cambia la red a Sepolia, ver más abajo) que llegó el ETH de prueba.

> Si ese faucet te pide una cuenta/reputación mínima y no te deja, alternativas: https://sepoliafaucet.com o el faucet de Alchemy en su dashboard.

### 7.3 — Obtener tu URL de RPC en Alchemy

1. Entra a tu app en https://dashboard.alchemy.com/apps/ohize6kah769m3vj (la que ya creaste).
2. Confirma que la red configurada sea **Ethereum → Sepolia** (si tu app quedó en otra red, crea una app nueva y elige Sepolia).
3. Click en **"API Key"** o **"View Key"** → copia la URL HTTPS. Se ve así:
   ```
   https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
   ```

### 7.4 — Configurar el proyecto localmente (en TU computador)

Este paso es importante hacerlo en tu máquina, no en un chat, porque vas a escribir una llave privada. El proyecto ya está listo para esto — solo falta tu archivo `.env`.

```bash
cd guestbook-dapp
cp .env.example .env
```

> ⚠️ Este paso es solo la **primera vez**. Una vez que tu `.env` ya tiene tu URL y tu llave, no lo vuelvas a correr — `cp` sobrescribe el archivo destino, así que repetirlo borraría lo que ya configuraste. El mismo `.env` sirve para desplegar el Guestbook, Donaciones, o cualquier otro contrato que agregues después.

Abre `.env` con tu editor y rellena las dos líneas:

```
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
DEPLOYER_PRIVATE_KEY=la_llave_privada_de_deployer-testnet
```

Para obtener la llave privada: MetaMask → selecciona la cuenta `deployer-testnet` → los 3 puntos → **"Detalles de la cuenta"** → **"Mostrar clave privada"** → tu contraseña de MetaMask.

> ⚠️ **Reglas de oro con `.env`:**
> - Nunca lo subas a git (ya está en `.gitignore`, pero verifícalo con `git status` antes de un `git add .`).
> - Nunca pegues su contenido en un chat, ticket, correo o mensaje a un compañero.
> - Es solo para tu cuenta `deployer-testnet` — si por error se filtrara, lo peor que pasa es que alguien gaste tu ETH de prueba (sin valor real). Por eso NUNCA la reutilices en una cuenta con fondos reales.

Instala la dependencia que falta (dotenv, para leer el `.env`):

```bash
npm install
```

### 7.5 — Desplegar en Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Verás algo como:

```
Red: sepolia
Desplegando con la cuenta: 0xTU_DEPLOYER...
Balance de esa cuenta: 0.05 ETH
✅ Guestbook desplegado en: 0xABC123...
📝 Dirección guardada en frontend/contract-address.json
🔍 Ver el contrato: https://sepolia.etherscan.io/address/0xABC123...
```

Abre ese link de Etherscan: ahí está tu contrato, público, verificable por cualquiera. `contract-address.json` en `frontend/` ya quedó actualizado automáticamente — no hay que tocar `app.js`.

### 7.6 — Publicar el frontend con Netlify Drop

Netlify Drop te da una URL pública en segundos, sin crear cuenta ni usar la terminal:

1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `frontend/` completa — hoy incluye `index.html` (Donaciones, la portada), `guestbook.html`, `donaciones.html`, `app.js`, `donaciones.js`, `contract-address.json` y `donations-address.json` — a la zona de "arrastra y suelta".
3. En unos segundos te da una URL tipo `https://algo-al-azar.netlify.app` — **esa es la URL que compartes con tus compañeros.**

> Si ya tienes un sitio de Netlify reclamado de un despliegue anterior, no hace falta un drop nuevo: entra a ese sitio en app.netlify.com → pestaña "Deploys" → arrastra la carpeta ahí para actualizarlo, misma URL de siempre.

> Netlify asigna un nombre aleatorio. Si quieres uno más memorable (ej. `guestbook-equipo.netlify.app`), puedes crear una cuenta gratis después y renombrar el sitio desde "Site settings" — no es obligatorio para que funcione.

### 7.7 — Lo que tus compañeros necesitan hacer

Para que cualquiera use la dapp necesita, igual que tú:

1. Instalar MetaMask (gratis): https://metamask.io
2. Tener algo de ETH de prueba de Sepolia en SU wallet (piden el suyo propio en el mismo faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia) — solo para pagar el gas ficticio al firmar un mensaje. Leer el libro de visitas no necesita fondos.
3. Abrir tu URL de Netlify y click en "Conectar wallet". La app detecta si MetaMask no está en Sepolia y le ofrece cambiar de red automáticamente (o agregarla si nunca la ha usado).

Compárteles ese mini-instructivo junto con el link — así no tienen que leer toda esta guía.

### 7.8 — Volver a desplegar más adelante

Si cambias el contrato y quieres redesplegar:

```bash
npx hardhat run scripts/deploy.js --network sepolia   # nueva dirección, se guarda sola
```

Luego vuelve a arrastrar la carpeta `frontend/` a https://app.netlify.com/drop (si ya reclamaste el sitio con una cuenta, puedes conectarlo a un repo de git para que se actualice solo en cada cambio — opcional).

## Parte 8 — Siguientes pasos (todos gratis)

### 1. Ideas para extender el Guestbook

- **Paginación:** `getEntries()` devuelve todo; con miles de entradas sería carísimo. Agrega `getEntries(uint offset, uint limit)`.
- **Borrar tu propio mensaje:** agrega una función que verifique `msg.sender == entries[i].author`.
- **Propinas:** que se pueda firmar enviando ETH (`payable`) y el dueño del contrato pueda retirarlo (aprenderás `modifier onlyOwner`).
- **Frontend con framework:** migra a React + wagmi/viem, el stack más usado en producción.

### 2. Recursos gratuitos recomendados

- **Solidity docs (español disponible):** https://docs.soliditylang.org
- **CryptoZombies:** curso interactivo gratuito de Solidity — https://cryptozombies.io
- **Hardhat docs:** https://hardhat.org/docs
- **ethers.js v6 docs:** https://docs.ethers.org/v6/
- **Speedrun Ethereum:** retos prácticos progresivos — https://speedrunethereum.com

---

## Parte 9 — Segunda dapp: Donaciones Transparentes

Esta es una demo pensada para mostrar en clase **por qué** existe blockchain, más allá de "mover dinero entre computadoras". El problema real que resuelve: cuando donas a una ONG tradicional, tienes que **confiar** en que usan el dinero como dicen. Con este contrato, no hace falta confiar — se puede **verificar matemáticamente**.

### El concepto central

El contrato `contracts/Donations.sol` (`TransparentDonations`) lleva dos contadores públicos:

```solidity
uint256 public totalDonated;   // suma de todo lo donado, para siempre
uint256 public totalWithdrawn; // suma de todo lo retirado, para siempre
```

Y una regla que es imposible de romper porque la garantiza el propio código, no una promesa:

```
totalDonated - totalWithdrawn == balance real del contrato
```

Cualquiera puede comprobar esa ecuación en Etherscan sin pedirle permiso a nadie. Y cada retiro (`withdraw`) exige una razón en texto (`_reason`) que queda grabada junto al monto y la fecha — la ONG no puede "sacar plata en silencio".

### Conceptos nuevos que introduce (comparado con el Guestbook)

- **`payable`**: marca una función que puede recibir ETH junto con la llamada. `msg.value` es cuánto te mandaron.
- **`immutable`**: la dirección de la ONG (`ngo`) se fija una sola vez en el `constructor` y ya no se puede cambiar — ni la propia ONG puede redirigir los fondos después.
- **`modifier onlyNGO`**: un "filtro" reusable que rechaza la transacción si quien llama no es la ONG. Lo mismo que `require`, pero declarado una vez y aplicado a varias funciones con `onlyNGO` en la firma.
- **Transferencia real de ETH**: `payable(ngo).call{value: _amount}("")` — así es como un contrato le manda ETH de verdad a una dirección (el patrón recomendado en Solidity moderno, más seguro que `.transfer()`).

### Probarlo

```bash
npx hardhat test
```

Fíjate especialmente en el test **"alguien que NO es la ONG no puede retirar"** — ese es el que demuestra en código la garantía de seguridad que estás explicando en la presentación.

### Desplegarlo para la clase (Sepolia + Netlify)

Exactamente el mismo proceso que ya hiciste con el Guestbook en la **Parte 7** — mismo `.env`, mismo faucet, mismo Netlify Drop. Solo cambia el script:

```bash
npx hardhat run scripts/deploy-donations.js --network sepolia
```

Esto guarda la dirección en `frontend/donations-address.json` (el Guestbook usa su propio `contract-address.json`, así que no se pisan entre sí). Luego arrastra la carpeta `frontend/` completa a Netlify Drop otra vez (o al mismo sitio ya reclamado, ver la nota de la Parte 7.6) — ya incluye las tres páginas: `index.html` (Donaciones, portada), `guestbook.html` y `donaciones.html`, todas enlazadas entre sí.

Antes de la clase, prueba tú mismo el flujo con ETH de prueba: dona una cantidad pequeña desde una cuenta, y luego —conectando la wallet de la ONG (la misma que usaste para desplegar)— retira parte con una razón. Así tienes datos reales para mostrar en vivo, no una pantalla vacía.

### Ideas para llevarlo más lejos

- **Meta de recaudación:** agregar `uint256 public goal` y mostrar una barra de progreso en el frontend.
- **Varias causas en un solo contrato:** en vez de una ONG fija, una lista de causas, cada una con su propia wallet y sus propios totales.
- **Retiros con múltiples firmas:** que un retiro necesite la aprobación de 2 de 3 personas (patrón "multisig") en vez de una sola wallet — más realista para una ONG de verdad.
- **Puntos de discusión para la clase:** el contrato garantiza que la *contabilidad* no se puede falsificar, pero la *razón* del retiro ("Compra de 200 almuerzos") sigue siendo un texto que la ONG declara — la blockchain no verifica que eso sea cierto en el mundo real. Es un buen momento para hablar de qué problemas SÍ resuelve blockchain (integridad de los registros) y cuáles NO resuelve por sí sola (honestidad de la información que se ingresa).

---

## Apéndice — Comandos de referencia rápida

| Comando | Qué hace |
|---|---|
| `npx hardhat compile` | Compila los contratos → `artifacts/` |
| `npx hardhat test` | Corre las 19 pruebas en la red efímera en memoria — gratis, sin wallet, sin tocar el frontend |
| `cd frontend && npx serve .` | Sirve la página web localmente (previsualiza el sitio de Sepolia antes de subirlo) |
| `cp .env.example .env` | Crea tu archivo de configuración para Sepolia (⚠️ solo la primera vez — repetirlo borra tu .env ya configurado) |
| `npx hardhat run scripts/deploy.js --network sepolia` | Despliega el Guestbook en la testnet pública Sepolia |
| `npx hardhat run scripts/deploy-donations.js --network sepolia` | Despliega Donaciones en la testnet pública Sepolia |
| Arrastra `frontend/` a https://app.netlify.com/drop | Publica ambas páginas en una URL pública gratis |

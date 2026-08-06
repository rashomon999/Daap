# 🔗 Dos dapps de práctica

Dos contratos + frontends, 100% gratis, construidos para aprender y para mostrar en clase:

1. **💚 Donaciones Transparentes** (portada del sitio) — sistema de donaciones para una ONG ficticia donde cada donación Y cada retiro quedan públicamente registrados con una razón obligatoria. Pensado para explicar por qué blockchain resuelve un problema real de confianza (no solo "mover dinero").
2. **📖 Guestbook** (página secundaria, enlazada desde la portada) — libro de visitas on-chain. La primera dapp que construimos, más simple.

**👉 La guía completa paso a paso está en [`docs/GUIA.md`](docs/GUIA.md).**

## Verificar el código (gratis, sin red, sin wallet)

```bash
npm install                          # instalar dependencias
npx hardhat test                     # correr las 19 pruebas (7 guestbook + 12 donaciones)
```

Estas pruebas corren en una blockchain efímera en memoria que Hardhat crea y destruye solo — no hay nodo que levantar, no tocan ningún archivo del frontend, no necesitan MetaMask. Es la forma de confirmar que el contrato funciona antes de gastar cualquier ETH real en Sepolia.

> Este proyecto se simplificó a propósito para no tener un flujo de "blockchain local" aparte: mezclar despliegues de prueba con el despliegue público causaba que se pisara el archivo de dirección que usa el sitio real. Todo lo que antes se probaba a mano contra un nodo local, ahora lo cubren estas pruebas automáticas.

## Publicar para el equipo/clase (Sepolia + Netlify, también gratis)

```bash
# Solo la PRIMERA vez (si ya tienes .env con tus valores, NO vuelvas a
# correr esto — cp sobrescribe el archivo y borrarías tu URL y tu llave):
cp .env.example .env       # y rellena ALCHEMY_SEPOLIA_URL + DEPLOYER_PRIVATE_KEY

npx hardhat run scripts/deploy.js --network sepolia             # Guestbook
npx hardhat run scripts/deploy-donations.js --network sepolia   # Donaciones
# arrastra la carpeta frontend/ a https://app.netlify.com/drop
```

El mismo `.env` sirve para desplegar cualquier cantidad de contratos — una vez configurado, no hay que tocarlo de nuevo salvo que cambies de cuenta o de proveedor RPC.

Detalles completos, con capturas de dónde sacar cada dato: [`docs/GUIA.md` → Parte 7](docs/GUIA.md).

## Estructura

```
contracts/Guestbook.sol           ← contrato del libro de visitas
contracts/Donations.sol           ← contrato de donaciones transparentes
test/Guestbook.test.js            ← 7 pruebas
test/Donations.test.js            ← 12 pruebas (incluye "un donante no puede retirar")
scripts/deploy.js                 ← despliega Guestbook en Sepolia (única red real)
scripts/deploy-donations.js       ← despliega Donaciones en Sepolia (única red real)
frontend/index.html + donaciones.js                  ← interfaz de Donaciones (portada del sitio)
frontend/guestbook.html + app.js                     ← interfaz del Guestbook (página secundaria)
frontend/donaciones.html                             ← copia idéntica a index.html (por compatibilidad de link)
frontend/contract-address.json                       ← dirección del Guestbook en Sepolia (se actualiza sola)
frontend/donations-address.json                       ← dirección de Donaciones en Sepolia (se actualiza sola)
docs/GUIA.md                      ← LA GUÍA paso a paso con todos los conceptos
hardhat.config.js                 ← configuración (solo Sepolia + red efímera de tests)
.env.example                      ← plantilla de config para Sepolia (copia a .env)
```

## Requisitos

Node.js ≥ 18 y, para usar el frontend, la extensión [MetaMask](https://metamask.io).

## Tecnologías usadas

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **Solidity** | Lenguaje de programación para contratos inteligentes en Ethereum | Escribir `Guestbook.sol` y `Donations.sol` |
| **Hardhat** | Entorno de desarrollo para Ethereum: compila, prueba y despliega contratos | Compilar, correr las 19 pruebas automáticas, y desplegar en Sepolia |
| **Mocha + Chai** | Framework de pruebas de JavaScript (viene incluido con Hardhat) | Escribir y ejecutar `test/Guestbook.test.js` y `test/Donations.test.js` |
| **ethers.js v6** | Librería de JavaScript para hablar con contratos y wallets | Conecta el frontend con MetaMask y con los contratos ya desplegados |
| **MetaMask** | Wallet de navegador: guarda llaves privadas y firma transacciones | Es la identidad del usuario — reemplaza usuario/contraseña |
| **Sepolia** | Testnet pública de Ethereum (blockchain de pruebas, sin dinero real) | Donde viven de verdad ambos contratos desplegados |
| **Alchemy** | Proveedor de nodo RPC — la "puerta de entrada" para hablar con la blockchain | El endpoint que usa Hardhat para desplegar y leer datos de Sepolia |
| **Netlify (Drop)** | Hosting estático gratuito, sin necesidad de servidor propio | Publica la carpeta `frontend/` en una URL pública |

## Conceptos clave (glosario corto)

- **Smart contract (contrato inteligente):** programa que vive en la blockchain. Una vez desplegado, nadie puede apagarlo ni modificar su código — sus reglas se cumplen solas.
- **Transacción vs. lectura (`view`):** una transacción *cambia* el estado del contrato (donar, retirar, firmar el libro) y cuesta gas; una lectura (`view`) solo consulta datos y es siempre gratis.
- **Gas:** la comisión que se paga por ejecutar una transacción. En Sepolia se paga con ETH de prueba, sin valor real.
- **Wallet / dirección:** tu identidad en la blockchain (`0x...`). No hay usuario ni contraseña — quien tiene la llave privada de una dirección puede firmar en su nombre.
- **Evento (`event`):** un registro que el contrato emite en cada acción importante, para que el frontend (o cualquiera) pueda seguir la actividad en tiempo real o después, desde Etherscan.
- **ABI:** la lista de funciones de un contrato, en un formato que ethers.js entiende — es lo que le permite al frontend saber qué puede llamar y con qué parámetros.
- **Testnet vs. mainnet:** la mainnet es la red real de Ethereum, con ETH que vale dinero. Una testnet (como Sepolia) es una copia idéntica en funcionamiento pero con ETH de prueba, gratis, pensada exactamente para esto: aprender y probar sin arriesgar nada.
- **Faucet:** un servicio gratuito que regala ETH de prueba a cualquier dirección, para poder pagar gas en una testnet.

Explicación completa y en profundidad de cada concepto (con ejemplos de código línea por línea): [`docs/GUIA.md` → Parte 0](docs/GUIA.md).

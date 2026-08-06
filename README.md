# 💚 Donaciones Transparentes

Una dapp: un contrato inteligente en Solidity + un frontend en JavaScript puro. Sistema de donaciones para una ONG ficticia donde cada donación y cada retiro quedan públicamente registrados en la blockchain, con una razón obligatoria para cada retiro. Pensado para mostrar en clase por qué blockchain resuelve un problema real de confianza — no solo "mover dinero entre computadoras".

**👉 La guía completa paso a paso está en [`docs/GUIA.md`](docs/GUIA.md).**

## Verificar el código (gratis, sin red, sin wallet)

```bash
npm install                          # instalar dependencias
npx hardhat test                     # correr las 12 pruebas automáticas
```

Estas pruebas corren en una blockchain efímera en memoria que Hardhat crea y destruye solo — no hay nodo que levantar, no tocan ningún archivo del frontend, no necesitan MetaMask. Es la forma de confirmar que el contrato funciona antes de gastar cualquier ETH real en Sepolia.

## Publicar para el equipo/clase (Sepolia + Netlify, también gratis)

```bash
# Solo la PRIMERA vez (si ya tienes .env con tus valores, NO vuelvas a
# correr esto — cp sobrescribe el archivo y borrarías tu URL y tu llave):
cp .env.example .env       # y rellena ALCHEMY_SEPOLIA_URL + DEPLOYER_PRIVATE_KEY

npx hardhat run scripts/deploy-donations.js --network sepolia
# arrastra la carpeta frontend/ a https://app.netlify.com/drop
```

El mismo `.env` sirve para desplegar de nuevo si cambias el contrato — una vez configurado, no hay que tocarlo salvo que cambies de cuenta o de proveedor RPC.

Detalles completos, con capturas de dónde sacar cada dato: [`docs/GUIA.md` → Parte 7](docs/GUIA.md).

## Estructura

```
contracts/Donations.sol           ← el contrato inteligente (comentado en español)
test/Donations.test.js            ← 12 pruebas (incluye "un donante no puede retirar")
scripts/deploy-donations.js       ← despliega en Sepolia (única red real)
frontend/index.html               ← interfaz web
frontend/donaciones.js            ← lógica: MetaMask + ethers.js
frontend/donations-address.json   ← dirección del contrato en Sepolia (se actualiza sola)
docs/GUIA.md                      ← LA GUÍA paso a paso con todos los conceptos
hardhat.config.js                 ← configuración (solo Sepolia + red efímera de tests)
.env.example                      ← plantilla de config para Sepolia (copia a .env)
```

## Requisitos

Node.js ≥ 18 y, para usar el frontend, la extensión [MetaMask](https://metamask.io).

## Tecnologías usadas

| Tecnología | Qué es | Para qué se usa aquí |
|---|---|---|
| **Solidity** | Lenguaje de programación para contratos inteligentes en Ethereum | Escribir `Donations.sol` |
| **Hardhat** | Entorno de desarrollo para Ethereum: compila, prueba y despliega contratos | Compilar, correr las 12 pruebas automáticas, y desplegar en Sepolia |
| **Mocha + Chai** | Framework de pruebas de JavaScript (viene incluido con Hardhat) | Escribir y ejecutar `test/Donations.test.js` |
| **ethers.js v6** | Librería de JavaScript para hablar con contratos y wallets | Conecta el frontend con MetaMask y con el contrato ya desplegado |
| **MetaMask** | Wallet de navegador: guarda llaves privadas y firma transacciones | Es la identidad del usuario — reemplaza usuario/contraseña |
| **Sepolia** | Testnet pública de Ethereum (blockchain de pruebas, sin dinero real) | Donde vive de verdad el contrato desplegado |
| **Alchemy** | Proveedor de nodo RPC — la "puerta de entrada" para hablar con la blockchain | El endpoint que usa Hardhat para desplegar y leer datos de Sepolia |
| **Netlify (Drop)** | Hosting estático gratuito, sin necesidad de servidor propio | Publica la carpeta `frontend/` en una URL pública |

## Conceptos clave (glosario corto)

- **Smart contract (contrato inteligente):** programa que vive en la blockchain. Una vez desplegado, nadie puede apagarlo ni modificar su código — sus reglas se cumplen solas.
- **Transacción vs. lectura (`view`):** una transacción *cambia* el estado del contrato (donar, retirar) y cuesta gas; una lectura (`view`) solo consulta datos y es siempre gratis.
- **Gas:** la comisión que se paga por ejecutar una transacción. En Sepolia se paga con ETH de prueba, sin valor real.
- **Wallet / dirección:** tu identidad en la blockchain (`0x...`). No hay usuario ni contraseña — quien tiene la llave privada de una dirección puede firmar en su nombre.
- **Evento (`event`):** un registro que el contrato emite en cada acción importante, para que el frontend (o cualquiera) pueda seguir la actividad en tiempo real o después, desde Etherscan.
- **ABI:** la lista de funciones de un contrato, en un formato que ethers.js entiende — es lo que le permite al frontend saber qué puede llamar y con qué parámetros.
- **Testnet vs. mainnet:** la mainnet es la red real de Ethereum, con ETH que vale dinero. Una testnet (como Sepolia) es una copia idéntica en funcionamiento pero con ETH de prueba, gratis, pensada exactamente para esto: aprender y probar sin arriesgar nada.
- **Faucet:** un servicio gratuito que regala ETH de prueba a cualquier dirección, para poder pagar gas en una testnet.

Explicación completa y en profundidad de cada concepto (con ejemplos de código línea por línea): [`docs/GUIA.md` → Parte 0](docs/GUIA.md).

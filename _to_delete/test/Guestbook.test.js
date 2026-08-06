/**
 * Pruebas del contrato Guestbook.
 *
 * Se ejecutan con:  npx hardhat test
 *
 * Cada test despliega el contrato en una blockchain local EN MEMORIA
 * (se crea al empezar y se destruye al terminar). Por eso es gratis e instantáneo.
 *
 * Herramientas:
 *  - mocha:   el framework de tests (describe / it), igual que en JS normal.
 *  - chai:    la librería de aserciones (expect).
 *  - ethers:  la librería para hablar con la blockchain desde JavaScript.
 *  - loadFixture: "foto" del estado de la blockchain que se restaura entre
 *    tests, para que cada uno empiece limpio y rápido.
 */
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

describe("Guestbook", function () {
  // Fixture: despliega el contrato una vez y reutiliza el estado.
  async function deployFixture() {
    // Hardhat nos regala 20 cuentas de prueba con 10,000 ETH ficticios cada una.
    const [owner, visitor1, visitor2] = await ethers.getSigners();

    const Guestbook = await ethers.getContractFactory("Guestbook");
    const guestbook = await Guestbook.deploy(); // transacción de despliegue
    await guestbook.waitForDeployment();

    return { guestbook, owner, visitor1, visitor2 };
  }

  describe("Despliegue", function () {
    it("empieza con cero entradas", async function () {
      const { guestbook } = await loadFixture(deployFixture);
      expect(await guestbook.totalEntries()).to.equal(0);
    });
  });

  describe("signGuestbook (escribir mensaje)", function () {
    it("guarda una entrada con autor, mensaje y timestamp", async function () {
      const { guestbook, visitor1 } = await loadFixture(deployFixture);

      // .connect(visitor1) = firmar la transacción con la wallet de visitor1
      await guestbook.connect(visitor1).signGuestbook("Hola blockchain!");

      const entries = await guestbook.getEntries();
      expect(entries.length).to.equal(1);
      expect(entries[0].author).to.equal(visitor1.address);
      expect(entries[0].message).to.equal("Hola blockchain!");
      expect(entries[0].timestamp).to.be.greaterThan(0);
    });

    it("acumula entradas de varios visitantes en orden", async function () {
      const { guestbook, visitor1, visitor2 } = await loadFixture(deployFixture);

      await guestbook.connect(visitor1).signGuestbook("Primero");
      await guestbook.connect(visitor2).signGuestbook("Segundo");

      expect(await guestbook.totalEntries()).to.equal(2);
      const entries = await guestbook.getEntries();
      expect(entries[0].message).to.equal("Primero");
      expect(entries[1].message).to.equal("Segundo");
    });

    it("lleva la cuenta de mensajes por autor", async function () {
      const { guestbook, visitor1 } = await loadFixture(deployFixture);

      await guestbook.connect(visitor1).signGuestbook("uno");
      await guestbook.connect(visitor1).signGuestbook("dos");

      expect(await guestbook.messageCount(visitor1.address)).to.equal(2);
    });

    it("emite el evento NewEntry", async function () {
      const { guestbook, visitor1 } = await loadFixture(deployFixture);

      // Verificamos que la transacción emite el evento con los args correctos.
      await expect(guestbook.connect(visitor1).signGuestbook("evento!"))
        .to.emit(guestbook, "NewEntry")
        .withArgs(visitor1.address, "evento!", anyUint());

      function anyUint() {
        // matcher flexible: cualquier timestamp válido
        return (value) => value > 0n;
      }
    });

    it("rechaza mensajes vacíos", async function () {
      const { guestbook, visitor1 } = await loadFixture(deployFixture);

      // La transacción debe REVERTIRSE con el mensaje del require.
      await expect(
        guestbook.connect(visitor1).signGuestbook("")
      ).to.be.revertedWith("El mensaje no puede estar vacio");
    });

    it("rechaza mensajes de más de 280 caracteres", async function () {
      const { guestbook, visitor1 } = await loadFixture(deployFixture);

      const longMessage = "x".repeat(281);
      await expect(
        guestbook.connect(visitor1).signGuestbook(longMessage)
      ).to.be.revertedWith("Maximo 280 caracteres");
    });
  });
});

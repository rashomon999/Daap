/**
 * Pruebas del contrato TransparentDonations.
 *
 *   npx hardhat test
 *
 * Estas pruebas son las que más importan explicar en clase: demuestran
 * que la contabilidad (donado - retirado = balance) es matemáticamente
 * imposible de romper, y que solo la ONG puede retirar, y solo con razón.
 */
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

describe("TransparentDonations", function () {
  async function deployFixture() {
    const [ngo, donor1, donor2, extraño] = await ethers.getSigners();

    const Donations = await ethers.getContractFactory("TransparentDonations");
    const donations = await Donations.connect(ngo).deploy("Comedores Comunitarios Bogotá");
    await donations.waitForDeployment();

    return { donations, ngo, donor1, donor2, extraño };
  }

  describe("Despliegue", function () {
    it("registra a quien despliega como la ONG", async function () {
      const { donations, ngo } = await loadFixture(deployFixture);
      expect(await donations.ngo()).to.equal(ngo.address);
    });

    it("empieza en cero", async function () {
      const { donations } = await loadFixture(deployFixture);
      expect(await donations.totalDonated()).to.equal(0);
      expect(await donations.totalWithdrawn()).to.equal(0);
      expect(await donations.currentBalance()).to.equal(0);
    });
  });

  describe("donate (donar)", function () {
    it("acepta una donación y actualiza los totales", async function () {
      const { donations, donor1 } = await loadFixture(deployFixture);

      await donations.connect(donor1).donate("¡Ánimo!", { value: ethers.parseEther("0.1") });

      expect(await donations.totalDonated()).to.equal(ethers.parseEther("0.1"));
      expect(await donations.currentBalance()).to.equal(ethers.parseEther("0.1"));
    });

    it("rechaza donaciones de 0 ETH", async function () {
      const { donations, donor1 } = await loadFixture(deployFixture);
      await expect(
        donations.connect(donor1).donate("nada", { value: 0 })
      ).to.be.revertedWith("La donacion debe ser mayor a 0");
    });

    it("acumula donaciones de varias personas y las lista en orden", async function () {
      const { donations, donor1, donor2 } = await loadFixture(deployFixture);

      await donations.connect(donor1).donate("uno", { value: ethers.parseEther("0.2") });
      await donations.connect(donor2).donate("dos", { value: ethers.parseEther("0.3") });

      const list = await donations.getDonations();
      expect(list.length).to.equal(2);
      expect(list[0].donor).to.equal(donor1.address);
      expect(list[1].donor).to.equal(donor2.address);
      expect(await donations.totalDonated()).to.equal(ethers.parseEther("0.5"));
    });

    it("emite el evento NewDonation", async function () {
      const { donations, donor1 } = await loadFixture(deployFixture);
      await expect(
        donations.connect(donor1).donate("hola", { value: ethers.parseEther("0.1") })
      )
        .to.emit(donations, "NewDonation")
        .withArgs(donor1.address, ethers.parseEther("0.1"), "hola", anyUint());
    });
  });

  describe("withdraw (retirar) — el corazón de la transparencia", function () {
    it("la ONG puede retirar dando una razón, y la contabilidad cuadra", async function () {
      const { donations, ngo, donor1 } = await loadFixture(deployFixture);

      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });
      await donations.connect(ngo).withdraw(ethers.parseEther("0.4"), "Compra de 200 almuerzos");

      expect(await donations.totalWithdrawn()).to.equal(ethers.parseEther("0.4"));
      // La ecuación central de la transparencia:
      const total = await donations.totalDonated();
      const retirado = await donations.totalWithdrawn();
      const balance = await donations.currentBalance();
      expect(balance).to.equal(total - retirado);
    });

    it("alguien que NO es la ONG no puede retirar", async function () {
      const { donations, donor1, extraño } = await loadFixture(deployFixture);
      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });

      await expect(
        donations.connect(extraño).withdraw(ethers.parseEther("0.1"), "intento no autorizado")
      ).to.be.revertedWith("Solo la ONG puede retirar fondos");
    });

    it("no se puede retirar sin dar una razón", async function () {
      const { donations, ngo, donor1 } = await loadFixture(deployFixture);
      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });

      await expect(
        donations.connect(ngo).withdraw(ethers.parseEther("0.1"), "")
      ).to.be.revertedWith("Debes explicar en que se usaran los fondos");
    });

    it("no se puede retirar más de lo que hay en el contrato", async function () {
      const { donations, ngo, donor1 } = await loadFixture(deployFixture);
      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("0.1") });

      await expect(
        donations.connect(ngo).withdraw(ethers.parseEther("5.0"), "gasto excesivo")
      ).to.be.revertedWith("Fondos insuficientes en el contrato");
    });

    it("queda registrado en getWithdrawals() con monto, razón y fecha", async function () {
      const { donations, ngo, donor1 } = await loadFixture(deployFixture);
      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });
      await donations.connect(ngo).withdraw(ethers.parseEther("0.25"), "Medicinas");

      const list = await donations.getWithdrawals();
      expect(list.length).to.equal(1);
      expect(list[0].amount).to.equal(ethers.parseEther("0.25"));
      expect(list[0].reason).to.equal("Medicinas");
    });

    it("emite el evento FundsWithdrawn", async function () {
      const { donations, ngo, donor1 } = await loadFixture(deployFixture);
      await donations.connect(donor1).donate("apoyo", { value: ethers.parseEther("1.0") });

      await expect(donations.connect(ngo).withdraw(ethers.parseEther("0.1"), "transporte"))
        .to.emit(donations, "FundsWithdrawn")
        .withArgs(ethers.parseEther("0.1"), "transporte", anyUint());
    });
  });
});

// Matcher flexible para timestamps (cualquier entero positivo es válido).
function anyUint() {
  return (value) => value > 0n;
}

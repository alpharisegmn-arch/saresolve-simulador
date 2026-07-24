import assert from "node:assert/strict";
import test from "node:test";

const property = {
  consortium: { months: 240, administrationRate: 0.24, reserveRate: 0.02 },
  financing: {
    months: 420,
    annualEffectiveRate: 0.1108,
    minDownPaymentRate: 0.3,
    maxDownPaymentRate: 0.5,
  },
};
const vehicle = {
  consortium: { months: 60, administrationRate: 0.2, reserveRate: 0.02 },
  financing: {
    months: 60,
    monthlyRateWithEntry: 0.0285,
    monthlyRateWithoutEntry: 0.0255,
  },
};

function monthlyRateFromAnnual(rate) {
  return (1 + rate) ** (1 / 12) - 1;
}

function pricePayment(principal, rate, months) {
  const factor = (1 + rate) ** months;
  return (principal * rate * factor) / (factor - 1);
}

function sac(value, availableEntry) {
  const min = value * property.financing.minDownPaymentRate;
  const max = value * property.financing.maxDownPaymentRate;
  const entry = Math.max(min, Math.min(availableEntry, max));
  const principal = value - entry;
  const monthlyRate = monthlyRateFromAnnual(
    property.financing.annualEffectiveRate,
  );
  const amortization = principal / property.financing.months;
  const installments = Array.from(
    { length: property.financing.months },
    (_, index) =>
      amortization + (principal - amortization * index) * monthlyRate,
  );
  return { entry, principal, installments };
}

test("consórcio imobiliário usa 26% de custos definidos", () => {
  for (const value of [120_000, 500_000, 2_000_000]) {
    const total =
      value *
      (1 +
        property.consortium.administrationRate +
        property.consortium.reserveRate);
    assert.equal(total, value * 1.26);
    assert.equal(total / property.consortium.months, value * 1.26 / 240);
  }
});

test("consórcio automotivo usa 22% de custos definidos", () => {
  for (const value of [30_000, 100_000, 500_000]) {
    const total =
      value *
      (1 +
        vehicle.consortium.administrationRate +
        vehicle.consortium.reserveRate);
    assert.equal(total, value * 1.22);
    assert.equal(total / vehicle.consortium.months, value * 1.22 / 60);
  }
});

test("taxa efetiva mensal recompõe 11,08% ao ano", () => {
  const monthly = monthlyRateFromAnnual(0.1108);
  assert.ok(Math.abs((1 + monthly) ** 12 - 1 - 0.1108) < 1e-12);
});

test("SAC produz 420 parcelas decrescentes", () => {
  const result = sac(500_000, 150_000);
  assert.equal(result.installments.length, 420);
  assert.ok(result.installments[0] > result.installments.at(-1));
  assert.ok(
    Math.abs(result.principal / 420 * 420 - result.principal) < 0.000001,
  );
});

test("entrada SAC respeita mínimo, valor informado e máximo", () => {
  assert.equal(sac(500_000, 10_000).entry, 150_000);
  assert.equal(sac(500_000, 200_000).entry, 200_000);
  assert.equal(sac(500_000, 400_000).entry, 250_000);
});

test("parcela Price recompõe o principal financiado", () => {
  const value = 100_000;
  const entry = 30_000;
  const principal = value - entry;
  const payment = pricePayment(
    principal,
    vehicle.financing.monthlyRateWithEntry,
    vehicle.financing.months,
  );
  let balance = principal;
  for (let month = 0; month < vehicle.financing.months; month += 1) {
    const interest = balance * vehicle.financing.monthlyRateWithEntry;
    balance -= payment - interest;
  }
  assert.ok(Math.abs(balance) < 0.000001);
});

test("automóvel sem entrada financia 100% a 2,55% ao mês", () => {
  const value = 60_000;
  const payment = pricePayment(
    value,
    vehicle.financing.monthlyRateWithoutEntry,
    vehicle.financing.months,
  );
  assert.ok(payment > 0);
  assert.equal(vehicle.financing.monthlyRateWithoutEntry, 0.0255);
});

test("automóvel compara consórcio e financiamento no mesmo prazo", () => {
  assert.equal(
    Math.abs(vehicle.financing.months - vehicle.consortium.months),
    0,
  );
  assert.equal(vehicle.financing.months, vehicle.consortium.months);
});

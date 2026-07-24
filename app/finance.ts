import { SITE_CONFIG, type CreditType } from "./config";

export type ComparisonResult = {
  creditType: CreditType;
  creditValue: number;
  idealInstallment: number;
  consortium: {
    entry: number;
    installment: number;
    months: number;
    administrationRate: number;
    administrationCost: number;
    reserveRate: number;
    reserveCost: number;
    additionalCost: number;
    total: number;
  };
  financing: {
    entry: number;
    entryRate: number;
    amountFinanced: number;
    firstInstallment: number;
    averageInstallment: number;
    lastInstallment: number;
    months: number;
    rateLabel: string;
    interestCost: number;
    additionalCost: number;
    total: number;
    entryGap: number;
    entryWasCapped: boolean;
  };
  comparison: {
    totalDifference: number;
    entryDifference: number;
    monthDifference: number;
    consortiumIdealGap: number;
    financingIdealGap: number;
  };
};

export function monthlyRateFromAnnual(annualRate: number) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function calculatePricePayment(
  principal: number,
  monthlyRate: number,
  months: number,
) {
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function calculateComparison(input: {
  creditType: CreditType;
  creditValue: number;
  idealInstallment: number;
  availableEntry: number;
}): ComparisonResult {
  const {
    creditType,
    creditValue,
    idealInstallment,
    availableEntry,
  } = input;

  const config = SITE_CONFIG.credit[creditType];
  const consortiumTotal =
    creditValue *
    (1 +
      config.consortium.administrationRate +
      config.consortium.reserveRate);
  const consortiumInstallment = consortiumTotal / config.consortium.months;
  const administrationCost =
    creditValue * config.consortium.administrationRate;
  const reserveCost = creditValue * config.consortium.reserveRate;

  let financingEntry = 0;
  let entryRate = 0;
  let amountFinanced = 0;
  let firstInstallment = 0;
  let averageInstallment = 0;
  let lastInstallment = 0;
  let financingTotal = 0;
  let interestCost = 0;
  let entryGap = 0;
  let entryWasCapped = false;
  let rateLabel = "";

  if (creditType === "property") {
    const financeConfig = SITE_CONFIG.credit.property.financing;
    const minEntry = creditValue * financeConfig.minDownPaymentRate;
    const maxEntry = creditValue * financeConfig.maxDownPaymentRate;
    financingEntry = Math.max(minEntry, Math.min(availableEntry, maxEntry));
    entryGap = Math.max(0, minEntry - availableEntry);
    entryWasCapped = availableEntry > maxEntry;
    entryRate = financingEntry / creditValue;
    amountFinanced = creditValue - financingEntry;

    const monthlyRate = monthlyRateFromAnnual(
      financeConfig.annualEffectiveRate,
    );
    const amortization = amountFinanced / financeConfig.months;
    const installments = Array.from(
      { length: financeConfig.months },
      (_, index) =>
        amortization +
        (amountFinanced - amortization * index) * monthlyRate,
    );

    firstInstallment = installments[0];
    lastInstallment = installments[installments.length - 1];
    const installmentTotal = installments.reduce((sum, value) => sum + value, 0);
    averageInstallment = installmentTotal / financeConfig.months;
    financingTotal = financingEntry + installmentTotal;
    interestCost = installmentTotal - amountFinanced;
    rateLabel = "11,08% a.a. efetivos · SAC";
  } else {
    const financeConfig = SITE_CONFIG.credit.vehicle.financing;
    const hasEntry = availableEntry > 0;
    financingEntry = hasEntry ? Math.min(availableEntry, creditValue) : 0;
    entryWasCapped = availableEntry > creditValue;
    entryRate = financingEntry / creditValue;
    amountFinanced = creditValue - financingEntry;
    const monthlyRate = hasEntry
      ? financeConfig.monthlyRateWithEntry
      : financeConfig.monthlyRateWithoutEntry;
    const payment = calculatePricePayment(
      amountFinanced,
      monthlyRate,
      financeConfig.months,
    );
    firstInstallment = payment;
    averageInstallment = payment;
    lastInstallment = payment;
    const installmentTotal = payment * financeConfig.months;
    financingTotal = financingEntry + installmentTotal;
    interestCost = installmentTotal - amountFinanced;
    rateLabel = hasEntry
      ? "2,85% a.m. · Price"
      : "2,55% a.m. · Price · 100% financiado";
  }

  const financingMonths =
    creditType === "property"
      ? SITE_CONFIG.credit.property.financing.months
      : SITE_CONFIG.credit.vehicle.financing.months;

  return {
    creditType,
    creditValue,
    idealInstallment,
    consortium: {
      entry: 0,
      installment: consortiumInstallment,
      months: config.consortium.months,
      administrationRate: config.consortium.administrationRate,
      administrationCost,
      reserveRate: config.consortium.reserveRate,
      reserveCost,
      additionalCost: administrationCost + reserveCost,
      total: consortiumTotal,
    },
    financing: {
      entry: financingEntry,
      entryRate,
      amountFinanced,
      firstInstallment,
      averageInstallment,
      lastInstallment,
      months: financingMonths,
      rateLabel,
      interestCost,
      additionalCost: interestCost,
      total: financingTotal,
      entryGap,
      entryWasCapped,
    },
    comparison: {
      totalDifference: Math.abs(financingTotal - consortiumTotal),
      entryDifference: financingEntry,
      monthDifference: Math.abs(financingMonths - config.consortium.months),
      consortiumIdealGap: consortiumInstallment - idealInstallment,
      financingIdealGap: firstInstallment - idealInstallment,
    },
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

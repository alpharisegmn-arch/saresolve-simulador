export const SITE_CONFIG = {
  brand: "SaResolve",
  consentVersion: "2026-07-24.v1",
  credit: {
    property: {
      min: 120_000,
      max: 2_000_000,
      consortium: {
        months: 240,
        administrationRate: 0.24,
        reserveRate: 0.02,
      },
      financing: {
        months: 420,
        annualEffectiveRate: 0.1108,
        minDownPaymentRate: 0.3,
        maxDownPaymentRate: 0.5,
      },
    },
    vehicle: {
      min: 60_000,
      max: 500_000,
      consortium: {
        months: 60,
        administrationRate: 0.2,
        reserveRate: 0.02,
      },
      financing: {
        months: 60,
        monthlyRateWithEntry: 0.0285,
        monthlyRateWithoutEntry: 0.0255,
      },
    },
  },
  features: {
    whatsappEnabled: false,
  },
} as const;

export type CreditType = "property" | "vehicle";

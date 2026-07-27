"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { SITE_CONFIG, type CreditType } from "./config";
import {
  type ComparisonResult,
  formatCurrency,
  formatPercent,
} from "./finance";

type LeadForm = {
  fullName: string;
  phone: string;
  phoneConfirmed: boolean;
  householdIncome: string;
  consent: boolean;
  website: string;
};

const initialLead: LeadForm = {
  fullName: "",
  phone: "",
  phoneConfirmed: false,
  householdIncome: "",
  consent: false,
  website: "",
};

function parseMoney(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function maskMoney(value: string) {
  const amount = parseMoney(value);
  return amount
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      }).format(amount)
    : "";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  required = true,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="money-input">
      <span aria-hidden="true">R$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value.replace(/^R\$\s?/, "")}
        onChange={(event) => onChange(maskMoney(event.target.value))}
        placeholder={placeholder}
        required={required}
        aria-describedby={describedBy}
      />
    </div>
  );
}

function ResultMetric({
  label,
  value,
  badge,
  strong = false,
}: {
  label: string;
  value: string;
  badge?: string;
  strong?: boolean;
}) {
  return (
    <div className={`result-metric${strong ? " result-metric-strong" : ""}`}>
      <div>
        <span>{label}</span>
        {badge && <small>{badge}</small>}
      </div>
      <b>{value}</b>
    </div>
  );
}

function ComparisonChart({ result }: { result: ComparisonResult }) {
  const metrics = [
    {
      label: "Entrada",
      consortium: result.consortium.entry,
      financing: result.financing.entry,
    },
    {
      label: "Custo adicional",
      consortium: result.consortium.additionalCost,
      financing: result.financing.additionalCost,
    },
    {
      label: "Total estimado",
      consortium: result.consortium.total,
      financing: result.financing.total,
    },
  ];
  const max = Math.max(
    ...metrics.flatMap((metric) => [metric.consortium, metric.financing]),
  );

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <p className="result-kicker">Visão comparativa</p>
          <h3>Para onde vai o dinheiro</h3>
        </div>
        <div className="chart-legend" aria-label="Legenda">
          <span><i className="legend-consortium" /> Consórcio</span>
          <span><i className="legend-financing" /> Financiamento</span>
        </div>
      </div>
      <div className="chart" role="img" aria-label="Gráfico de entrada, custo adicional e total estimado">
        {metrics.map((metric) => (
          <div className="chart-row" key={metric.label}>
            <b>{metric.label}</b>
            <div className="bar-set">
              <div className="bar-line">
                <span
                  className="bar consortium-bar"
                  style={{ width: `${Math.max(1, (metric.consortium / max) * 100)}%` }}
                />
                <em>{formatCurrency(metric.consortium)}</em>
              </div>
              <div className="bar-line">
                <span
                  className="bar financing-bar"
                  style={{ width: `${Math.max(1, (metric.financing / max) * 100)}%` }}
                />
                <em>{formatCurrency(metric.financing)}</em>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Results({
  result,
  onRestart,
}: {
  result: ComparisonResult;
  onRestart: () => void;
}) {
  const consortiumLower = result.consortium.total < result.financing.total;
  const financingShorter =
    result.financing.months < result.consortium.months;
  const consortiumShorter =
    result.consortium.months < result.financing.months;
  const sameTerm = result.financing.months === result.consortium.months;
  const financingPaidMultiple =
    result.financing.total / result.financing.amountFinanced;
  const installmentDifference = Math.abs(
    result.financing.firstInstallment - result.consortium.installment,
  );
  const lowerInstallment =
    result.consortium.installment <= result.financing.firstInstallment
      ? "Consórcio"
      : "Financiamento";
  const totalLeader = consortiumLower ? "Consórcio" : "Financiamento";
  const property = result.creditType === "property";

  return (
    <section className="results-section" aria-live="polite">
      <div className="results" id="resultado">
        <header className="results-heading">
          <div>
            <p className="section-kicker">Seu comparativo personalizado</p>
            <h2>Comparativo do seu crédito</h2>
            <p>
              Consórcio e financiamento calculados com as mesmas premissas para
              uma comparação clara.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onRestart}>
            Nova simulação
          </button>
        </header>

        <div className="comparison-heading">
          <div>
            <p className="result-kicker">Comparação completa</p>
            <h3>Duas modalidades, lado a lado</h3>
          </div>
          <p>Valores estimados para todo o período.</p>
        </div>

        <div className="result-grid">
          <article className="result-card consortium-card">
            <div className="result-card-title">
              <div>
                <span className="method-index">A</span>
                <div>
                  <p>Modalidade</p>
                  <h3>Consórcio</h3>
                </div>
              </div>
              <div className="card-credit-value">
                <span>Valor do crédito</span>
                <strong>{formatCurrency(result.creditValue)}</strong>
              </div>
            </div>
            <div className="result-total">
              <span>Total estimado</span>
              <strong>{formatCurrency(result.consortium.total)}</strong>
              {consortiumLower && <small>Menor total neste cenário</small>}
            </div>
            <div className="metric-list">
              <ResultMetric
                label="Entrada obrigatória"
                value={formatCurrency(result.consortium.entry)}
                badge="Menor entrada"
              />
              <ResultMetric
                label="Parcela estimada"
                value={formatCurrency(result.consortium.installment)}
              />
              <ResultMetric
                label="Prazo"
                value={`${result.consortium.months} meses`}
                badge={
                  sameTerm
                    ? "Mesmo prazo"
                    : consortiumShorter
                      ? "Menor prazo"
                      : undefined
                }
              />
              <ResultMetric
                label="Taxa de administração"
                value={formatPercent(result.consortium.administrationRate)}
              />
              <ResultMetric
                label="Fundo de reserva"
                value={formatPercent(result.consortium.reserveRate)}
              />
              <ResultMetric
                label="Custo adicional"
                value={formatCurrency(result.consortium.additionalCost)}
              />
            </div>
          </article>

          <article className="result-card financing-card">
            <div className="result-card-title">
              <div>
                <span className="method-index">B</span>
                <div>
                  <p>Modalidade</p>
                  <h3>Financiamento</h3>
                </div>
              </div>
              <div className="card-credit-value">
                <span>Valor do crédito</span>
                <strong>{formatCurrency(result.creditValue)}</strong>
              </div>
            </div>
            <div className="result-total">
              <span>Total estimado</span>
              <strong>{formatCurrency(result.financing.total)}</strong>
              <small>
                {consortiumLower
                  ? `Total pago equivale a ${financingPaidMultiple.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}× o valor financiado${result.financing.entry > 0 ? ", incluindo a entrada" : ", sem entrada"}`
                  : "Menor total neste cenário"}
              </small>
            </div>
            <div className="metric-list">
              <ResultMetric
                label="Entrada considerada"
                value={formatCurrency(result.financing.entry)}
              />
              <ResultMetric
                label="Valor financiado"
                value={formatCurrency(result.financing.amountFinanced)}
              />
              <ResultMetric
                label="Total das parcelas"
                value={formatCurrency(
                  result.financing.total - result.financing.entry,
                )}
              />
              <ResultMetric
                label={property ? "Primeira parcela" : "Parcela fixa"}
                value={formatCurrency(result.financing.firstInstallment)}
              />
              {property && (
                <ResultMetric
                  label="Parcela média"
                  value={formatCurrency(result.financing.averageInstallment)}
                />
              )}
              <ResultMetric
                label="Prazo"
                value={`${result.financing.months} meses`}
                badge={
                  sameTerm
                    ? "Mesmo prazo"
                    : financingShorter
                      ? "Menor prazo"
                      : undefined
                }
              />
              <ResultMetric
                label="Juros estimados"
                value={formatCurrency(result.financing.interestCost)}
              />
            </div>
          </article>
        </div>

        <div className="results-overview">
          <div className="credit-highlight">
            <div>
              <span>Valor do crédito</span>
              <strong>{formatCurrency(result.creditValue)}</strong>
            </div>
            <div className="credit-context">
              <span>{property ? "Imóvel" : "Automóvel"}</span>
              <span>
                {result.consortium.months} meses
                {sameTerm ? " nas duas modalidades" : " no consórcio"}
              </span>
            </div>
          </div>

          <div className="result-summary-grid">
            <article className="summary-card summary-card-primary">
              <span>Diferença no custo total</span>
              <strong>
                {formatCurrency(result.comparison.totalDifference)}
              </strong>
              <p>Menor total estimado: {totalLeader}</p>
            </article>
            <article className="summary-card summary-card-entry">
              <span>Diferença de entrada</span>
              <strong>
                {formatCurrency(result.comparison.entryDifference)}
              </strong>
              <p>
                {result.financing.entry > 0
                  ? "Valor de entrada informado e considerado no financiamento."
                  : "Financiamento calculado sem entrada, conforme informado."}
              </p>
            </article>
            <article
              className={`summary-card ${property ? "summary-card-term" : "summary-card-installment"}`}
            >
              <span>
                {property ? "Diferença de prazo" : "Economia na parcela"}
              </span>
              <strong>
                {property
                  ? `${result.comparison.monthDifference} meses`
                  : formatCurrency(installmentDifference)}
              </strong>
              <p>
                {property
                  ? consortiumShorter
                    ? `O consórcio termina ${result.comparison.monthDifference} meses antes.`
                    : `O financiamento termina ${result.comparison.monthDifference} meses antes.`
                  : `${lowerInstallment} apresenta a menor parcela estimada.`}
              </p>
            </article>
          </div>
        </div>

        {(result.financing.entryGap > 0 ||
          result.financing.entryWasCapped) && (
          <div className="entry-note">
            <strong>Sobre a entrada do financiamento</strong>
            <p>
              {result.financing.entryGap > 0
                ? `A simulação considerou a entrada mínima de ${formatPercent(result.financing.entryRate)}. Faltariam ${formatCurrency(result.financing.entryGap)} em relação ao valor disponível informado.`
                : "Para manter o comparativo dentro das premissas, a entrada foi limitada a 50% do valor do imóvel."}
            </p>
          </div>
        )}

        <div className="ideal-card">
          <div>
            <p className="result-kicker">Sua referência mensal</p>
            <h3>{formatCurrency(result.idealInstallment)}</h3>
            <span>Parcela que você considera ideal</span>
          </div>
          <div className="ideal-values">
            <span>
              Consórcio
              <b>{formatCurrency(result.consortium.installment)}</b>
              <small>
                {result.comparison.consortiumIdealGap <= 0
                  ? "Dentro da sua referência"
                  : `${formatCurrency(result.comparison.consortiumIdealGap)} acima`}
              </small>
            </span>
            <span>
              Financiamento
              <b>{formatCurrency(result.financing.firstInstallment)}</b>
              <small>
                {result.comparison.financingIdealGap <= 0
                  ? "Dentro da sua referência"
                  : `${formatCurrency(result.comparison.financingIdealGap)} acima`}
              </small>
            </span>
          </div>
        </div>

        <ComparisonChart result={result} />

        <div className="result-disclaimer">
          <p className="result-kicker">Premissas importantes</p>
          <p>
            Esta é uma simulação estimativa. Os valores reais podem variar
            conforme administradora, instituição, análise de crédito, condições
            do grupo e data da contratação.
          </p>
          <ul>
            <li>Consórcio depende de contemplação por sorteio ou lance.</li>
            <li>A carta e as parcelas podem sofrer reajustes contratuais.</li>
            <li>Consórcio não inclui seguros ou reajustes nesta simulação.</li>
            <li>Financiamento não inclui seguros, tarifas ou registros.</li>
            <li>Não há garantia de aprovação ou proposta definitiva.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Simulator() {
  const [creditType, setCreditType] = useState<CreditType>("property");
  const [creditValue, setCreditValue] = useState("");
  const [idealInstallment, setIdealInstallment] = useState("");
  const [entryChoice, setEntryChoice] = useState<"" | "yes" | "no">("");
  const [availableEntry, setAvailableEntry] = useState("");
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [resultsPortal, setResultsPortal] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const config = SITE_CONFIG.credit[creditType];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setResultsPortal(document.getElementById("results-portal"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnFocus = () => openButtonRef.current?.focus();
    dialog?.addEventListener("close", returnFocus);
    return () => dialog?.removeEventListener("close", returnFocus);
  }, []);

  function selectType(type: CreditType) {
    setCreditType(type);
    setCreditValue("");
    setEntryChoice("");
    setAvailableEntry("");
    setFieldError("");
  }

  function openLeadModal(event: FormEvent) {
    event.preventDefault();
    const value = parseMoney(creditValue);
    const installment = parseMoney(idealInstallment);
    if (value < config.min || value > config.max) {
      setFieldError(
        `Informe um valor entre ${formatCurrency(config.min)} e ${formatCurrency(config.max)}.`,
      );
      return;
    }
    if (installment <= 0) {
      setFieldError("Informe o valor de parcela que considera ideal.");
      return;
    }
    if (!entryChoice) {
      setFieldError(
        creditType === "property"
          ? "Informe se possui entrada em espécie ou FGTS."
          : "Informe se possui valor para entrada.",
      );
      return;
    }
    if (entryChoice === "yes" && parseMoney(availableEntry) <= 0) {
      setFieldError("Informe o valor que possui disponível para entrada.");
      return;
    }
    if (
      creditType === "vehicle" &&
      entryChoice === "yes" &&
      parseMoney(availableEntry) >= value
    ) {
      setFieldError("A entrada deve ser menor que o valor do automóvel.");
      return;
    }
    setFieldError("");
    setSubmitError("");
    dialogRef.current?.showModal();
    window.setTimeout(() => {
      document.getElementById("fullName")?.focus();
    }, 50);
  }

  function updateLead<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setLead((current) => ({ ...current, [key]: value }));
  }

  function collectTracking() {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      utmTerm: params.get("utm_term") || undefined,
      utmContent: params.get("utm_content") || undefined,
      gclid: params.get("gclid") || undefined,
      fbclid: params.get("fbclid") || undefined,
      sourcePage: window.location.href,
      referrer: document.referrer || undefined,
    };
  }

  async function submitLead(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...lead,
          householdIncome: parseMoney(lead.householdIncome),
          city: "",
          state: "",
          hasEntry: entryChoice === "yes",
          availableEntry:
            entryChoice === "yes" ? parseMoney(availableEntry) : 0,
          creditType,
          desiredCredit: parseMoney(creditValue),
          idealInstallment: parseMoney(idealInstallment),
          tracking: collectTracking(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: ComparisonResult;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error || "Não foi possível concluir a simulação.");
      }
      setResult(payload.result);
      dialogRef.current?.close();
      window.setTimeout(() => {
        document.getElementById("resultado")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setResult(null);
    setCreditValue("");
    setIdealInstallment("");
    setEntryChoice("");
    setAvailableEntry("");
    setLead(initialLead);
    document.getElementById("simulador")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <>
      <form className="simulator-form" onSubmit={openLeadModal} noValidate>
        <fieldset className="type-selector">
          <legend className="sr-only">Tipo de crédito</legend>
          <button
            type="button"
            className={creditType === "property" ? "active" : ""}
            aria-pressed={creditType === "property"}
            onClick={() => selectType("property")}
          >
            <span className="type-icon home-icon" aria-hidden="true" />
            <span><b>Imóvel</b><small>Casa, apartamento ou terreno</small></span>
          </button>
          <button
            type="button"
            className={creditType === "vehicle" ? "active" : ""}
            aria-pressed={creditType === "vehicle"}
            onClick={() => selectType("vehicle")}
          >
            <span className="type-icon car-icon" aria-hidden="true" />
            <span><b>Automóvel</b><small>Carro para uso pessoal ou trabalho</small></span>
          </button>
        </fieldset>

        <div className="simulator-field">
          <label htmlFor="creditValue">Valor do crédito desejado</label>
          <MoneyInput
            id="creditValue"
            value={creditValue}
            onChange={setCreditValue}
            placeholder={creditType === "property" ? "350.000,00" : "60.000,00"}
            describedBy="creditHint"
          />
          <small id="creditHint">
            De {formatCurrency(config.min)} a {formatCurrency(config.max)}
          </small>
        </div>

        <div className="simulator-field">
          <label htmlFor="idealInstallment">Qual parcela cabe no seu plano?</label>
          <MoneyInput
            id="idealInstallment"
            value={idealInstallment}
            onChange={setIdealInstallment}
            placeholder={creditType === "property" ? "2.500,00" : "1.200,00"}
          />
          <small>Usaremos apenas como referência na comparação.</small>
        </div>

        <fieldset className="entry-question">
          <legend>
            {creditType === "property"
              ? "Possui entrada em espécie ou FGTS?"
              : "Possui valor para entrada?"}
          </legend>
          <div className="entry-choice">
            <button
              type="button"
              className={entryChoice === "yes" ? "active" : ""}
              aria-pressed={entryChoice === "yes"}
              onClick={() => setEntryChoice("yes")}
            >
              Sim
            </button>
            <button
              type="button"
              className={entryChoice === "no" ? "active" : ""}
              aria-pressed={entryChoice === "no"}
              onClick={() => {
                setEntryChoice("no");
                setAvailableEntry("");
              }}
            >
              Não
            </button>
          </div>
          {entryChoice === "yes" && (
            <div className="entry-value">
              <label htmlFor="availableEntry">
                {creditType === "property"
                  ? "Quanto possui somando espécie e FGTS?"
                  : "Qual valor possui para entrada?"}
              </label>
              <MoneyInput
                id="availableEntry"
                value={availableEntry}
                onChange={setAvailableEntry}
                placeholder="30.000,00"
              />
            </div>
          )}
          <small>Se não possui entrada, selecione “Não”.</small>
        </fieldset>

        {fieldError && (
          <p className="form-error" role="alert">{fieldError}</p>
        )}

        <button className="primary-button" ref={openButtonRef} type="submit">
          SIMULAR!
          <span aria-hidden="true">→</span>
        </button>
        <p className="security-note">
          <span aria-hidden="true">✓</span> Seus dados são usados apenas para a
          simulação e o contato autorizado.
        </p>
      </form>

      <dialog className="lead-dialog" ref={dialogRef}>
        <div className="dialog-head">
          <div>
            <p className="section-kicker">Etapa final</p>
            <h2>Receba os dados da simulação pelo WhatsApp.</h2>
            <p>
              Preencha os dados abaixo e confirme o WhatsApp que receberá os
              dados da simulação.
            </p>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Fechar"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </div>

        <div className="dialog-summary">
          <span>{creditType === "property" ? "Imóvel" : "Automóvel"}</span>
          <strong>{formatCurrency(parseMoney(creditValue))}</strong>
          <small>Parcela ideal: {formatCurrency(parseMoney(idealInstallment))}</small>
        </div>

        <form className="lead-form" onSubmit={submitLead}>
          <div className="lead-field full-field">
            <label htmlFor="fullName">Nome completo</label>
            <input
              id="fullName"
              value={lead.fullName}
              onChange={(event) => updateLead("fullName", event.target.value)}
              autoComplete="name"
              minLength={3}
              maxLength={120}
              placeholder="Como podemos chamar você?"
              required
            />
          </div>
          <div className="lead-field full-field">
            <label htmlFor="phone">
              WhatsApp para receber os dados da simulação
            </label>
            <input
              id="phone"
              value={lead.phone}
              onChange={(event) => {
                updateLead("phone", maskPhone(event.target.value));
                updateLead("phoneConfirmed", false);
              }}
              autoComplete="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              pattern="\(\d{2}\)\s\d{4,5}-\d{4}"
              required
            />
            <small>
              Digite um número com WhatsApp ativo. Enviaremos os dados da
              simulação para ele.
            </small>
          </div>

          <label
            className={`phone-confirmation full-field${
              lead.phoneConfirmed ? " is-confirmed" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={lead.phoneConfirmed}
              onChange={(event) =>
                updateLead("phoneConfirmed", event.target.checked)
              }
              required
            />
            <span>
              Confirmo que o WhatsApp{" "}
              <strong>{lead.phone || "informado acima"}</strong> está correto.
            </span>
          </label>

          <div className="lead-field">
            <label htmlFor="householdIncome">Renda média familiar</label>
            <MoneyInput
              id="householdIncome"
              value={lead.householdIncome}
              onChange={(value) => updateLead("householdIncome", value)}
              placeholder="8.000,00"
            />
          </div>

          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Não preencha este campo</label>
            <input
              id="website"
              tabIndex={-1}
              autoComplete="off"
              value={lead.website}
              onChange={(event) => updateLead("website", event.target.value)}
            />
          </div>

          <label className="consent full-field">
            <input
              type="checkbox"
              checked={lead.consent}
              onChange={(event) => updateLead("consent", event.target.checked)}
              required
            />
            <span>
              Li a <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a> e
              autorizo o uso dos meus dados para processar esta simulação e
              receber contato relacionado às opções consultadas.
            </span>
          </label>

          {submitError && (
            <p className="form-error full-field" role="alert">{submitError}</p>
          )}

          <button className="primary-button full-field" type="submit" disabled={submitting}>
            {submitting
              ? "Preparando comparação..."
              : "Ver e receber meu comparativo"}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </dialog>

      {result &&
        resultsPortal &&
        createPortal(
          <Results result={result} onRestart={restart} />,
          resultsPortal,
        )}
    </>
  );
}

"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SITE_CONFIG, type CreditType } from "./config";
import { formatCurrency, type ComparisonResult } from "./finance";
import { Results } from "./simulator";
import { createPortal } from "react-dom";

type LeadForm = {
  fullName: string;
  phone: string;
  phoneConfirmed: boolean;
  householdIncome: string;
  consent: boolean;
  website: string;
};

const initialLead: LeadForm = { fullName: "", phone: "", phoneConfirmed: false, householdIncome: "", consent: false, website: "" };

function parseMoney(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function maskMoney(value: string) {
  const amount = parseMoney(value);
  return amount ? formatCurrency(amount) : "";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function CurrencyField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <div className="modern-money"><b>R$</b><input value={value.replace(/^R\$\s?/, "")} onChange={(event) => onChange(maskMoney(event.target.value))} placeholder={placeholder} inputMode="numeric" aria-label={label} /></div>;
}

export function ModernSimulator() {
  const [step, setStep] = useState(1);
  const [creditType, setCreditType] = useState<CreditType | null>(null);
  const [creditValue, setCreditValue] = useState("");
  const [idealInstallment, setIdealInstallment] = useState("");
  const [entryChoice, setEntryChoice] = useState<"" | "yes" | "no">("");
  const [availableEntry, setAvailableEntry] = useState("");
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [resultsPortal, setResultsPortal] = useState<HTMLElement | null>(null);
  const activeType = creditType ?? "property";
  const config = SITE_CONFIG.credit[activeType];
  const creditNumber = parseMoney(creditValue) || config.min;
  const creditProgress = ((creditNumber - config.min) / (config.max - config.min)) * 100;
  const installmentMin = activeType === "property" ? 600 : 450;
  const label = activeType === "property" ? "Imóvel" : "Automóvel";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setResultsPortal(document.getElementById("results-portal"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function selectType(type: CreditType) {
    setCreditType(type);
    setCreditValue(formatCurrency(SITE_CONFIG.credit[type].min));
    setIdealInstallment("");
    setEntryChoice("");
    setAvailableEntry("");
    setError("");
  }

  function advance() {
    const installment = parseMoney(idealInstallment);
    const value = parseMoney(creditValue);
    if (value < config.min || value > config.max) return setError(`Informe um valor entre ${formatCurrency(config.min)} e ${formatCurrency(config.max)}.`);
    if (installment < installmentMin) return setError(`Informe uma parcela a partir de ${formatCurrency(installmentMin)} para continuar.`);
    if (!entryChoice) return setError("Informe se você possui valor para entrada.");
    if (entryChoice === "yes" && parseMoney(availableEntry) <= 0) return setError("Digite o valor disponível para entrada.");
    if (activeType === "vehicle" && entryChoice === "yes" && parseMoney(availableEntry) >= value) return setError("A entrada deve ser menor que o valor do automóvel.");
    setError("");
    setStep(3);
  }

  function tracking() {
    const params = new URLSearchParams(window.location.search);
    return { utmSource: params.get("utm_source") || undefined, utmMedium: params.get("utm_medium") || undefined, utmCampaign: params.get("utm_campaign") || undefined, utmTerm: params.get("utm_term") || undefined, utmContent: params.get("utm_content") || undefined, gclid: params.get("gclid") || undefined, fbclid: params.get("fbclid") || undefined, sourcePage: window.location.href, referrer: document.referrer || undefined };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !creditType) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...lead, householdIncome: parseMoney(lead.householdIncome), city: "", state: "", hasEntry: entryChoice === "yes", availableEntry: entryChoice === "yes" ? parseMoney(availableEntry) : 0, creditType, desiredCredit: parseMoney(creditValue), idealInstallment: parseMoney(idealInstallment), tracking: tracking() }) });
      const payload = (await response.json()) as { error?: string; result?: ComparisonResult };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Não foi possível concluir a simulação.");
      setResult(payload.result);
      window.setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Não foi possível concluir. Tente novamente.");
    } finally { setSubmitting(false); }
  }

  function restart() {
    setStep(1); setCreditType(null); setCreditValue(""); setIdealInstallment(""); setEntryChoice(""); setAvailableEntry(""); setLead(initialLead); setResult(null);
    document.getElementById("simulador")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <>
    <div className="modern-simulator-head">
      <span>0{step}</span><div><p>Comece por aqui</p><h2>{step === 1 ? "Qual seu objetivo?" : step === 2 ? `Vamos falar do seu ${label.toLowerCase()}.` : "Receba sua simulação."}</h2></div>
    </div>
    <div className="modern-progress" aria-label={`Etapa ${step} de 3`}><span className="active" /><span className={step >= 2 ? "active" : ""} /><span className={step >= 3 ? "active" : ""} /></div>
    {step === 1 && <div className="modern-stage">
      <div className="modern-options">
        <button type="button" className={creditType === "property" ? "selected" : ""} onClick={() => selectType("property")}><span className="modern-option-image"><Image src="/quiz-imovel-casa.png" alt="" fill sizes="(max-width: 820px) 90vw, 430px" /></span><span><strong>Um imóvel</strong><small>Casa, apartamento ou terreno</small></span><i><Check /></i></button>
        <button type="button" className={creditType === "vehicle" ? "selected" : ""} onClick={() => selectType("vehicle")}><span className="modern-option-image"><Image src="/quiz-automovel-branco.png" alt="" fill sizes="(max-width: 820px) 90vw, 430px" /></span><span><strong>Um automóvel</strong><small>Carro novo ou usado</small></span><i><Check /></i></button>
      </div>
      <button className="modern-next" type="button" disabled={!creditType} onClick={() => setStep(2)}>Continuar <span>→</span></button>
    </div>}
    {step === 2 && <div className="modern-stage">
      <p className="modern-stage-description">Arraste para definir o valor aproximado do seu crédito.</p>
      <div className="modern-range-card"><strong>{formatCurrency(creditNumber)}</strong><input type="range" min={config.min} max={config.max} step={5000} value={creditNumber} onChange={(event) => setCreditValue(formatCurrency(Number(event.target.value)))} style={{ background: `linear-gradient(90deg, #6fa7ff ${creditProgress}%, #d9e3f1 ${creditProgress}%)` }} /><div><span>{formatCurrency(config.min)}</span><span>{formatCurrency(config.max)}</span></div></div>
      <label className="modern-field"><span>Qual parcela mensal encaixa no seu orçamento?</span><CurrencyField value={idealInstallment} onChange={(value) => { setIdealInstallment(value); setError(""); }} label="Parcela ideal" placeholder={activeType === "property" ? "Ex.: 1.600" : "Ex.: 1.130,00"} /></label>
      <div className="modern-entry"><p>{activeType === "property" ? "Você possui valor para entrada neste imóvel, em dinheiro ou FGTS?" : "Você possui valor para usar como entrada no carro?"}</p><div className="modern-choice"><button type="button" className={entryChoice === "yes" ? "selected" : ""} onClick={() => { setEntryChoice("yes"); setError(""); }}>Sim</button><button type="button" className={entryChoice === "no" ? "selected" : ""} onClick={() => { setEntryChoice("no"); setAvailableEntry(""); setError(""); }}>Não</button></div>{entryChoice === "yes" && <label className="modern-field"><span>{activeType === "property" ? "Quanto possui somando dinheiro e FGTS?" : "Digite o valor que possui para usar como entrada."}</span><CurrencyField value={availableEntry} onChange={(value) => { setAvailableEntry(value); setError(""); }} label="Valor da entrada" placeholder="" /></label>}</div>
      {error && <p className="modern-error" role="alert">{error}</p>}<div className="modern-actions"><button type="button" onClick={() => setStep(1)}>Voltar</button><button className="modern-next" type="button" onClick={advance}>Continuar <span>→</span></button></div>
    </div>}
    {step === 3 && <form className="modern-capture" onSubmit={submit}>
      <p>Etapa final</p><h3>Receba os dados da simulação pelo WhatsApp.</h3><small>Preencha seus dados para receber seu comparativo personalizado.</small><div className="modern-summary"><strong>{label}</strong><b>{formatCurrency(creditNumber)}</b><span>Parcela ideal: {formatCurrency(parseMoney(idealInstallment))}</span></div>
      <label><span>Nome completo</span><input value={lead.fullName} onChange={(event) => setLead({ ...lead, fullName: event.target.value })} autoComplete="name" placeholder="Como podemos chamar você?" minLength={3} required /></label><label><span>WhatsApp para receber os dados</span><input value={lead.phone} onChange={(event) => setLead({ ...lead, phone: maskPhone(event.target.value), phoneConfirmed: false })} autoComplete="tel" inputMode="tel" placeholder="(11) 99999-9999" required /></label><label className="modern-check"><input type="checkbox" checked={lead.phoneConfirmed} onChange={(event) => setLead({ ...lead, phoneConfirmed: event.target.checked })} required /><span>Confirmo que o WhatsApp informado está correto.</span></label><label><span>Renda média familiar</span><CurrencyField value={lead.householdIncome} onChange={(value) => setLead({ ...lead, householdIncome: value })} label="Renda média familiar" placeholder="Ex.: 8.000,00" /></label><label className="modern-check"><input type="checkbox" checked={lead.consent} onChange={(event) => setLead({ ...lead, consent: event.target.checked })} required /><span>Li a <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a> e autorizo o uso dos meus dados para esta simulação.</span></label>{submitError && <p className="modern-error" role="alert">{submitError}</p>}<div className="modern-actions"><button type="button" onClick={() => setStep(2)}>Voltar</button><button className="modern-next" type="submit" disabled={submitting}>{submitting ? "Preparando..." : "Simular"} {!submitting && <span>→</span>}</button></div>
    </form>}
    <p className="modern-privacy">Seus dados são usados apenas para a simulação e o contato autorizado.</p>
    {result && resultsPortal && createPortal(<Results result={result} onRestart={restart} />, resultsPortal)}
  </>;
}

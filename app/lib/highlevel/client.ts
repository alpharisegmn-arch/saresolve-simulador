import { formatCurrency, type ComparisonResult } from "../../finance";
import { getUsableInstallation, refreshInstallation } from "./oauth";
import type { HighLevelInstallation } from "./store";

type Tracking = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
};

export type HighLevelLead = {
  leadId: string;
  fullName: string;
  phone: string;
  householdIncome: number;
  availableEntry: number;
  result: ComparisonResult;
  tracking: Tracking;
};

function brazilianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

async function highLevelFetch(
  installation: HighLevelInstallation,
  path: string,
  init: RequestInit,
  retry = true,
): Promise<Response> {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${installation.accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-04-15",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshInstallation(installation);
    return highLevelFetch(refreshed, path, init, false);
  }
  return response;
}

function configuredCustomFields(lead: HighLevelLead) {
  const defaultFieldMap: Record<string, string> = {
    creditType: "contact.categoria_simulao",
    desiredCredit: "contact.crdito_simulao",
    idealInstallment: "contact.parcela_ideal_simulao",
    householdIncome: "contact.renda_mdia_familiar",
  };
  const rawMap = process.env.GHL_CUSTOM_FIELD_MAP;
  let fieldMap = defaultFieldMap;
  if (rawMap) {
    try {
      fieldMap = {
        ...defaultFieldMap,
        ...(JSON.parse(rawMap) as Record<string, string>),
      };
    } catch {
      throw new Error("GHL_CUSTOM_FIELD_MAP contém um JSON inválido.");
    }
  }

  const values: Record<string, string> = {
    householdIncome: formatCurrency(lead.householdIncome),
    creditType:
      lead.result.creditType === "property" ? "Imóvel" : "Automóvel",
    desiredCredit: formatCurrency(lead.result.creditValue),
    idealInstallment: formatCurrency(lead.result.idealInstallment),
    availableEntry: formatCurrency(lead.availableEntry),
    consortiumInstallment: formatCurrency(lead.result.consortium.installment),
    consortiumTotal: formatCurrency(lead.result.consortium.total),
    financingInstallment: formatCurrency(
      lead.result.financing.firstInstallment,
    ),
    financingTotal: formatCurrency(lead.result.financing.total),
    estimatedSavings: formatCurrency(lead.result.comparison.totalDifference),
    utmSource: lead.tracking.utmSource ?? "",
    utmMedium: lead.tracking.utmMedium ?? "",
    utmCampaign: lead.tracking.utmCampaign ?? "",
    utmTerm: lead.tracking.utmTerm ?? "",
    utmContent: lead.tracking.utmContent ?? "",
    gclid: lead.tracking.gclid ?? "",
    fbclid: lead.tracking.fbclid ?? "",
  };

  return Object.entries(fieldMap)
    .filter(([key, identifier]) => identifier && values[key] !== undefined)
    .map(([key, identifier]) => ({
      ...(identifier.startsWith("contact.")
        ? { key: identifier }
        : { id: identifier }),
      fieldValue: values[key],
    }));
}

type Pipeline = {
  id: string;
  name: string;
  stages?: Array<{ id: string; name: string }>;
};

function comparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\d]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function resolvePipeline(
  installation: HighLevelInstallation,
): Promise<{ pipelineId: string; pipelineStageId: string } | null> {
  const configuredPipelineId = process.env.GHL_PIPELINE_ID;
  const configuredStageId = process.env.GHL_PIPELINE_STAGE_ID;
  if (configuredPipelineId && configuredStageId) {
    return {
      pipelineId: configuredPipelineId,
      pipelineStageId: configuredStageId,
    };
  }

  const response = await highLevelFetch(
    installation,
    `/opportunities/pipelines?locationId=${encodeURIComponent(
      installation.locationId,
    )}`,
    {
      method: "GET",
      headers: { Version: "2021-07-28" },
    },
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as { pipelines?: Pipeline[] };
  const expectedPipeline = comparableName(
    process.env.GHL_PIPELINE_NAME ?? "Funil de Leads (simulador)",
  );
  const pipeline = payload.pipelines?.find(
    (item) => comparableName(item.name) === expectedPipeline,
  );
  if (!pipeline) return null;

  const expectedStage = comparableName(
    process.env.GHL_PIPELINE_STAGE_NAME ?? "Novo Lead",
  );
  const stage = pipeline.stages?.find((item) =>
    comparableName(item.name).startsWith(expectedStage),
  );
  return stage
    ? { pipelineId: pipeline.id, pipelineStageId: stage.id }
    : null;
}

export async function syncLeadToHighLevel(lead: HighLevelLead) {
  if (
    !process.env.GHL_CLIENT_ID ||
    !process.env.GHL_CLIENT_SECRET ||
    !process.env.DATABASE_URL
  ) {
    return { status: "not_configured" as const };
  }

  const installation = await getUsableInstallation();
  if (!installation) {
    return { status: "not_configured" as const };
  }

  const contactResponse = await highLevelFetch(
    installation,
    "/contacts/upsert",
    {
      method: "POST",
      body: JSON.stringify({
        locationId: installation.locationId,
        name: lead.fullName,
        phone: brazilianPhone(lead.phone),
        source: "Simulador SaResolve",
        tags: [
          "Lead Simulador SaResolve",
          lead.result.creditType === "property"
            ? "Crédito Imobiliário"
            : "Crédito Automotivo",
        ],
        customFields: configuredCustomFields(lead),
      }),
    },
  );

  if (!contactResponse.ok) {
    throw new Error(
      `HighLevel recusou o contato (${contactResponse.status}): ${await contactResponse.text()}`,
    );
  }
  const contactPayload = (await contactResponse.json()) as {
    contact?: { id?: string };
    id?: string;
  };
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new Error("HighLevel não retornou o ID do contato.");

  const pipeline = await resolvePipeline(installation);
  let opportunityStatus: "created" | "pipeline_not_found" =
    "pipeline_not_found";

  if (pipeline) {
    const opportunityResponse = await highLevelFetch(
      installation,
      "/opportunities/upsert",
      {
        method: "POST",
        headers: { Version: "2021-07-28" },
        body: JSON.stringify({
          locationId: installation.locationId,
          pipelineId: pipeline.pipelineId,
          pipelineStageId: pipeline.pipelineStageId,
          contactId,
          name: `${lead.fullName} — ${
            lead.result.creditType === "property" ? "Imóvel" : "Automóvel"
          }`,
          status: "open",
          monetaryValue: lead.result.creditValue,
          source: "Simulador SaResolve",
        }),
      },
    );
    if (!opportunityResponse.ok) {
      throw new Error(
        `HighLevel recusou a oportunidade (${opportunityResponse.status}): ${await opportunityResponse.text()}`,
      );
    }
    opportunityStatus = "created";
  }

  return {
    status: "sent" as const,
    contactId,
    opportunityStatus,
    locationId: installation.locationId,
  };
}

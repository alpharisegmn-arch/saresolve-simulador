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
  hasEntry: boolean;
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

type Pipeline = {
  id: string;
  name: string;
  stages?: Array<{ id: string; name: string }>;
};

type OpportunityCustomField = {
  id: string;
  name: string;
  fieldKey: string;
  model?: string;
};

type Opportunity = {
  id: string;
};

function comparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\d]+/gi, " ")
    .trim()
    .toLowerCase();
}

const opportunityFieldAliases: Record<string, string[]> = {
  creditType: ["categoria do credito", "categoria simulacao"],
  availableEntry: ["valor de entrada", "entrada"],
  desiredCredit: ["valor do credito", "credito simulacao"],
  idealInstallment: ["parcela ideal", "parcela ideal simulacao"],
  householdIncome: ["renda media familiar"],
};

function opportunityFieldValues(lead: HighLevelLead) {
  return {
    creditType:
      lead.result.creditType === "property" ? "Imóvel" : "Automóvel",
    availableEntry: lead.hasEntry
      ? formatCurrency(lead.availableEntry)
      : "Não",
    desiredCredit: formatCurrency(lead.result.creditValue),
    idealInstallment: formatCurrency(lead.result.idealInstallment),
    householdIncome: formatCurrency(lead.householdIncome),
  };
}

async function resolveOpportunityCustomFields(
  installation: HighLevelInstallation,
  lead: HighLevelLead,
) {
  const response = await highLevelFetch(
    installation,
    `/locations/${encodeURIComponent(
      installation.locationId,
    )}/customFields?model=opportunity`,
    {
      method: "GET",
      headers: { Version: "v3" },
    },
  );
  if (!response.ok) {
    throw new Error(
      `HighLevel recusou a consulta dos campos da oportunidade (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as {
    customFields?: OpportunityCustomField[];
  };
  const fields = payload.customFields ?? [];
  const values = opportunityFieldValues(lead);

  return Object.entries(opportunityFieldAliases).flatMap(([valueKey, aliases]) => {
    const field = fields.find((candidate) => {
      if (candidate.model && candidate.model !== "opportunity") return false;
      const comparableField = comparableName(
        `${candidate.name} ${candidate.fieldKey}`,
      );
      return aliases.some((alias) =>
        comparableField.includes(comparableName(alias)),
      );
    });
    if (!field) return [];
    return [
      {
        id: field.id,
        fieldValue: values[valueKey as keyof typeof values],
      },
    ];
  });
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

async function findExistingOpportunity(
  installation: HighLevelInstallation,
  contactId: string,
  pipelineId: string,
) {
  const params = new URLSearchParams({
    locationId: installation.locationId,
    pipelineId,
    contactId,
    status: "all",
    order: "added_asc",
    limit: "20",
  });
  const response = await highLevelFetch(
    installation,
    `/opportunities/search?${params.toString()}`,
    {
      method: "GET",
      headers: { Version: "v3" },
    },
  );
  if (!response.ok) {
    throw new Error(
      `HighLevel recusou a consulta de oportunidades (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as {
    opportunities?: Opportunity[];
  };
  return payload.opportunities?.[0] ?? null;
}

function simulationNoteBody(lead: HighLevelLead) {
  const result = lead.result;
  const type = result.creditType === "property" ? "Imóvel" : "Automóvel";
  const lowerTotal =
    result.consortium.total <= result.financing.total
      ? "Consórcio"
      : "Financiamento";
  const createdAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const campaign = [
    lead.tracking.utmSource && `Origem: ${lead.tracking.utmSource}`,
    lead.tracking.utmMedium && `Mídia: ${lead.tracking.utmMedium}`,
    lead.tracking.utmCampaign && `Campanha: ${lead.tracking.utmCampaign}`,
  ].filter(Boolean);

  return [
    `NOVA SIMULAÇÃO PELO SITE — ${createdAt}`,
    "",
    `Categoria: ${type}`,
    `Crédito desejado: ${formatCurrency(result.creditValue)}`,
    `Parcela ideal: ${formatCurrency(result.idealInstallment)}`,
    `Entrada disponível: ${lead.hasEntry ? formatCurrency(lead.availableEntry) : "Não informada"}`,
    `Renda familiar: ${formatCurrency(lead.householdIncome)}`,
    "",
    `Consórcio: ${formatCurrency(result.consortium.installment)}/mês por ${result.consortium.months} meses — total ${formatCurrency(result.consortium.total)}`,
    `Financiamento: ${formatCurrency(result.financing.firstInstallment)}/mês por ${result.financing.months} meses — total ${formatCurrency(result.financing.total)}`,
    `Diferença no custo total: ${formatCurrency(result.comparison.totalDifference)}`,
    `Menor total estimado: ${lowerTotal}`,
    ...(campaign.length ? ["", ...campaign] : []),
    `ID da simulação: ${lead.leadId}`,
  ].join("\n");
}

async function createSimulationNote(
  installation: HighLevelInstallation,
  contactId: string,
  lead: HighLevelLead,
) {
  const response = await highLevelFetch(
    installation,
    `/contacts/${encodeURIComponent(contactId)}/notes`,
    {
      method: "POST",
      headers: { Version: "v3" },
      body: JSON.stringify({
        ...(installation.userId ? { userId: installation.userId } : {}),
        title: "Nova simulação pelo site",
        body: simulationNoteBody(lead),
        color: "#16a366",
        pinned: false,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `HighLevel recusou a anotação (${response.status}): ${await response.text()}`,
    );
  }
}

async function addSimulationTags(
  installation: HighLevelInstallation,
  contactId: string,
  lead: HighLevelLead,
) {
  const response = await highLevelFetch(
    installation,
    `/contacts/${encodeURIComponent(contactId)}/tags`,
    {
      method: "POST",
      headers: { Version: "v3" },
      body: JSON.stringify({
        tags: [
          "lead simulador saresolve",
          lead.result.creditType === "property" ? "[imóvel]" : "[auto]",
        ],
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `HighLevel recusou as etiquetas (${response.status}): ${await response.text()}`,
    );
  }
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
      headers: { Version: "v3" },
      body: JSON.stringify({
        locationId: installation.locationId,
        name: lead.fullName,
        phone: brazilianPhone(lead.phone),
        source: "Simulador SaResolve",
        createNewIfDuplicateAllowed: false,
      }),
    },
  );

  if (!contactResponse.ok) {
    throw new Error(
      `HighLevel recusou o contato (${contactResponse.status}): ${await contactResponse.text()}`,
    );
  }
  const contactPayload = (await contactResponse.json()) as {
    new?: boolean;
    contact?: { id?: string };
    id?: string;
  };
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new Error("HighLevel não retornou o ID do contato.");
  await addSimulationTags(installation, contactId, lead);

  const pipeline = await resolvePipeline(installation);
  let opportunityStatus: "created" | "existing" | "pipeline_not_found" =
    "pipeline_not_found";
  let noteStatus: "created" | "not_needed" = "not_needed";

  if (pipeline) {
    const existingOpportunity = await findExistingOpportunity(
      installation,
      contactId,
      pipeline.pipelineId,
    );

    if (existingOpportunity) {
      await createSimulationNote(installation, contactId, lead);
      opportunityStatus = "existing";
      noteStatus = "created";
    } else {
      const customFields = await resolveOpportunityCustomFields(
        installation,
        lead,
      );
      const opportunityResponse = await highLevelFetch(
        installation,
        "/opportunities/",
        {
          method: "POST",
          headers: { Version: "v3" },
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
            customFields,
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
  } else if (contactPayload.new === false) {
    await createSimulationNote(installation, contactId, lead);
    noteStatus = "created";
  }

  return {
    status: "sent" as const,
    contactId,
    contactWasCreated: contactPayload.new === true,
    opportunityStatus,
    noteStatus,
    locationId: installation.locationId,
  };
}

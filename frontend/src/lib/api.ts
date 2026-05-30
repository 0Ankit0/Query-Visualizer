import type {
  Dialect,
  DialectsResponse,
  ExplainResponse,
  ExamplesResponse,
  ParseResponse,
  QueryRequest,
  ValidationResponse,
  VisualizationResponse,
} from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload ? String(payload.detail) : "Request failed";
    throw new Error(detail);
  }

  return payload as T;
}

export async function fetchDialects(): Promise<DialectsResponse> {
  return request<DialectsResponse>("/dialects", { method: "GET" });
}

export async function fetchExamples(dialect?: Dialect): Promise<ExamplesResponse> {
  const suffix = dialect ? `?dialect=${dialect}` : "";
  return request<ExamplesResponse>(`/examples${suffix}`, { method: "GET" });
}

export async function validateQuery(data: QueryRequest): Promise<ValidationResponse> {
  return request<ValidationResponse>("/validate", { method: "POST", body: JSON.stringify(data) });
}

export async function parseQuery(data: QueryRequest): Promise<ParseResponse> {
  return request<ParseResponse>("/parse", { method: "POST", body: JSON.stringify(data) });
}

export async function visualizeQuery(data: QueryRequest): Promise<VisualizationResponse> {
  return request<VisualizationResponse>("/visualize", { method: "POST", body: JSON.stringify(data) });
}

export async function explainQuery(data: QueryRequest): Promise<ExplainResponse> {
  return request<ExplainResponse>("/explain", { method: "POST", body: JSON.stringify(data) });
}

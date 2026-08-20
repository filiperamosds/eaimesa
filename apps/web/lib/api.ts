export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiBase() {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const hasBody = init?.body != null && init.body !== "";
  if (isForm) {
    headers.delete("Content-Type");
  } else if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;

  if (!res.ok) {
    const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const nested =
      payload?.error && typeof payload.error === "object"
        ? (payload.error as { code?: string; message?: string })
        : undefined;
    const code =
      nested?.code ?? (typeof payload?.code === "string" ? payload.code : "ERROR");
    const message =
      nested?.message ??
      (typeof payload?.message === "string" ? payload.message : "Não foi possível concluir.");
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  return api<T>(path, { method: "POST", body });
}

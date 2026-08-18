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
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (isForm) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
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
    const err = data && typeof data === "object" && "error" in data ? data.error : undefined;
    throw new ApiError(res.status, err?.code ?? "ERROR", err?.message ?? "Não foi possível concluir.");
  }

  return data as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  return api<T>(path, { method: "POST", body });
}

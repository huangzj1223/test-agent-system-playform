import { getToken, clearTokens, redirectToLogin } from "@/lib/auth";

const API_BASE_URL = "/api/v2";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** 跳过自动注入 Authorization 头（如登录接口） */
  skipAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}
// NOTE  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRKc2RnPT06NzI5NzMzYjE=

/** 构造带 Authorization 的请求头（除非显式跳过） */
function buildHeaders(
  headers?: HeadersInit,
  skipAuth?: boolean
): Record<string, string> {
  const merged: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = getToken();
    if (token) merged["Authorization"] = `Bearer ${token}`;
  }
  return merged;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  // 401：token 失效，清除并跳转登录
  if (response.status === 401) {
    clearTokens();
    redirectToLogin();
    throw new ApiError("未授权，请重新登录", 401);
  }

  // Handle 204 No Content responses (empty body)
  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
    }
    return undefined as T;
  }

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && typeof data === 'object' && (data as any)?.message) || `HTTP error! status: ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}
// TODO  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRKc2RnPT06NzI5NzMzYjE=

export const apiClient = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "GET",
      headers: buildHeaders(options?.headers, options?.skipAuth),
    });
    return handleResponse<T>(response);
  },

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "POST",
      headers: buildHeaders(options?.headers, options?.skipAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "PUT",
      headers: buildHeaders(options?.headers, options?.skipAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "PATCH",
      headers: buildHeaders(options?.headers, options?.skipAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(
    path: string,
    options?: RequestOptions & { data?: unknown }
  ): Promise<T> {
    const url = buildUrl(path, options?.params);
    const { data, skipAuth, ...restOptions } = options || {};
    const response = await fetch(url, {
      ...restOptions,
      method: "DELETE",
      headers: buildHeaders(restOptions?.headers, skipAuth),
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },
};

export { ApiError };
// FIXME  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRKc2RnPT06NzI5NzMzYjE=


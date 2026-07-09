import { BadRequestError } from "./apiError";
import { StatusCodes } from "http-status-codes";

export default class BaseAPI {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  protected async fetch<T>(
    url: string,
    body?: any,
    args?: Record<string, any>,
    requestInit?: RequestInit
  ): Promise<T> {
    let fullUrl: URL;
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        fullUrl = new URL(url);
      } else {
        const base = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`;
        const relative = url.startsWith("/") ? url.slice(1) : url;
        fullUrl = new URL(base + relative);
      }
    } catch (err: any) {
      throw new BadRequestError(err.message);
    }

    if (args) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          queryParams.set(key, String(value));
        }
      }
      fullUrl.search = queryParams.toString();
    }

    const requestOptions: RequestInit = {
      ...requestInit,
      headers: {
        "Content-Type": "application/json",
        ...(requestInit?.headers || {}),
      },
    };

    if (body !== undefined) {
      requestOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(fullUrl.toString(), requestOptions);

    if (response.status === StatusCodes.NO_CONTENT) {
      return null as any;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = errorText;
      try {
        const json = JSON.parse(errorText);
        errorMsg = json.message || json.error || errorText;
      } catch (e) {
        // Not JSON
      }
      throw new BadRequestError(errorMsg || `HTTP Error ${response.status}`);
    }

    try {
      return await response.json() as T;
    } catch (err) {
      return null as any;
    }
  }

  public async get<T>(
    url: string,
    args?: Record<string, any>,
    requestInit?: RequestInit
  ): Promise<T> {
    return this.fetch<T>(url, undefined, args, {
      ...requestInit,
      method: "GET",
    });
  }

  public async post<T>(
    url: string,
    body?: any,
    args?: Record<string, any>,
    requestInit?: RequestInit
  ): Promise<T> {
    return this.fetch<T>(url, body, args, {
      ...requestInit,
      method: "POST",
    });
  }

  public async put<T>(
    url: string,
    body?: any,
    args?: Record<string, any>,
    requestInit?: RequestInit
  ): Promise<T> {
    return this.fetch<T>(url, body, args, {
      ...requestInit,
      method: "PUT",
    });
  }

  public async delete<T>(
    url: string,
    args?: Record<string, any>,
    requestInit?: RequestInit
  ): Promise<T> {
    return this.fetch<T>(url, undefined, args, {
      ...requestInit,
      method: "DELETE",
    });
  }
}

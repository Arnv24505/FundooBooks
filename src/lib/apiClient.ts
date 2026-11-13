"use client";

import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

export type ApiErrorPayload = {
  message: string;
  details?: Array<{ field: string; message: string }>;
};

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ error?: ApiErrorPayload; message?: string }>).response?.data;
    if (data?.error?.message) {
      if (data.error.details?.length) {
        return data.error.details.map((detail) => detail.message).join(" ");
      }
      return data.error.message;
    }
    if (data?.message) return data.message;
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    return error.message || "Something went wrong. Please try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const details = (error as AxiosError<{ error?: ApiErrorPayload }>).response?.data?.error?.details;
  if (!details) return {};
  return Object.fromEntries(details.map((detail) => [detail.field, detail.message]));
}

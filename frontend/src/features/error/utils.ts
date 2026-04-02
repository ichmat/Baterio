import type { ApiError } from "./type";

export function readErrorOrDefault(exception: unknown, defaultMessage: string): string {
  const apiErr = exception as ApiError;
  if(apiErr !== undefined && apiErr !== null){
    return apiErr.message;
  }
  return defaultMessage;
}
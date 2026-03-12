import "server-only";
export {
  deriveWsApiBaseUrlFromOrigin,
  resolveWsApiBaseUrl,
} from "./wsApiBaseUrl.shared";
import { resolveWsApiBaseUrl } from "./wsApiBaseUrl.shared";

export function getWsApiBaseUrl(): string {
  return resolveWsApiBaseUrl(process.env);
}

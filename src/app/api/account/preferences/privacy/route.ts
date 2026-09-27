import { handleGet, handlePut } from "@/app/api/account/preferences/shared";

/** §10 — consentimento de marketing. */
export async function GET(request: Request) {
  return handleGet(request, "privacy");
}

export async function PUT(request: Request) {
  return handlePut(request, "privacy");
}

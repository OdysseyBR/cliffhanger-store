import { handleGet, handlePut } from "@/app/api/account/preferences/shared";

/** §11 — experiência: aparência, leitura e áudio. */
export async function GET(request: Request) {
  return handleGet(request, "prefs");
}

export async function PUT(request: Request) {
  return handlePut(request, "prefs");
}

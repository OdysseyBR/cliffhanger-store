import { handleGet, handlePut } from "@/app/api/account/preferences/shared";

/** §9 — preferências de notificação por contexto e canal. */
export async function GET(request: Request) {
  return handleGet(request, "notifications");
}

export async function PUT(request: Request) {
  return handlePut(request, "notifications");
}

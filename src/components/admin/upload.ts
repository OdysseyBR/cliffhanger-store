"use client";

/**
 * Upload de imagens do CMS (banner, zonas editoriais/promo) direto para o
 * Cloudinary com preset unsigned (`NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`).
 * Nenhuma chave secreta no client — apenas cloud name + preset públicos.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export type UploadFailure = "sem-config" | "tipo" | "tamanho" | "rede" | "servidor";

export async function uploadImage(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; failure: UploadFailure; message: string }> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloud || !preset) {
    return {
      ok: false,
      failure: "sem-config",
      message: "Cloudinary não configurado (NEXT_PUBLIC_CLOUDINARY_*).",
    };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, failure: "tipo", message: "Selecione um arquivo de imagem." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, failure: "tamanho", message: "Imagem muito grande (máx. 8 MB)." };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    return { ok: false, failure: "rede", message: "Falha de rede no upload." };
  }

  if (!res.ok) {
    return {
      ok: false,
      failure: "servidor",
      message: `Cloudinary recusou o upload (HTTP ${res.status}). Confira o preset.`,
    };
  }

  try {
    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      return { ok: false, failure: "servidor", message: "Resposta sem URL da imagem." };
    }
    return { ok: true, url: data.secure_url };
  } catch {
    return { ok: false, failure: "servidor", message: "Resposta inválida do Cloudinary." };
  }
}

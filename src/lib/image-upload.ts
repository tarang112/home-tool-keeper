import { supabase } from "@/integrations/supabase/client";

const BUCKET = "inventory-images";
const MAX_EDGE = 1200;
const QUALITY = 0.8;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

/** Downscale a File to <= MAX_EDGE on its longest edge and re-encode as JPEG. */
export async function downscaleImage(file: File): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}

/**
 * Downscale + upload an image to Storage under `<userId>/<prefix>/...` and
 * return a long-lived URL. Throws on failure.
 */
export async function uploadItemImage(file: File, prefix = "items"): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in to upload photos");

  const blob = await downscaleImage(file);
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw error || new Error("Could not create image URL");

  return data.signedUrl;
}

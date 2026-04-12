import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function watermarkSvg(text: string, w: number, h: number) {
  const fontSize = Math.round(Math.min(w, h) * 0.055);

  const positions = [
    { x: w * 0.28, y: h * 0.30 },
    { x: w * 0.52, y: h * 0.52 },
    { x: w * 0.76, y: h * 0.74 },
  ];

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const texts = positions
    .map(
      (p) => `
    <text
      x="${p.x}"
      y="${p.y}"
      text-anchor="middle"
      dominant-baseline="middle"
      transform="rotate(-30 ${p.x} ${p.y})"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fontSize}"
      fill="rgba(0,0,0,0.25)">
      ${escaped}
    </text>`
    )
    .join("");

  return Buffer.from(`
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  ${texts}
</svg>`);
}

async function claimJob() {
  // 1) Encuentra un job queued (solo su id)
  const { data: queued, error: qErr } = await supabase
    .from("render_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (qErr) throw qErr;
  const jobId = queued?.[0]?.id;
  if (!jobId) return null;

  // 2) Reclama el job de forma atómica (solo si sigue queued)
  const { data: claimed, error: cErr } = await supabase
    .from("render_jobs")
    .update({ status: "processing", error: null })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id, resource_id, pdf_bucket, pdf_path, status")
    .single();

  if (cErr) throw cErr;

  // Si otro worker lo tomó entre medio, no hay claimed
  if (!claimed) return null;

  return claimed;
}

async function setResourceStatus(resourceId: number, render_status: string, render_error: string | null) {
  const { error } = await supabase.from("resources").update({ render_status, render_error }).eq("id", resourceId);
  if (error) throw new Error(error.message);
}

async function setJobStatus(jobId: number, status: string, errorText?: string | null) {
  const { error } = await supabase.from("render_jobs").update({ status, error: errorText ?? null, updated_at: new Date().toISOString() }).eq("id", jobId);
  if (error) throw new Error(error.message);
}

async function downloadPdf(bucket: string, pdfPath: string, outFile: string) {
  const { data, error } = await supabase.storage.from(bucket).download(pdfPath);
  if (error || !data) throw new Error(error?.message ?? "download failed");

  const ab = await data.arrayBuffer();
  await fs.writeFile(outFile, Buffer.from(ab));
}

async function renderPdfToPngs(pdfFile: string, outPrefix: string) {
  // pdftoppm -png -r 160 input.pdf /tmp/out/page
  await execFileAsync("pdftoppm", ["-png", "-r", "160", pdfFile, outPrefix]);
}

async function convertPngToWebpWithWatermark(pngFile: string, webpFile: string, watermarkText: string) {
  const img = sharp(pngFile);
  const meta = await img.metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 1600;

  const svg = watermarkSvg(watermarkText, w, h);

  await img
    .composite([{ input: svg }])
    .webp({ quality: 80 })
    .toFile(webpFile);

  return { width: w, height: h };
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

async function uploadWebp(bucket: string, storagePath: string, webpFile: string) {
  const buf = await fs.readFile(webpFile);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buf, {
    upsert: true,
    contentType: "image/webp",
  });
  if (error) throw new Error(error.message);
}

async function mainLoop() {
  console.log("Render worker started.");

  for (;;) {
    const job = await claimJob();
    if (!job) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    const jobId = job.id;
    const resourceId = job.resource_id;

    console.log("Claimed job", jobId, "resource", resourceId);

    try {
      await setResourceStatus(resourceId, "processing", null);

      const tmpDir = path.join("/tmp", `render_job_${jobId}`);
      await fs.mkdir(tmpDir, { recursive: true });

      const pdfFile = path.join(tmpDir, "source.pdf");
      await downloadPdf(job.pdf_bucket, job.pdf_path, pdfFile);

      const outPrefix = path.join(tmpDir, "page");
      await renderPdfToPngs(pdfFile, outPrefix);

      // encontrar páginas generadas: page-1.png, page-2.png...
      const files = await fs.readdir(tmpDir);
      const pngs = files
        .filter((f) => /^page-\d+\.png$/.test(f))
        .sort((a, b) => {
          const na = Number(a.match(/^page-(\d+)\.png$/)?.[1] ?? 0);
          const nb = Number(b.match(/^page-(\d+)\.png$/)?.[1] ?? 0);
          return na - nb;
        });

      if (pngs.length === 0) throw new Error("No PNG pages generated");

      // limpiar registros previos de páginas (si re-renderizas)
      await supabase.from("resource_pages").delete().eq("resource_id", resourceId);

      const watermarkText =  'Fagus-Ed' ;

      for (let i = 0; i < pngs.length; i++) {
        const pageNum = i + 1;
        const pngFile = path.join(tmpDir, pngs[i]);
        const webpFile = path.join(tmpDir, `page-${pad3(pageNum)}.webp`);

        const { width, height } = await convertPngToWebpWithWatermark(pngFile, webpFile, watermarkText);

        const storagePath = `resource_${resourceId}/page-${pad3(pageNum)}.webp`;
        await uploadWebp("renders_base", storagePath, webpFile);

        const { error: insErr } = await supabase.from("resource_pages").insert({
          resource_id: resourceId,
          page_num: pageNum,
          base_bucket: "renders_base",
          base_path: storagePath,
          width,
          height,
        });

        if (insErr) throw new Error(insErr.message);

        console.log(`Uploaded ${pageNum}/${pngs.length}`);
      }

      // actualizar page_count
      const { error: updErr } = await supabase.from("resources").update({
        page_count: pngs.length,
        render_status: "ready",
        render_error: null,
      }).eq("id", resourceId);
      if (updErr) throw new Error(updErr.message);

      await setJobStatus(jobId, "done", null);

      console.log("Done job", jobId);

    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error("Job failed", jobId, msg);

      try {
        await setResourceStatus(resourceId, "error", msg);
        await setJobStatus(jobId, "error", msg);
      } catch {}
    }
  }
}

mainLoop().catch((e) => {
  console.error(e);
  process.exit(1);
});


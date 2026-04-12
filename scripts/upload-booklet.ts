import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

type Args = {
  pdfPath: string;
  title: string;
  programCode: string;
  levelCode: string;
  subjectCode?: string;
  description?: string;
  dpi: number;
  webpQuality: number;
};

function parseArgs() {
  const argv = process.argv.slice(2);

  let resourceId: number | null = null;
  let pdfPath: string | null = null;

  // formato esperado:
  // --resourceId 7 /path/to/file.pdf
  // o sin resourceId:
  // /path/to/file.pdf "Título" PROGRAM LEVEL [SUBJECT]
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--resourceId") {
      resourceId = Number(argv[i + 1]);
      i++;
      continue;
    }
    if (!pdfPath && !a.startsWith("--")) {
      pdfPath = a;
    }
  }

  if (!pdfPath) {
    throw new Error(
      'Usage:\n' +
        '  Attach to existing draft:\n' +
        '    npm run upload:booklet -- --resourceId 7 "/path/file.pdf"\n' +
        '  Create new resource:\n' +
        '    npm run upload:booklet -- "/path/file.pdf" "Título" PROGRAM LEVEL [SUBJECT]'
    );
  }

  // Si NO viene resourceId, entonces tomamos el modo "crear nuevo"
  const title = argv[1] ?? path.basename(pdfPath);
  const programCode = argv[2] ?? "IGCSE_0625";
  const levelCode = argv[3] ?? "1MED";
  const subjectCode = argv[4];

  return {
    resourceId,
    pdfPath,
    title,
    programCode,
    levelCode,
    subjectCode,
    description: "Visible solo con plan. No descargable.",
    dpi: 160,
    webpQuality: 75,
  };
}

async function main() {
  const args = parseArgs();

  if (!fs.existsSync(args.pdfPath)) throw new Error(`PDF not found: ${args.pdfPath}`);

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1) Crea resource (cuadernillo)
let resourceId = args.resourceId;

if (resourceId) {
  console.log("\nAttach mode. Using existing resource id:", resourceId);
} else {
  const { data: resRow, error: resErr } = await sb
    .from("resources")
    .insert({
      program_code: args.programCode,
      level_code: args.levelCode,
      subject_code: args.subjectCode ?? null,
      title: args.title,
      description: args.description,
      resource_type: "file",
      published: false,
      download_allowed: false,
      view_mode: "images",
      page_count: null,
    })
    .select("id")
    .single();

  if (resErr) throw resErr;
  resourceId = resRow.id as number;
  console.log("\nCreated resource id:", resourceId);
}

  console.log("\nCreated resource id:", resourceId);

  // 2) Render local
  const outPngDir = `/tmp/render_out_${resourceId}`;
  const outWebpDir = `/tmp/render_webp_${resourceId}`;
  const outFinalDir = `/tmp/render_final_${resourceId}`;

  fs.mkdirSync(outPngDir, { recursive: true });
  fs.mkdirSync(outWebpDir, { recursive: true });
  fs.mkdirSync(outFinalDir, { recursive: true });

  run(`pdftoppm -png -r ${args.dpi} "${args.pdfPath}" "${outPngDir}/page"`);

  run(
    `bash -lc 'for f in "${outPngDir}"/page-*.png; do \
      name=$(basename "$f"); \
      name="\${name%.png}"; \
      cwebp -q ${args.webpQuality} "$f" -o "${outWebpDir}/$name.webp"; \
    done'`
  );

// Renombrar a page-001.webp... (Node, sin bash)
const webps = fs
  .readdirSync(outWebpDir)
  .filter((f) => f.endsWith(".webp"))
  .sort((a, b) => {
    // ordena por número si vienen como page-1.webp, page-2.webp...
    const na = Number((a.match(/page-(\d+)\.webp$/)?.[1] ?? "0"));
    const nb = Number((b.match(/page-(\d+)\.webp$/)?.[1] ?? "0"));
    return na - nb;
  });

if (webps.length === 0) throw new Error("No WEBP files produced.");

for (let i = 0; i < webps.length; i++) {
  const src = path.join(outWebpDir, webps[i]);
  const nn = String(i + 1).padStart(3, "0");
  const dst = path.join(outFinalDir, `page-${nn}.webp`);
  fs.copyFileSync(src, dst);
}

  const pages = fs
    .readdirSync(outFinalDir)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  const pageCount = pages.length;
  if (pageCount === 0) throw new Error("No pages produced.");

  // 3) Guarda page_count
  const { error: updErr } = await sb.from("resources").update({ page_count: pageCount }).eq("id", resourceId);
  if (updErr) throw updErr;

  // 4) Upload + resource_pages
  const bucket = "renders_base";
  const folder = `resource_${resourceId}`;

  // crea folder implícitamente al subir archivos
  for (let i = 0; i < pages.length; i++) {
    const fileName = pages[i]; // page-001.webp
    const pageNum = i + 1;
    const filePath = path.join(outFinalDir, fileName);
    const storagePath = `${folder}/${fileName}`;
    const buf = fs.readFileSync(filePath);

    const { error: upErr } = await sb.storage.from(bucket).upload(storagePath, buf, {
      contentType: "image/webp",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { error: insErr } = await sb.from("resource_pages").upsert(
      {
        resource_id: resourceId,
        page_num: pageNum,
        base_bucket: bucket,
        base_path: storagePath,
      },
      { onConflict: "resource_id,page_num" }
    );
    if (insErr) throw insErr;

    process.stdout.write(`Uploaded ${pageNum}/${pageCount}\r`);
  }

  console.log(`\nDone ✅ Resource ID = ${resourceId}`);
  console.log(`Open: http://localhost:3000/materials/${resourceId}`);
}

main().catch((e) => {
  console.error("\nERROR:", e?.message ?? e);
  process.exit(1);
});


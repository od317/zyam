import { createInquiry, MAX_IMAGES } from "@/app/lib/inquiries/create";
import { checkRateLimit } from "@/app/lib/auth/rate-limit";
import { getMeta } from "@/app/lib/auth/request-meta";
import { MAX_BYTES } from "@/app/lib/media/validate";

const MAX_BODY = MAX_BYTES * MAX_IMAGES + 1024 * 1024;

// Empty form fields arrive as "": treat them as missing.
const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
};

export async function POST(req: Request) {
  const { ip } = await getMeta();

  // 1. Rate limit before doing any work.
  if (
    !(await checkRateLimit(`inquiry:ip:${ip ?? "unknown"}`, 5, 60 * 60 * 1000))
  ) {
    return Response.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  // 2. Reject oversized bodies early (the header can lie, so each file is checked again later).
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // 3. Honeypot: pretend success, store nothing.
  if (text(form, "website"))
    return Response.json({ ok: true }, { status: 201 });

  const files: Buffer[] = [];
  for (const f of form.getAll("images")) {
    if (f instanceof File && f.size > 0)
      files.push(Buffer.from(await f.arrayBuffer()));
  }

  const res = await createInquiry(
    {
      type: text(form, "type"),
      name: text(form, "name"),
      phone: text(form, "phone"),
      email: text(form, "email"),
      title: text(form, "title"),
      message: text(form, "message"),
      projectSlug: text(form, "projectSlug"),
    },
    files,
  );

  if (!res.ok) return Response.json({ errors: res.errors }, { status: 422 });
  return Response.json({ ok: true }, { status: 201 });
}

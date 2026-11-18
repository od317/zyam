import { getCurrentUser } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";
import { readPrivate } from "@/app/lib/storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id))
    return new Response("Bad request", { status: 400 });

  const img = await prisma.inquiryImage.findUnique({ where: { id } });
  if (!img) return new Response("Not found", { status: 404 });

  const data = await readPrivate(img.url);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

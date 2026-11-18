// app/api/admin/projects/[id]/images/route.ts   (kind "project")
// app/api/admin/products/[id]/images/route.ts   (kind "product")
// app/api/admin/finishes/[id]/images/route.ts   (kind "finish")
import { handleImageUpload } from "@/app/lib/media/upload-route";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleImageUpload(req, "project", (await params).id);
}

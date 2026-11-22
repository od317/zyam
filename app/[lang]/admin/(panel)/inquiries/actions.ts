"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth/require-user";
import { updateInquiry } from "@/app/lib/admin/inquiries";

export async function updateInquiryAction(formData: FormData) {
  const user = await requireUser();
  await updateInquiry(user, Number(formData.get("id")), {
    status: formData.get("status"),
    adminNote: String(formData.get("adminNote") ?? "") || undefined,
  });
  revalidatePath("/[lang]/admin/inquiries", "page");
}

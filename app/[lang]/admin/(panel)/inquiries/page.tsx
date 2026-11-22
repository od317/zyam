import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listInquiries, countNewInquiries } from "@/app/lib/admin/inquiries";
import { updateInquiryAction } from "./actions";

export const metadata = { robots: { index: false } };

export default async function InquiriesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);

  const [{ items, total }, unread] = await Promise.all([
    listInquiries(user),
    countNewInquiries(user),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">
        Inquiries ({total}) <span className="text-amber-500">{unread} new</span>
      </h1>
      {items.map((q) => (
        <form
          key={q.id}
          action={updateInquiryAction}
          className="space-y-2 rounded border border-stone-700 p-4"
        >
          <input type="hidden" name="id" value={q.id} />
          <div className="flex justify-between text-sm text-stone-400">
            <span>
              {q.type} · {q.createdAt.toLocaleString("en-GB")}
            </span>
            {q.project && <span>project: {q.project.slug}</span>}
          </div>
          <p className="font-semibold">
            {q.name} · <span dir="ltr">{q.phone}</span>{" "}
            {q.email && `· ${q.email}`}
          </p>
          {q.title && <p className="font-medium">{q.title}</p>}
          <p className="whitespace-pre-wrap text-stone-300">{q.message}</p>
          <div className="flex gap-2">
            {q.images.map((img) => (
              <a
                key={img.id}
                href={`/api/admin/inquiries/images/${img.id}`}
                target="_blank"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/inquiries/images/${img.id}`}
                  alt=""
                  className="h-20 w-20 rounded object-cover"
                />
              </a>
            ))}
          </div>
          <textarea
            name="adminNote"
            defaultValue={q.adminNote ?? ""}
            placeholder="Notes"
            className="w-full rounded border border-stone-700 bg-stone-900 p-2"
          />
          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={q.status}
              className="rounded border border-stone-700 bg-stone-900 p-2"
            >
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="closed">closed</option>
            </select>
            <button className="rounded bg-amber-600 px-3 py-2 font-semibold text-stone-950">
              Save
            </button>
          </div>
        </form>
      ))}
    </main>
  );
}

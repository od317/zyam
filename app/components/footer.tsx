import Link from "next/link";
import type { Language } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";

type Settings = Record<string, string>;

// Settings are typed by an admin, so only accept https links. This blocks "javascript:" tricks.
const safeUrl = (v?: string) => (v && /^https:\/\//i.test(v) ? v : null);
const digits = (v?: string) => (v ?? "").replace(/\D/g, "");

export function Footer({
  lang,
  settings,
}: {
  lang: Language;
  settings: Settings;
}) {
  const t = dict[lang];
  const phone = settings.contact_phone;
  const wa = digits(settings.contact_whatsapp);
  const email = settings.contact_email;
  const socials = [
    ["Instagram", safeUrl(settings.social_instagram)],
    ["Facebook", safeUrl(settings.social_facebook)],
    ["TikTok", safeUrl(settings.social_tiktok)],
  ] as const;

  return (
    <footer className="mt-24 border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold text-gold">
            ZYAM DESIGN
          </p>
          {settings.about_text && (
            <p className="mt-3 line-clamp-4 text-sm leading-7 text-muted">
              {settings.about_text}
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-gold">{t.contactTitle}</p>
          {phone && (
            <p>
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                dir="ltr"
                className="hover:text-gold"
              >
                {phone}
              </a>
            </p>
          )}
          {wa && (
            <p>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold"
              >
                WhatsApp
              </a>
            </p>
          )}
          {email && (
            <p>
              <a href={`mailto:${email}`} dir="ltr" className="hover:text-gold">
                {email}
              </a>
            </p>
          )}
          {settings.address && <p className="text-muted">{settings.address}</p>}
          {settings.working_hours && (
            <p className="text-muted">{settings.working_hours}</p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-gold">{t.followUs}</p>
          {socials.map(([name, url]) =>
            url ? (
              <p key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold"
                >
                  {name}
                </a>
              </p>
            ) : null,
          )}
          <Link
            href={`/${lang}/contact`}
            className="mt-4 inline-block text-gold underline"
          >
            {t.consult}
          </Link>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Zyam Design · {t.rights}
      </p>
    </footer>
  );
}

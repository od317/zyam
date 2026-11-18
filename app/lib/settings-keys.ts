// The only keys that exist. Adding a setting means adding a line here.
export const PLAIN_SETTINGS = [
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "social_instagram",
  "social_facebook",
  "social_tiktok",
] as const;

export const TRANSLATED_SETTINGS = [
  "about_text",
  "address",
  "working_hours",
] as const;

export type PlainKey = (typeof PLAIN_SETTINGS)[number];
export type TranslatedKey = (typeof TRANSLATED_SETTINGS)[number];

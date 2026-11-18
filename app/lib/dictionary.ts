import type { Language } from "./i18n";

export const dict = {
  ar: {
    nav: {
      services: "خدماتنا",
      projects: "مشاريعنا",
      products: "منتجاتنا",
      finishes: "الكسوات",
      about: "من نحن",
      contact: "تواصل معنا",
    },
    consult: "اطلب استشارة",
    skip: "تخطي إلى المحتوى",
    menu: "القائمة",
    rights: "جميع الحقوق محفوظة",
    contactTitle: "تواصل معنا",
    followUs: "تابعنا",
    fallbackNote: "هذا المحتوى غير متوفر بلغتك",
  },
  en: {
    nav: {
      services: "Services",
      projects: "Projects",
      products: "Products",
      finishes: "Finishes",
      about: "About",
      contact: "Contact",
    },
    consult: "Request a consultation",
    skip: "Skip to content",
    menu: "Menu",
    rights: "All rights reserved",
    contactTitle: "Contact us",
    followUs: "Follow us",
    fallbackNote: "This content is not available in your language",
  },
} satisfies Record<Language, unknown>;

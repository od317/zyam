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
    skipIntro: "تخطي",
    menu: "القائمة",
    rights: "جميع الحقوق محفوظة",
    contactTitle: "تواصل معنا",
    followUs: "تابعنا",
    fallbackNote: "هذا المحتوى غير متوفر بلغتك",
    hall: {
      kicker: "مرحباً بك في",
      title: "حيث يبدأ التصميم",
      lead: "ادخل القاعة الرئيسية، واختر الباب الذي يقودك إلى ما تبحث عنه.",
      enter: "ادخل",
      doors: {
        projects: {
          title: "مشاريعنا",
          text: "أعمال نفذناها بعناية وتفاصيل دقيقة",
        },
        products: {
          title: "منتجاتنا",
          text: "فواصل وإنارة وقطع ديكورية فاخرة",
        },
        finishes: {
          title: "الكسوات",
          text: "خامات وألوان وتشطيبات تناسب كل مساحة",
        },
        ideas: { title: "فكرة مشروعك", text: "شاركنا فكرتك وسنتواصل معك" },
      },
      servicesTitle: "جناح الخدمات",
      servicesLead: "خدمات متكاملة من الفكرة حتى التسليم",
    },
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
    skipIntro: "Skip",
    menu: "Menu",
    rights: "All rights reserved",
    contactTitle: "Contact us",
    followUs: "Follow us",
    fallbackNote: "This content is not available in your language",
    hall: {
      kicker: "Welcome to",
      title: "Where design begins",
      lead: "Step into the main hall and choose the door that leads to what you need.",
      enter: "Enter",
      doors: {
        projects: {
          title: "Our Projects",
          text: "Work we delivered with care and fine detail",
        },
        products: {
          title: "Our Products",
          text: "Partitions, lighting and luxury decorative pieces",
        },
        finishes: {
          title: "Finishes",
          text: "Materials, colors and finishes for every space",
        },
        ideas: {
          title: "Your Project Idea",
          text: "Share your idea and we will contact you",
        },
      },
      servicesTitle: "The Services Wing",
      servicesLead: "Complete services from the idea to the handover",
    },
  },
} satisfies Record<Language, unknown>;

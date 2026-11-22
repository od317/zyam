import type { Language } from "./i18n";

export const aboutContent = {
  ar: {
    title: "من نحن",
    defaultIntro:
      "نحن استوديو متخصص في التصميم الداخلي والعمارة وتصنيع الأثاث. نصمّم المساحات وننفّذها بعناية، من الفكرة الأولى حتى التسليم.",
    whatWeDo: "ما نقدّمه",
    howWeWork: "كيف نعمل",
    steps: [
      {
        title: "الاستشارة",
        text: "نستمع لفكرتك ونفهم احتياجك ومساحتك وميزانيتك.",
      },
      {
        title: "التصميم",
        text: "نحوّل الفكرة إلى تصميم واضح بمخططات وتصورات قبل أي تنفيذ.",
      },
      { title: "التنفيذ", text: "نصنع ونركّب بدقة، مع متابعة كل مرحلة." },
      { title: "التسليم", text: "نسلّمك مساحة جاهزة تماماً كما اتفقنا." },
    ],
    ctaTitle: "هل لديك مشروع في بالك؟",
    ctaText: "حدّثنا عنه وسنتواصل معك.",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    address: "العنوان",
    hours: "ساعات العمل",
  },
  en: {
    title: "About us",
    defaultIntro:
      "We are a studio for interior design, architecture and custom furniture. We design spaces and build them with care, from the first idea to the handover.",
    whatWeDo: "What we do",
    howWeWork: "How we work",
    steps: [
      {
        title: "Consultation",
        text: "We listen to your idea and understand your space, needs and budget.",
      },
      {
        title: "Design",
        text: "We turn the idea into clear plans and visuals before anything is built.",
      },
      {
        title: "Execution",
        text: "We build and install with precision, and follow up on every stage.",
      },
      {
        title: "Handover",
        text: "We hand over a finished space exactly as agreed.",
      },
    ],
    ctaTitle: "Have a project in mind?",
    ctaText: "Tell us about it and we will get back to you.",
    phone: "Phone",
    email: "Email",
    address: "Address",
    hours: "Working hours",
  },
} satisfies Record<Language, unknown>;

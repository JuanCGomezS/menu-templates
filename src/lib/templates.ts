export type TemplateComponent =
    | "minimal"
    | "natural"
    | "warm"
    | "elegant"
    | "confetti"
    | "brasa"
    | "illustrated"
    | "mascot"
    | "frutal"
    | "garden"
    | "chronicle"
    | "invitation"
    | "billboard"
    | "spotlight"
    | "ribbon";
export type ThemeComponent =
    | "default"
    | "christmas"
    | "mothers-day"
    | "fathers-day"
    | "valentine"
    | "halloween"
    | "easter"
    | "independence"
    | "velitas"
    | "mexican";

export interface TemplateConfig {
    id: string;
    name: string;
    component: TemplateComponent;
    keywords: string[];
    type: "restaurant" | "food_business" | "product_store" | "all";
    description?: string;
}

export interface ThemeConfig {
    id: string;
    name: string;
    component: ThemeComponent;
    keywords: string[];
    description?: string;
    tokens: {
        accent: string;
        background: string;
        surface: string;
        text: string;
        accentSecondary?: string;
        accentTertiary?: string;
        onAccent?: string;
    };
}

export const TEMPLATES: Record<string, TemplateConfig> = {
    GARDEN: {
        id: "layout-garden",
        name: "Jardín",
        component: "garden",
        keywords: ["layout-garden", "garden", "jardin"],
        type: "all",
        description:
            "Carta orgánica de dos columnas, fotografías amplias y títulos con carácter.",
    },
    CHRONICLE: {
        id: "layout-chronicle",
        name: "Crónica",
        component: "chronicle",
        keywords: ["layout-chronicle", "chronicle", "cronica"],
        type: "all",
        description:
            "Recorrido vertical con descripciones a un lado y fotografías al otro.",
    },
    INVITATION: {
        id: "layout-invitation",
        name: "Invitación",
        component: "invitation",
        keywords: ["layout-invitation", "invitation", "invitacion"],
        type: "all",
        description:
            "Carta centrada de aire ceremonial, con categorías y productos en una lectura pausada.",
    },
    BILLBOARD: {
        id: "layout-billboard",
        name: "Pizarra",
        component: "billboard",
        keywords: ["layout-billboard", "billboard", "pizarra"],
        type: "all",
        description:
            "Tipografía contundente y secciones enmarcadas para una carta de lectura rápida.",
    },
    SPOTLIGHT: {
        id: "layout-spotlight",
        name: "Escaparate",
        component: "spotlight",
        keywords: ["layout-spotlight", "spotlight", "escaparate"],
        type: "all",
        description:
            "Portada panorámica con una fotografía protagonista y un catálogo visual amplio.",
    },
    RIBBON: {
        id: "layout-ribbon",
        name: "Bandas",
        component: "ribbon",
        keywords: ["layout-ribbon", "ribbon", "bandas"],
        type: "all",
        description:
            "Productos en bandas horizontales con fotografía y precios destacados.",
    },
    MINIMAL: {
        id: "layout-minimal",
        name: "Minimalista",
        component: "minimal",
        keywords: [
            "layout-minimal",
            "minimal",
            "minimalista",
            "template-default",
            "restaurant-classic",
            "default",
        ],
        type: "all",
        description:
            "Diseño limpio y directo para menús que priorizan lectura rápida y navegación simple.",
    },
    NATURAL: {
        id: "layout-natural",
        name: "Botánica",
        component: "natural",
        keywords: [
            "layout-natural",
            "natural",
            "botanica",
            "tropical",
            "template-tropical",
        ],
        type: "all",
        description:
            "Catálogo botánico contemporáneo para marcas que quieren una presencia orgánica, visual y serena.",
    },
    WARM: {
        id: "layout-warm",
        name: "Galería cálida",
        component: "warm",
        keywords: [
            "layout-warm",
            "warm",
            "calido",
            "galeria-calida",
            "colorful",
            "template-colorful",
            "fast-food",
        ],
        type: "all",
        description:
            "Galería cálida y táctil para catálogos que buscan cercanía, carácter y una presentación envolvente.",
    },
    ELEGANT: {
        id: "layout-elegant",
        name: "Arquitectónica",
        component: "elegant",
        keywords: [
            "layout-elegant",
            "elegant",
            "elegante",
            "arquitectonica",
            "template-elegant",
            "product-catalog",
        ],
        type: "all",
        description:
            "Showroom arquitectónico contemporáneo para catálogos que buscan precisión, presencia y una experiencia refinada.",
    },
    FRUTAL: {
        id: "layout-frutal",
        name: "Fotográfica",
        component: "frutal",
        keywords: [
            "layout-frutal",
            "frutal",
            "fotografica",
            "still-life",
            "editorial-menu",
            "template-frutal",
        ],
        type: "all",
        description:
            "Composición editorial de bodegón con fotografía protagonista y una lectura serena del catálogo.",
    },
    MASCOT: {
        id: "layout-mascot",
        name: "Personaje pop",
        component: "mascot",
        keywords: [
            "layout-mascot",
            "mascot",
            "pop",
            "personaje-pop",
            "character",
            "template-mascot",
        ],
        type: "all",
        description:
            "Diseño pop con personaje, rótulos y productos protagonistas para marcas con una voz cercana y memorable.",
    },
    ILLUSTRATED: {
        id: "layout-illustrated",
        name: "Ilustrada",
        component: "illustrated",
        keywords: [
            "layout-illustrated",
            "illustrated",
            "editorial",
            "template-editorial",
        ],
        type: "all",
        description:
            "Diseño editorial y expresivo para catálogos que se benefician de lectura pausada, detalle y una identidad artesanal.",
    },
    BRASA: {
        id: "layout-brasa",
        name: "Nocturna",
        component: "brasa",
        keywords: [
            "layout-brasa",
            "brasa",
            "nocturna",
            "smoke",
            "dark-menu",
            "template-brasa",
        ],
        type: "all",
        description:
            "Diseño nocturno de alto contraste para catálogos que necesitan una presencia intensa, directa y memorable.",
    },
    CONFETTI: {
        id: "layout-confetti",
        name: "Confeti",
        component: "confetti",
        keywords: [
            "layout-confetti",
            "confetti",
            "vibrante",
            "playful",
            "template-confetti",
        ],
        type: "all",
        description:
            "Diseño dinámico y expresivo para cualquier catálogo que quiera destacar productos, variedad y compra rápida.",
    },
};

export const THEMES: Record<string, ThemeConfig> = {
    MEXICAN: {
        id: "theme-mexican",
        name: "Mexicano",
        component: "mexican",
        keywords: ["theme-mexican", "mexican", "mexicano"],
        description:
            "Rojo profundo, verde y papel picado. Combínalo con cualquier composición de la nueva colección.",
        tokens: {
            accent: "#fff8ec",
            accentSecondary: "#34845c",
            accentTertiary: "#ef6666",
            onAccent: "#711b20",
            background: "#711b20",
            surface: "#87262c",
            text: "#fff8ec",
        },
    },
    HERB: {
        id: "theme-herb",
        name: "Huerto",
        component: "default",
        keywords: ["theme-herb", "herb", "huerto"],
        description:
            "Verde hoja, papel claro y acentos de cosecha, inspirado en la carta orgánica.",
        tokens: {
            accent: "#405a24",
            accentSecondary: "#cddd9c",
            accentTertiary: "#e0a460",
            onAccent: "#ffffff",
            background: "#eef3df",
            surface: "#fffef8",
            text: "#293b1c",
        },
    },
    CHARCOAL: {
        id: "theme-charcoal",
        name: "Carbón",
        component: "default",
        keywords: ["theme-charcoal", "charcoal", "carbon"],
        description:
            "Negro carbón y rojo vivo para una carta gráfica de alto contraste.",
        tokens: {
            accent: "#f04445",
            accentSecondary: "#b52c30",
            accentTertiary: "#e8b879",
            onAccent: "#141414",
            background: "#161616",
            surface: "#242424",
            text: "#fffaf2",
        },
    },
    CACAO: {
        id: "theme-cacao",
        name: "Cacao",
        component: "default",
        keywords: ["theme-cacao", "cacao"],
        description:
            "Cacao oscuro, tonos tostados y oro cálido para destacar la fotografía.",
        tokens: {
            accent: "#f2b94b",
            accentSecondary: "#934314",
            accentTertiary: "#edcd91",
            onAccent: "#321b12",
            background: "#321b12",
            surface: "#482a1d",
            text: "#fff2d8",
        },
    },
    MATCHA: {
        id: "theme-matcha",
        name: "Matcha",
        component: "default",
        keywords: ["theme-matcha", "matcha"],
        description:
            "Verde intenso y papel marfil para bandas de producto y precios definidos.",
        tokens: {
            accent: "#293b13",
            accentSecondary: "#d7e795",
            accentTertiary: "#a9c04a",
            onAccent: "#ffffff",
            background: "#c4d76f",
            surface: "#fffdeb",
            text: "#243413",
        },
    },
    DEFAULT: {
        id: "theme-default",
        name: "Default",
        component: "default",
        keywords: ["theme-default", "default", "predeterminado"],
        description: "Ambientación base sin evento temporal.",
        tokens: {
            accent: "#f97316",
            onAccent: "#111827",
            background: "#fff8ef",
            surface: "#ffffff",
            text: "#111827",
        },
    },
    CANDY: {
        id: "theme-candy",
        name: "Dulce",
        component: "default",
        keywords: ["theme-candy", "candy", "dulce", "pastel"],
        description:
            "Paleta brillante y optimista para marcas cercanas, creativas o de productos indulgentes.",
        tokens: {
            accent: "#e9589b",
            accentSecondary: "#62c9ca",
            accentTertiary: "#f5d866",
            onAccent: "#241625",
            background: "#fcebf2",
            surface: "#fffdf8",
            text: "#382a3b",
        },
    },
    CHRISTMAS: {
        id: "theme-christmas",
        name: "Navidad",
        component: "christmas",
        keywords: [
            "theme-christmas",
            "christmas",
            "navidad",
            "template-christmas",
            "seasonal-christmas",
        ],
        description:
            "Ambientación navideña para temporadas, combos y productos de regalo.",
        tokens: {
            accent: "#dc2626",
            onAccent: "#ffffff",
            background: "#fff7ed",
            surface: "#ffffff",
            text: "#14532d",
        },
    },
    MOTHERS_DAY: {
        id: "theme-mothers-day",
        name: "Día de la Madre",
        component: "mothers-day",
        keywords: [
            "theme-mothers-day",
            "mothers-day",
            "madre",
            "template-mothers-day",
        ],
        description:
            "Ambientación emocional para fechas especiales, detalles, postres y regalos.",
        tokens: {
            accent: "#ec4899",
            onAccent: "#301021",
            background: "#fff1f2",
            surface: "#ffffff",
            text: "#831843",
        },
    },
    HALLOWEEN: {
        id: "theme-halloween",
        name: "Halloween",
        component: "halloween",
        keywords: ["theme-halloween", "halloween", "template-halloween"],
        description:
            "Ambientación oscura y promocional para temporadas de Halloween.",
        tokens: {
            accent: "#f97316",
            onAccent: "#111827",
            background: "#111827",
            surface: "#1f2937",
            text: "#f9fafb",
        },
    },
    VALENTINE: {
        id: "theme-valentine",
        name: "San Valentín",
        component: "valentine",
        keywords: [
            "theme-valentine",
            "valentine",
            "san-valentin",
            "template-valentine",
            "romantic",
            "template-romantic",
        ],
        description:
            "Ambientación romántica para regalos, cenas y promociones especiales.",
        tokens: {
            accent: "#db2777",
            onAccent: "#ffffff",
            background: "#fff1f2",
            surface: "#ffffff",
            text: "#881337",
        },
    },
    FATHERS_DAY: {
        id: "theme-fathers-day",
        name: "Día del Padre",
        component: "fathers-day",
        keywords: [
            "theme-fathers-day",
            "fathers-day",
            "padre",
            "template-fathers-day",
        ],
        description:
            "Ambientación sobria para celebraciones, regalos y menús especiales de Día del Padre.",
        tokens: {
            accent: "#2563eb",
            onAccent: "#ffffff",
            background: "#eff6ff",
            surface: "#ffffff",
            text: "#172554",
        },
    },
    EASTER: {
        id: "theme-easter",
        name: "Pascua",
        component: "easter",
        keywords: ["theme-easter", "easter", "pascua", "template-easter"],
        description:
            "Ambientación suave para Pascua, postres, detalles y productos de temporada.",
        tokens: {
            accent: "#a855f7",
            onAccent: "#1d082f",
            background: "#faf5ff",
            surface: "#ffffff",
            text: "#581c87",
        },
    },
    INDEPENDENCE: {
        id: "theme-independence",
        name: "Independencia",
        component: "independence",
        keywords: [
            "theme-independence",
            "independence",
            "independencia",
            "template-independence",
        ],
        description:
            "Ambientación patriótica para promociones y fechas nacionales.",
        tokens: {
            accent: "#eab308",
            onAccent: "#1e3a8a",
            background: "#fefce8",
            surface: "#ffffff",
            text: "#1e3a8a",
        },
    },
    VELITAS: {
        id: "theme-velitas",
        name: "Día de las Velitas",
        component: "velitas",
        keywords: ["theme-velitas", "velitas", "template-velitas"],
        description:
            "Ambientación luminosa para temporada de velitas y celebraciones decembrinas.",
        tokens: {
            accent: "#d97706",
            onAccent: "#451a03",
            background: "#fffbeb",
            surface: "#ffffff",
            text: "#78350f",
        },
    },
};

export function getTemplateById(id: string): TemplateConfig | null {
    return (
        Object.values(TEMPLATES).find((template) => template.id === id) || null
    );
}

export function getThemeById(id: string): ThemeConfig | null {
    return Object.values(THEMES).find((theme) => theme.id === id) || null;
}

export function resolveTemplate(templateId: string): TemplateConfig {
    const lowerId = templateId.toLowerCase();
    const byId = getTemplateById(templateId);

    if (byId) return byId;

    for (const template of Object.values(TEMPLATES)) {
        if (
            template.keywords.some((keyword) =>
                lowerId.includes(keyword.toLowerCase()),
            )
        ) {
            return template;
        }
    }

    return TEMPLATES.MINIMAL;
}

export function resolveTheme(themeId: string): ThemeConfig {
    const lowerId = themeId.toLowerCase();
    const byId = getThemeById(themeId);

    if (byId) return byId;

    for (const theme of Object.values(THEMES)) {
        if (
            theme.keywords.some((keyword) =>
                lowerId.includes(keyword.toLowerCase()),
            )
        ) {
            return theme;
        }
    }

    return THEMES.DEFAULT;
}

export function resolveStoreTheme(
    templateId: string,
    themeId?: string,
): ThemeConfig {
    if (themeId?.trim()) {
        return resolveTheme(themeId);
    }

    const legacyTemplateAsTheme = resolveTheme(templateId || "");
    return legacyTemplateAsTheme.component === "default"
        ? THEMES.DEFAULT
        : legacyTemplateAsTheme;
}

export function getTemplateComponent(templateId: string): TemplateComponent {
    return resolveTemplate(templateId).component;
}

export function getThemeComponent(themeId: string): ThemeComponent {
    return resolveTheme(themeId).component;
}

export function getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATES).sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );
}

export function getAllThemes(): ThemeConfig[] {
    return Object.values(THEMES);
}

export type TemplateComponent = 'minimal' | 'natural' | 'warm' | 'elegant';
export type ThemeComponent =
    | 'default'
    | 'christmas'
    | 'mothers-day'
    | 'fathers-day'
    | 'valentine'
    | 'halloween'
    | 'easter'
    | 'independence'
    | 'velitas';

export interface TemplateConfig {
    id: string;
    name: string;
    component: TemplateComponent;
    keywords: string[];
    type: 'restaurant' | 'food_business' | 'product_store' | 'all';
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
    };
}

export const TEMPLATES: Record<string, TemplateConfig> = {
    MINIMAL: {
        id: 'layout-minimal',
        name: 'Minimalista',
        component: 'minimal',
        keywords: ['layout-minimal', 'minimal', 'minimalista', 'template-default', 'restaurant-classic', 'default'],
        type: 'all',
        description: 'Diseño limpio y directo para menús que priorizan lectura rápida y navegación simple.',
    },
    NATURAL: {
        id: 'layout-natural',
        name: 'Natural',
        component: 'natural',
        keywords: ['layout-natural', 'natural', 'tropical', 'template-tropical'],
        type: 'restaurant',
        description: 'Diseño fresco y visual para cafés, comida saludable, jugos, brunch o productos artesanales.',
    },
    WARM: {
        id: 'layout-warm',
        name: 'Cálido',
        component: 'warm',
        keywords: ['layout-warm', 'warm', 'calido', 'colorful', 'template-colorful', 'fast-food'],
        type: 'food_business',
        description: 'Diseño expresivo y cercano para comida rápida, postres, promociones y negocios con tono familiar.',
    },
    ELEGANT: {
        id: 'layout-elegant',
        name: 'Elegante',
        component: 'elegant',
        keywords: ['layout-elegant', 'elegant', 'elegante', 'template-elegant', 'product-catalog'],
        type: 'all',
        description: 'Diseño sobrio para restaurantes premium, catálogos cuidados o marcas con estética refinada.',
    },
};

export const THEMES: Record<string, ThemeConfig> = {
    DEFAULT: {
        id: 'theme-default',
        name: 'Default',
        component: 'default',
        keywords: ['theme-default', 'default', 'predeterminado'],
        description: 'Ambientación base sin evento temporal.',
        tokens: {
            accent: '#f97316',
            background: '#fff8ef',
            surface: '#ffffff',
            text: '#111827',
        },
    },
    CHRISTMAS: {
        id: 'theme-christmas',
        name: 'Navidad',
        component: 'christmas',
        keywords: ['theme-christmas', 'christmas', 'navidad', 'template-christmas', 'seasonal-christmas'],
        description: 'Ambientación navideña para temporadas, combos y productos de regalo.',
        tokens: {
            accent: '#dc2626',
            background: '#fff7ed',
            surface: '#ffffff',
            text: '#14532d',
        },
    },
    MOTHERS_DAY: {
        id: 'theme-mothers-day',
        name: 'Día de la Madre',
        component: 'mothers-day',
        keywords: ['theme-mothers-day', 'mothers-day', 'madre', 'template-mothers-day'],
        description: 'Ambientación emocional para fechas especiales, detalles, postres y regalos.',
        tokens: {
            accent: '#ec4899',
            background: '#fff1f2',
            surface: '#ffffff',
            text: '#831843',
        },
    },
    HALLOWEEN: {
        id: 'theme-halloween',
        name: 'Halloween',
        component: 'halloween',
        keywords: ['theme-halloween', 'halloween', 'template-halloween'],
        description: 'Ambientación oscura y promocional para temporadas de Halloween.',
        tokens: {
            accent: '#f97316',
            background: '#111827',
            surface: '#1f2937',
            text: '#f9fafb',
        },
    },
    VALENTINE: {
        id: 'theme-valentine',
        name: 'San Valentín',
        component: 'valentine',
        keywords: ['theme-valentine', 'valentine', 'san-valentin', 'template-valentine', 'romantic', 'template-romantic'],
        description: 'Ambientación romántica para regalos, cenas y promociones especiales.',
        tokens: {
            accent: '#db2777',
            background: '#fff1f2',
            surface: '#ffffff',
            text: '#881337',
        },
    },
    FATHERS_DAY: {
        id: 'theme-fathers-day',
        name: 'Día del Padre',
        component: 'fathers-day',
        keywords: ['theme-fathers-day', 'fathers-day', 'padre', 'template-fathers-day'],
        description: 'Ambientación sobria para celebraciones, regalos y menús especiales de Día del Padre.',
        tokens: {
            accent: '#2563eb',
            background: '#eff6ff',
            surface: '#ffffff',
            text: '#172554',
        },
    },
    EASTER: {
        id: 'theme-easter',
        name: 'Pascua',
        component: 'easter',
        keywords: ['theme-easter', 'easter', 'pascua', 'template-easter'],
        description: 'Ambientación suave para Pascua, postres, detalles y productos de temporada.',
        tokens: {
            accent: '#a855f7',
            background: '#faf5ff',
            surface: '#ffffff',
            text: '#581c87',
        },
    },
    INDEPENDENCE: {
        id: 'theme-independence',
        name: 'Independencia',
        component: 'independence',
        keywords: ['theme-independence', 'independence', 'independencia', 'template-independence'],
        description: 'Ambientación patriótica para promociones y fechas nacionales.',
        tokens: {
            accent: '#eab308',
            background: '#fefce8',
            surface: '#ffffff',
            text: '#1e3a8a',
        },
    },
    VELITAS: {
        id: 'theme-velitas',
        name: 'Día de las Velitas',
        component: 'velitas',
        keywords: ['theme-velitas', 'velitas', 'template-velitas'],
        description: 'Ambientación luminosa para temporada de velitas y celebraciones decembrinas.',
        tokens: {
            accent: '#d97706',
            background: '#fffbeb',
            surface: '#ffffff',
            text: '#78350f',
        },
    },
};

export function getTemplateById(id: string): TemplateConfig | null {
    return Object.values(TEMPLATES).find((template) => template.id === id) || null;
}

export function getThemeById(id: string): ThemeConfig | null {
    return Object.values(THEMES).find((theme) => theme.id === id) || null;
}

export function resolveTemplate(templateId: string): TemplateConfig {
    const lowerId = templateId.toLowerCase();
    const byId = getTemplateById(templateId);

    if (byId) return byId;

    for (const template of Object.values(TEMPLATES)) {
        if (template.keywords.some((keyword) => lowerId.includes(keyword.toLowerCase()))) {
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
        if (theme.keywords.some((keyword) => lowerId.includes(keyword.toLowerCase()))) {
            return theme;
        }
    }

    return THEMES.DEFAULT;
}

export function resolveStoreTheme(templateId: string, themeId?: string): ThemeConfig {
    if (themeId?.trim()) {
        return resolveTheme(themeId);
    }

    const legacyTemplateAsTheme = resolveTheme(templateId || '');
    return legacyTemplateAsTheme.component === 'default' ? THEMES.DEFAULT : legacyTemplateAsTheme;
}

export function getTemplateComponent(templateId: string): TemplateComponent {
    return resolveTemplate(templateId).component;
}

export function getThemeComponent(themeId: string): ThemeComponent {
    return resolveTheme(themeId).component;
}

export function getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATES);
}

export function getAllThemes(): ThemeConfig[] {
    return Object.values(THEMES);
}

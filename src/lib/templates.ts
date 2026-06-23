export interface TemplateConfig {
    id: string;
    name: string;
    component: 'restaurant-classic' | 'fast-food' | 'product-catalog' | 'seasonal-christmas';
    keywords: string[];
    type: 'restaurant' | 'food_business' | 'product_store' | 'seasonal';
    description?: string;
}

export interface ThemeConfig {
    id: string;
    name: string;
    tokens: {
        accent: string;
        background: string;
        surface: string;
        text: string;
    };
}

export const TEMPLATES: Record<string, TemplateConfig> = {
    DEFAULT: {
        id: 'restaurant-classic',
        name: 'Restaurante clásico',
        component: 'restaurant-classic',
        keywords: ['default', 'template-default', 'restaurant-classic'],
        type: 'restaurant'
    },
    CHRISTMAS: {
        id: 'seasonal-christmas',
        name: 'Temporada navideña',
        component: 'seasonal-christmas',
        keywords: ['christmas', 'template-christmas', 'seasonal-christmas'],
        type: 'seasonal'
    },
    FAST_FOOD: {
        id: 'fast-food',
        name: 'Comida rápida',
        component: 'fast-food',
        keywords: ['fast-food', 'quick-service', 'combo'],
        type: 'food_business'
    },
    PRODUCT_CATALOG: {
        id: 'product-catalog',
        name: 'Catálogo de productos',
        component: 'product-catalog',
        keywords: ['product-catalog', 'catalog', 'products'],
        type: 'product_store'
    }
};

export const THEMES: Record<string, ThemeConfig> = {
    DEFAULT: {
        id: 'theme-default',
        name: 'Predeterminado',
        tokens: {
            accent: '#f97316',
            background: '#f9fafb',
            surface: '#ffffff',
            text: '#111827'
        }
    },
    DARK: {
        id: 'theme-dark',
        name: 'Oscuro',
        tokens: {
            accent: '#fb923c',
            background: '#111827',
            surface: '#1f2937',
            text: '#f9fafb'
        }
    },
    TROPICAL: {
        id: 'theme-tropical',
        name: 'Tropical',
        tokens: {
            accent: '#14b8a6',
            background: '#ecfeff',
            surface: '#ffffff',
            text: '#134e4a'
        }
    },
    ROMANTIC: {
        id: 'theme-romantic',
        name: 'Romántico',
        tokens: {
            accent: '#ec4899',
            background: '#fff1f2',
            surface: '#ffffff',
            text: '#831843'
        }
    }
};

/**
 * Obtiene la configuración de una plantilla por su ID
 */
export function getTemplateById(id: string): TemplateConfig | null {
    const template = Object.values(TEMPLATES).find(t => t.id === id);
    return template || null;
}

/**
 * Obtiene la configuración de una plantilla por su nombre
 */
export function getTemplateByName(name: string): TemplateConfig | null {
    const template = Object.values(TEMPLATES).find(
        t => t.name.toLowerCase() === name.toLowerCase()
    );
    return template || null;
}

/**
 * Determina qué plantilla usar basándose en el templateId
 * Busca por ID exacto, nombre o palabras clave
 */
export function resolveTemplate(templateId: string): TemplateConfig {
    const lowerId = templateId.toLowerCase();

    const byId = getTemplateById(templateId);
    if (byId) return byId;

    for (const template of Object.values(TEMPLATES)) {
        if (template.keywords.some(keyword => lowerId.includes(keyword.toLowerCase()))) {
            return template;
        }
    }

    return TEMPLATES.DEFAULT;
}

/**
 * Obtiene el nombre del componente a usar para un templateId
 */
export function getTemplateComponent(templateId: string): TemplateConfig['component'] {
    return resolveTemplate(templateId).component;
}

/**
 * Obtiene todas las plantillas disponibles
 */
export function getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATES);
}

/**
 * Obtiene plantillas por categoría (festividades o temáticas)
 */
export function getTemplatesByCategory(category: 'festivities' | 'themes'): TemplateConfig[] {
    const festivities = ['CHRISTMAS'];
    const themes = ['DEFAULT', 'FAST_FOOD', 'PRODUCT_CATALOG'];

    const keys = category === 'festivities' ? festivities : themes;
    return keys.map(key => TEMPLATES[key]).filter(Boolean);
}

export function getAllThemes(): ThemeConfig[] {
    return Object.values(THEMES);
}

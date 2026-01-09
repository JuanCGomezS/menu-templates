export interface TemplateConfig {
    id: string;
    name: string;
    component: 'default' | 'christmas' | 'halloween' | 'velitas' | 'independence' |
    'easter' | 'mothers-day' | 'fathers-day' | 'valentine' | 'elegant' | 'tropical' |
    'dark' | 'colorful' | 'romantic';
    keywords: string[];
    description?: string;
}

export const TEMPLATES: Record<string, TemplateConfig> = {
    DEFAULT: {
        id: 'template-default',
        name: 'Plantilla por defecto',
        component: 'default',
        keywords: ['default', 'template-default']
    },
    CHRISTMAS: {
        id: 'template-christmas',
        name: 'Navidad',
        component: 'christmas',
        keywords: ['christmas', 'template-christmas']
    },
    HALLOWEEN: {
        id: 'template-halloween',
        name: 'halloween',
        component: 'halloween',
        keywords: ['halloween', 'template-halloween'],
        description: 'Tema oscuro y espeluznante para Halloween'
    },
    VELITAS: {
        id: 'template-velitas',
        name: 'Día de las Velitas',
        component: 'velitas',
        keywords: ['velitas', 'template-velitas'],
        description: 'Tema navideño temprano con velas, blanco y dorado'
    },
    INDEPENDENCE: {
        id: 'template-independence',
        name: 'Día de la Independencia',
        component: 'independence',
        keywords: ['independencia', '20 julio', 'patria', 'tricolor', 'colombia', 'template-independence'],
        description: 'Tema patriótico con colores de la bandera colombiana'
    },
    EASTER: {
        id: 'template-easter',
        name: 'Semana Santa',
        component: 'easter',
        keywords: ['semana santa', 'easter', 'pascua', 'cuaresma', 'morado', 'template-easter'],
        description: 'Tema sobrio y elegante para Semana Santa'
    },
    MOTHERS_DAY: {
        id: 'template-mothers-day',
        name: 'Día de la Madre',
        component: 'mothers-day',
        keywords: ['día de la madre', 'mothers day', 'madre', 'flores', 'rosa', 'template-mothers-day'],
        description: 'Tema romántico con flores y colores suaves'
    },
    FATHERS_DAY: {
        id: 'template-fathers-day',
        name: 'Día del Padre',
        component: 'fathers-day',
        keywords: ['día del padre', 'fathers day', 'padre', 'azul', 'elegante', 'template-fathers-day'],
        description: 'Tema elegante y masculino para el Día del Padre'
    },
    VALENTINE: {
        id: 'template-valentine',
        name: 'San Valentín',
        component: 'valentine',
        keywords: ['san valentín', 'valentine', 'valentines', 'amor', 'romántico', '14 febrero', 'template-valentine'],
        description: 'Tema romántico con corazones y colores cálidos'
    },
    ELEGANT: {
        id: 'template-elegant',
        name: 'Elegante',
        component: 'elegant',
        keywords: ['elegante', 'elegant', 'minimalista', 'sofisticado', 'premium', 'lujo', 'template-elegant'],
        description: 'Diseño minimalista y sofisticado en negro, blanco y dorado'
    },
    TROPICAL: {
        id: 'template-tropical',
        name: 'Tropical',
        component: 'tropical',
        keywords: ['tropical', 'verano', 'playa', 'verde', 'azul', 'fresco', 'template-tropical'],
        description: 'Tema fresco y vibrante inspirado en el trópico'
    },
    DARK: {
        id: 'template-dark',
        name: 'Oscuro',
        component: 'dark',
        keywords: ['oscuro', 'dark', 'dark mode', 'negro', 'modo oscuro', 'template-dark'],
        description: 'Tema oscuro moderno con acentos de color'
    },
    COLORFUL: {
        id: 'template-colorful',
        name: 'Colorido',
        component: 'colorful',
        keywords: ['colorido', 'colorful', 'vibrante', 'arcoíris', 'alegre', 'template-colorful'],
        description: 'Diseño alegre y vibrante con múltiples colores'
    },
    ROMANTIC: {
        id: 'template-romantic',
        name: 'Romántico',
        component: 'romantic',
        keywords: ['romántico', 'romantic', 'suave', 'delicado', 'rosa', 'template-romantic'],
        description: 'Tema suave y delicado con tonos pastel'
    }
};

/**
 * Obtiene la configuración de un template por su ID
 */
export function getTemplateById(id: string): TemplateConfig | null {
    const template = Object.values(TEMPLATES).find(t => t.id === id);
    return template || null;
}

/**
 * Obtiene la configuración de un template por su nombre
 */
export function getTemplateByName(name: string): TemplateConfig | null {
    const template = Object.values(TEMPLATES).find(
        t => t.name.toLowerCase() === name.toLowerCase()
    );
    return template || null;
}

/**
 * Determina qué template usar basándose en el templateId
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
 * Obtiene todos los templates disponibles
 */
export function getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATES);
}

/**
 * Obtiene templates por categoría (festividades o temáticas)
 */
export function getTemplatesByCategory(category: 'festivities' | 'themes'): TemplateConfig[] {
    const festivities = ['CHRISTMAS', 'HALLOWEEN', 'VELITAS', 'INDEPENDENCE', 'EASTER', 'MOTHERS_DAY', 'FATHERS_DAY', 'VALENTINE'];
    const themes = ['DEFAULT', 'ELEGANT', 'TROPICAL', 'DARK', 'COLORFUL', 'ROMANTIC'];

    const keys = category === 'festivities' ? festivities : themes;
    return keys.map(key => TEMPLATES[key]).filter(Boolean);
}


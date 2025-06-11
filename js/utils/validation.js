/**
 * Utilidades de validación para formularios
 * Optimizado para uso rural con validaciones simples
 */

class FormValidator {
    constructor() {
        this.rules = {
            required: (value) => value !== null && value !== undefined && value !== '',
            minLength: (value, min) => value && value.length >= min,
            maxLength: (value, max) => value && value.length <= max,
            pattern: (value, regex) => value && regex.test(value),
            fileSize: (file, maxSizeKB) => file && file.size <= (maxSizeKB * 1024),
            fileType: (file, allowedTypes) => file && allowedTypes.includes(file.type)
        };
    }

    validate(value, validationRules) {
        const errors = [];
        
        for (const rule of validationRules) {
            const { type, params, message } = rule;
            const validator = this.rules[type];
            
            if (validator && !validator(value, ...params)) {
                errors.push(message);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validaciones específicas para semillas
    validateSeedName(name) {
        return this.validate(name, [
            {
                type: 'required',
                params: [],
                message: 'El nombre de la semilla es requerido'
            },
            {
                type: 'minLength',
                params: [2],
                message: 'El nombre debe tener al menos 2 caracteres'
            }
        ]);
    }

    validateSeedImages(images) {
        if (!images || images.length === 0) {
            return { isValid: true, errors: [] }; // Opcional
        }

        const errors = [];
        
        images.forEach((image, index) => {
            const sizeValidation = this.validate(image, [
                {
                    type: 'fileSize',
                    params: [500], // 500KB max
                    message: `Imagen ${index + 1} es demasiado grande (máximo 500KB)`
                }
            ]);
            
            if (!sizeValidation.isValid) {
                errors.push(...sizeValidation.errors);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Instancia global
window.formValidator = new FormValidator();

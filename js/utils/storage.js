/**
 * Sistema de almacenamiento híbrido IndexedDB + LocalStorage
 * Optimizado para dispositivos rurales con almacenamiento limitado
 */

class TarpuStorage {
    constructor() {
        this.dbName = 'TarpuYachayDB';
        this.version = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        
        // Configuración de almacenamiento
        this.config = {
            maxImageSize: 300 * 1024, // 300KB max per image
            maxAudioSize: 500 * 1024,  // 500KB max per audio
            maxTotalStorage: 50 * 1024 * 1024, // 50MB total app limit
            compressionQuality: 0.7,
            autoCleanupDays: 30
        };

        this.initDB();
        this.setupStorageMonitoring();
    }

    /**
     * Inicializar IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Error opening database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }

    /**
     * Crear stores de base de datos
     */
    createObjectStores(db) {
        // Store para semillas
        if (!db.objectStoreNames.contains('seeds')) {
            const seedStore = db.createObjectStore('seeds', { keyPath: 'id' });
            seedStore.createIndex('owner', 'owner', { unique: false });
            seedStore.createIndex('sector', 'location.sector', { unique: false });
            seedStore.createIndex('category', 'category', { unique: false });
            seedStore.createIndex('status', 'metadata.status', { unique: false });
            seedStore.createIndex('created', 'metadata.created', { unique: false });
        }

        // Store para usuarios
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('phone', 'phone', { unique: true });
            userStore.createIndex('sector', 'sector', { unique: false });
        }

        // Store para datos de configuración
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Store para datos temporales (draft forms)
        if (!db.objectStoreNames.contains('drafts')) {
            const draftStore = db.createObjectStore('drafts', { keyPath: 'id' });
            draftStore.createIndex('created', 'created', { unique: false });
        }
    }

    /**
     * Guardar semilla
     */
    async saveSeed(seedData) {
        try {
            // Generar ID único
            seedData.id = this.generateId();
            
            // Agregar metadata
            seedData.metadata = {
                ...seedData.metadata,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                status: 'draft',
                isOfflineOnly: !this.isOnline,
                version: 1
            };

            // Procesar imágenes si existen
            if (seedData.images && seedData.images.length > 0) {
                seedData.images = await this.processImages(seedData.images);
            }

            // Procesar audio si existe
            if (seedData.audio) {
                seedData.audio = await this.processAudio(seedData.audio);
            }

            // Guardar en IndexedDB
            const transaction = this.db.transaction(['seeds'], 'readwrite');
            const store = transaction.objectStore('seeds');
            const result = await this.promisifyRequest(store.add(seedData));

            // Backup en LocalStorage para casos críticos
            this.backupToLocalStorage('seed_' + seedData.id, {
                id: seedData.id,
                name: seedData.name,
                category: seedData.category,
                created: seedData.metadata.created
            });

            console.log('Seed saved successfully:', result);
            return seedData;

        } catch (error) {
            console.error('Error saving seed:', error);
            
            // Fallback a LocalStorage si IndexedDB falla
            try {
                localStorage.setItem('seed_' + seedData.id, JSON.stringify(seedData));
                return seedData;
            } catch (localError) {
                throw new Error('No se pudo guardar la semilla: ' + error.message);
            }
        }
    }

    /**
     * Obtener semillas
     */
    async getSeeds(filters = {}) {
        try {
            const transaction = this.db.transaction(['seeds'], 'readonly');
            const store = transaction.objectStore('seeds');
            
            let request;
            if (filters.sector) {
                const index = store.index('sector');
                request = index.getAll(filters.sector);
            } else if (filters.category) {
                const index = store.index('category');
                request = index.getAll(filters.category);
            } else {
                request = store.getAll();
            }

            const seeds = await this.promisifyRequest(request);
            
            // Aplicar filtros adicionales
            return this.applyFilters(seeds, filters);

        } catch (error) {
            console.error('Error getting seeds:', error);
            
            // Fallback a LocalStorage
            return this.getSeedsFromLocalStorage(filters);
        }
    }

    /**
     * Guardar borrador de formulario
     */
    async saveDraft(formData, step) {
        try {
            const draft = {
                id: 'current_draft',
                data: formData,
                currentStep: step,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            const transaction = this.db.transaction(['drafts'], 'readwrite');
            const store = transaction.objectStore('drafts');
            
            // Usar put para sobreescribir si existe
            await this.promisifyRequest(store.put(draft));
            
            console.log('Draft saved at step:', step);
            return true;

        } catch (error) {
            console.error('Error saving draft:', error);
            
            // Fallback a LocalStorage
            localStorage.setItem('form_draft', JSON.stringify({
                data: formData,
                step: step,
                timestamp: Date.now()
            }));
            
            return true;
        }
    }

    /**
     * Obtener borrador guardado
     */
    async getDraft() {
        try {
            const transaction = this.db.transaction(['drafts'], 'readonly');
            const store = transaction.objectStore('drafts');
            const draft = await this.promisifyRequest(store.get('current_draft'));
            
            return draft || null;

        } catch (error) {
            console.error('Error getting draft:', error);
            
            // Fallback a LocalStorage
            const localDraft = localStorage.getItem('form_draft');
            if (localDraft) {
                const parsed = JSON.parse(localDraft);
                return {
                    data: parsed.data,
                    currentStep: parsed.step
                };
            }
            
            return null;
        }
    }

    /**
     * Limpiar borrador
     */
    async clearDraft() {
        try {
            const transaction = this.db.transaction(['drafts'], 'readwrite');
            const store = transaction.objectStore('drafts');
            await this.promisifyRequest(store.delete('current_draft'));
            
            localStorage.removeItem('form_draft');
            console.log('Draft cleared');
            
        } catch (error) {
            console.error('Error clearing draft:', error);
        }
    }

    /**
     * Procesar imágenes para optimizar almacenamiento
     */
    async processImages(images) {
        const processedImages = [];
        
        for (const image of images) {
            try {
                const compressed = await this.compressImage(image);
                processedImages.push(compressed);
            } catch (error) {
                console.error('Error processing image:', error);
                // Incluir imagen original si compresión falla
                processedImages.push(image);
            }
        }
        
        return processedImages;
    }

    /**
     * Comprimir imagen
     */
    async compressImage(imageBlob) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calcular dimensiones manteniendo proporción
                const maxWidth = 800;
                const maxHeight = 600;
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a blob con compresión
                canvas.toBlob(resolve, 'image/webp', this.config.compressionQuality);
            };
            
            img.src = URL.createObjectURL(imageBlob);
        });
    }

    /**
     * Procesar audio
     */
    async processAudio(audioBlob) {
        // Por ahora solo validar tamaño
        if (audioBlob.size > this.config.maxAudioSize) {
            throw new Error('Audio demasiado grande. Máximo 500KB permitido.');
        }
        
        return audioBlob;
    }

    /**
     * Generar ID único
     */
    generateId() {
        return 'seed_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    }

    /**
     * Convertir request a Promise
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Backup crítico en LocalStorage
     */
    backupToLocalStorage(key, data) {
        try {
            const backup = {
                data: data,
                timestamp: Date.now(),
                backup: true
            };
            localStorage.setItem(key, JSON.stringify(backup));
        } catch (error) {
            console.warn('Could not backup to localStorage:', error);
        }
    }

    /**
     * Aplicar filtros a resultados
     */
    applyFilters(seeds, filters) {
        let filtered = [...seeds];
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(seed => 
                seed.name.toLowerCase().includes(searchTerm) ||
                (seed.localName && seed.localName.toLowerCase().includes(searchTerm))
            );
        }
        
        if (filters.available) {
            filtered = filtered.filter(seed => 
                seed.metadata.status === 'available' && 
                seed.quantity > 0
            );
        }
        
        if (filters.sortBy) {
            filtered.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'newest':
                        return new Date(b.metadata.created) - new Date(a.metadata.created);
                    case 'name':
                        return a.name.localeCompare(b.name);
                    default:
                        return 0;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Fallback para obtener semillas desde LocalStorage
     */
    getSeedsFromLocalStorage(filters) {
        const seeds = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('seed_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.data) {
                        seeds.push(data.data);
                    }
                } catch (error) {
                    console.warn('Error parsing localStorage seed:', key);
                }
            }
        }
        
        return this.applyFilters(seeds, filters);
    }

    /**
     * Monitorear almacenamiento y limpiar si es necesario
     */
    setupStorageMonitoring() {
        // Verificar espacio de almacenamiento si está disponible
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                const usedMB = estimate.usage / (1024 * 1024);
                const quotaMB = estimate.quota / (1024 * 1024);
                
                console.log(`Storage used: ${usedMB.toFixed(2)}MB of ${quotaMB.toFixed(2)}MB`);
                
                if (usedMB > this.config.maxTotalStorage / (1024 * 1024)) {
                    this.performCleanup();
                }
            });
        }
    }

    /**
     * Limpiar datos antiguos si es necesario
     */
    async performCleanup() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.autoCleanupDays);
            
            const transaction = this.db.transaction(['seeds'], 'readwrite');
            const store = transaction.objectStore('seeds');
            const index = store.index('created');
            
            const oldSeeds = await this.promisifyRequest(
                index.getAll(IDBKeyRange.upperBound(cutoffDate.toISOString()))
            );
            
            for (const seed of oldSeeds) {
                if (seed.metadata && seed.metadata.status === 'completed') {
                    await this.promisifyRequest(store.delete(seed.id));
                    console.log('Cleaned up old seed:', seed.id);
                }
            }
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Inicializar storage global
window.tarpuStorage = new TarpuStorage();

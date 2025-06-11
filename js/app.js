/**
 * Aplicación Principal Tarpu Yachay
 * Sistema de intercambio de semillas para Chugchilán
 */

class TarpuYachayApp {
    constructor() {
        this.isLoading = true;
        this.currentScreen = 'welcome';
        this.wizard = null;
        
        // Referencias DOM
        this.loadingScreen = document.getElementById('loading');
        this.appContainer = document.getElementById('app');
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.formWizard = document.getElementById('form-wizard');
        
        this.init();
    }

    async init() {
        try {
            console.log('🌱 Iniciando Tarpu Yachay...');
            
            // Verificar compatibilidad del navegador
            this.checkBrowserCompatibility();
            
            // Inicializar PWA
            await this.initializePWA();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Simular carga de recursos
            await this.loadResources();
            
            // Inicializar storage
            await this.waitForStorage();
            
            // Mostrar aplicación
            this.showApp();
            
            console.log('✅ Tarpu Yachay iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showError('Error al cargar la aplicación');
        }
    }

    checkBrowserCompatibility() {
        const features = {
            indexedDB: 'indexedDB' in window,
            serviceWorker: 'serviceWorker' in navigator,
            mediaDevices: 'mediaDevices' in navigator,
            webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
            canvas: 'getContext' in document.createElement('canvas')
        };

        const missingFeatures = Object.entries(features)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);

        if (missingFeatures.length > 0) {
            console.warn('⚠️ Características no soportadas:', missingFeatures);
            
            if (missingFeatures.includes('indexedDB')) {
                console.warn('IndexedDB no disponible, usando solo LocalStorage');
            }
        }

        console.log('🔍 Compatibilidad del navegador:', features);
    }

    async initializePWA() {
        try {
            // Registrar Service Worker solo si NO estamos en file://
            if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('📱 Service Worker registrado:', registration);
                
                // Escuchar actualizaciones
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Nueva versión disponible');
                    this.showUpdateNotification();
                });
            } else if (window.location.protocol === 'file:') {
                console.log('📱 Service Worker omitido (protocolo file://)');
            }

            // Detectar instalación de PWA
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.showInstallButton();
            });

            // Detectar cuando se instala
            window.addEventListener('appinstalled', () => {
                console.log('📱 App instalada como PWA');
                this.hideInstallButton();
            });

        } catch (error) {
            console.warn('⚠️ PWA limitado:', error.message);
            // No es error crítico, la app funciona igual
        }
    }

    setupEventListeners() {
        // Botones principales
        const startButton = document.getElementById('start-button');
        const viewSeedsButton = document.getElementById('view-seeds-button');

        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startSeedRegistration();
            });
        }

        if (viewSeedsButton) {
            viewSeedsButton.addEventListener('click', () => {
                this.viewSeeds();
            });
        }

        // Detectar cambios de conectividad
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada');
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Sin conexión - modo offline');
            this.handleOffline();
        });

        // Manejo de errores globales
        window.addEventListener('error', (event) => {
            console.error('Error global:', event.error);
            this.logError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rechazada:', event.reason);
            this.logError(event.reason);
        });
    }

    async loadResources() {
        // Simular carga de recursos críticos
        const loadingMessages = [
            'Preparando interfaz...',
            'Cargando catálogo de semillas...',
            'Inicializando cámara...',
            'Configurando almacenamiento...',
            'Listo para usar!'
        ];

        for (let i = 0; i < loadingMessages.length; i++) {
            await this.updateLoadingMessage(loadingMessages[i]);
            await this.delay(500 + Math.random() * 500); // 500-1000ms por paso
        }
    }

    async updateLoadingMessage(message) {
        const loadingText = this.loadingScreen.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    async waitForStorage() {
        // Esperar a que el storage esté listo
        let attempts = 0;
        const maxAttempts = 10;

        while (!window.tarpuStorage?.db && attempts < maxAttempts) {
            await this.delay(100);
            attempts++;
        }

        if (!window.tarpuStorage?.db && attempts >= maxAttempts) {
            console.warn('⚠️ Storage no inicializado completamente');
        }
    }

    showApp() {
        // Ocultar loading
        this.loadingScreen.classList.add('hidden');
        
        // Mostrar app
        this.appContainer.classList.remove('hidden');
        
        // Marcar como cargado
        this.isLoading = false;
        
        // Añadir clase body para indicar que la app está lista
        document.body.classList.add('app-ready');
    }

    async startSeedRegistration() {
        try {
            console.log('🚀 Iniciando registro de semilla');
            
            // Ocultar pantalla de bienvenida
            this.welcomeScreen.classList.remove('active');
            
            // Mostrar wizard
            this.formWizard.classList.add('active');
            
            // Inicializar wizard si no existe
            if (!this.wizard) {
                this.wizard = new SeedRegistrationWizard();
            }
            
            // Cambiar pantalla actual
            this.currentScreen = 'wizard';
            
        } catch (error) {
            console.error('Error iniciando registro:', error);
            this.showError('Error al iniciar el registro de semilla');
        }
    }

    async viewSeeds() {
        try {
            console.log('👀 Mostrando semillas disponibles');
            
            // Por ahora mostrar mensaje
            this.showNotification('Función próximamente disponible', 'info', 'ℹ️');
            
            // TODO: Implementar vista de semillas
            
        } catch (error) {
            console.error('Error mostrando semillas:', error);
            this.showError('Error al cargar las semillas');
        }
    }

    handleOnline() {
        // Mostrar notificación de conexión
        this.showNotification('Conexión restaurada - sincronizando datos...', 'success', '🌐');
        
        // TODO: Implementar sincronización de datos
        setTimeout(() => {
            this.showNotification('Datos sincronizados correctamente', 'success', '✅');
        }, 2000);
    }

    handleOffline() {
        // Mostrar notificación de modo offline
        this.showNotification('Sin conexión - trabajando en modo offline', 'warning', '📴');
    }

    showInstallButton() {
        // Mostrar botón de instalación de PWA
        console.log('📱 PWA se puede instalar');
    }

    hideInstallButton() {
        // Ocultar botón de instalación
        console.log('📱 PWA instalada');
    }

    showUpdateNotification() {
        this.showNotification('Nueva versión disponible - reinicia la app', 'info', '🔄');
    }

    showError(message) {
        this.showNotification(message, 'error', '❌');
    }

    showNotification(message, type = 'info', icon = 'ℹ️') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-text">${message}</span>
                <button class="notification-dismiss">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
        
        // Event listener para cerrar manualmente
        notification.querySelector('.notification-dismiss').addEventListener('click', () => {
            notification.remove();
        });
    }

    logError(error) {
        // Log de errores para debugging
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.toString(),
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('📝 Error logged:', errorLog);
        
        // TODO: Enviar a servicio de logging cuando esté online
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.tarpuApp = new TarpuYachayApp();
});

// Prevenir zoom accidental en iOS
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

// Manejo de orientación para móviles
window.addEventListener('orientationchange', () => {
    // Pequeño delay para que se complete el cambio
    setTimeout(() => {
        // Trigger resize para reajustar elementos
        window.dispatchEvent(new Event('resize'));
    }, 100);
});
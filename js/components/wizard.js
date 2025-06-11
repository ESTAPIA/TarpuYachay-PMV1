/**
 * Wizard de registro de semillas - Optimizado para usuarios rurales
 * Manejo de 3 pasos con auto-guardado y navegación intuitiva
 */

class SeedRegistrationWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
        this.isDraft = false;
        
        // Referencias DOM
        this.wizardContainer = document.getElementById('form-wizard');
        this.stepsContainer = document.getElementById('form-steps');
        this.progressSteps = document.querySelectorAll('.progress-step');
        this.prevButton = document.getElementById('prev-button');
        this.nextButton = document.getElementById('next-button');
        
        // Configuración de pasos
        this.steps = {
            1: {
                title: 'Identificar Semilla',
                component: 'SeedIdentificationStep',
                validation: ['seedType', 'seedName']
            },
            2: {
                title: 'Tu Ubicación',
                component: 'LocationStep', 
                validation: ['sector', 'reference']
            },
            3: {
                title: 'Detalles del Intercambio',
                component: 'ExchangeDetailsStep',
                validation: ['quantity', 'exchangeType']
            }
        };
        
        this.init();
    }

    async init() {
        try {
            // Intentar cargar borrador existente
            await this.loadDraft();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Renderizar paso inicial
            await this.renderStep(this.currentStep);
            
            // Actualizar UI
            this.updateUI();
            
        } catch (error) {
            console.error('Error initializing wizard:', error);
            this.showError('Error al inicializar el formulario');
        }
    }

    setupEventListeners() {
        // Navegación
        this.prevButton.addEventListener('click', () => this.previousStep());
        this.nextButton.addEventListener('click', () => this.nextStep());
        
        // Auto-guardado cada 30 segundos
        setInterval(() => this.saveDraft(), 30000);
        
        // Guardado al salir de la página
        window.addEventListener('beforeunload', () => this.saveDraft());
        
        // Guardado al cambiar de visibilidad
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveDraft();
            }
        });
    }

    async loadDraft() {
        try {
            const draft = await window.tarpuStorage.getDraft();
            if (draft && draft.data) {
                this.formData = draft.data;
                this.currentStep = draft.currentStep || 1;
                this.isDraft = true;
                
                console.log('Draft loaded:', draft);
                this.showDraftNotification();
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }

    async saveDraft() {
        try {
            if (Object.keys(this.formData).length > 0) {
                await window.tarpuStorage.saveDraft(this.formData, this.currentStep);
                console.log('Draft saved automatically');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    }

    async renderStep(stepNumber) {
        const stepConfig = this.steps[stepNumber];
        if (!stepConfig) return;

        try {
            // Limpiar contenedor
            this.stepsContainer.innerHTML = '';
            
            // Crear instancia del componente del paso
            let stepComponent;
            switch (stepConfig.component) {
                case 'SeedIdentificationStep':
                    stepComponent = new SeedIdentificationStep(this.formData, this.onStepDataChange.bind(this));
                    break;
                case 'LocationStep':
                    stepComponent = new LocationStep(this.formData, this.onStepDataChange.bind(this));
                    break;
                case 'ExchangeDetailsStep':
                    stepComponent = new ExchangeDetailsStep(this.formData, this.onStepDataChange.bind(this));
                    break;
                default:
                    throw new Error(`Unknown step component: ${stepConfig.component}`);
            }
            
            // Renderizar componente
            const stepElement = await stepComponent.render();
            this.stepsContainer.appendChild(stepElement);
            
            // Activar el componente
            stepComponent.activate();
            
            // Guardar referencia al componente actual
            this.currentStepComponent = stepComponent;
            
            console.log(`Step ${stepNumber} rendered successfully`);
            
        } catch (error) {
            console.error(`Error rendering step ${stepNumber}:`, error);
            this.showError(`Error al cargar el paso ${stepNumber}`);
        }
    }

    onStepDataChange(data) {
        // Actualizar datos del formulario
        this.formData = { ...this.formData, ...data };
        
        // Validar paso actual
        this.validateCurrentStep();
        
        // Auto-guardar
        this.saveDraft();
        
        console.log('Form data updated:', this.formData);
    }

    validateCurrentStep() {
        const stepConfig = this.steps[this.currentStep];
        let isValid = false;
        
        switch (this.currentStep) {
            case 1:
                // Validar paso 1: tipo de semilla y nombre
                isValid = this.formData.seedType && 
                         (this.formData.seedType !== 'otros' || this.formData.customSeedName);
                break;
                
            case 2:
                // Validar paso 2: sector seleccionado
                isValid = this.formData.sector && 
                         (this.formData.sector !== 'otro' || this.formData.customSector);
                break;
                
            case 3:
                // Validar paso 3: cantidad, unidad y al menos un tipo de intercambio
                isValid = this.formData.quantity && 
                         this.formData.quantityUnit && 
                         this.formData.exchangeType && 
                         this.formData.exchangeType.length > 0;
                break;
                
            default:
                isValid = false;
        }
        
        // Actualizar estado del botón siguiente
        this.nextButton.disabled = !isValid;
        
        return isValid;
    }

    async nextStep() {
        if (!this.validateCurrentStep()) {
            this.showValidationError();
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            await this.renderStep(this.currentStep);
            this.updateUI();
            this.saveDraft();
        } else {
            // Último paso - enviar formulario
            await this.submitForm();
        }
    }

    async previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            await this.renderStep(this.currentStep);
            this.updateUI();
        }
    }

    updateUI() {
        // Actualizar indicador de progreso
        this.progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === this.currentStep);
            step.classList.toggle('completed', stepNumber < this.currentStep);
        });
        
        // Actualizar botones de navegación
        this.prevButton.disabled = this.currentStep === 1;
        this.nextButton.textContent = this.currentStep === this.totalSteps ? 'Registrar Semilla' : 'Siguiente →';
        
        // Actualizar título si existe
        const titleElement = document.querySelector('.step-title');
        if (titleElement) {
            titleElement.textContent = this.steps[this.currentStep].title;
        }
    }

    validateAllSteps() {
        const requiredFields = [
            'seedType',
            'seedName', 
            'sector',
            'quantity',
            'quantityUnit',
            'exchangeType'
        ];
        
        return requiredFields.every(field => {
            const value = this.formData[field];
            if (field === 'exchangeType') {
                return Array.isArray(value) && value.length > 0;
            }
            return value !== undefined && value !== null && value !== '';
        });
    }

    async submitForm() {
        try {
            this.showLoading('Registrando semilla...');
            
            // Validar todos los datos
            if (!this.validateAllSteps()) {
                throw new Error('Datos incompletos en el formulario');
            }
            
            // Preparar datos finales para guardar
            const finalSeedData = {
                ...this.formData,
                // Agregar metadata adicional
                metadata: {
                    ...this.formData.metadata,
                    status: 'available',
                    createdAt: new Date().toISOString(),
                    isComplete: true
                }
            };
            
            // Guardar semilla
            const savedSeed = await window.tarpuStorage.saveSeed(finalSeedData);
            
            // Limpiar borrador
            await window.tarpuStorage.clearDraft();
            
            // Mostrar éxito
            this.showSuccess('¡Semilla registrada exitosamente! 🌱');
            
            // Regresar a pantalla principal después de 3 segundos
            setTimeout(() => {
                this.returnToHome();
            }, 3000);
            
        } catch (error) {
            console.error('Error submitting form:', error);
            this.showError('Error al registrar la semilla: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // UI Helper Methods
    showDraftNotification() {
        const notification = document.createElement('div');
        notification.className = 'draft-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">💾</span>
                <span class="notification-text">Se encontró un borrador guardado</span>
                <button class="notification-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error', '❌');
    }

    showSuccess(message) {
        this.showNotification(message, 'success', '✅');
    }

    showValidationError() {
        this.showNotification('Por favor completa todos los campos requeridos', 'warning', '⚠️');
    }

    showNotification(message, type = 'info', icon = 'ℹ️') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    showLoading(message) {
        const loading = document.createElement('div');
        loading.id = 'form-loading';
        loading.className = 'form-loading';
        loading.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('form-loading');
        if (loading) {
            loading.remove();
        }
    }

    returnToHome() {
        // Ocultar wizard
        this.wizardContainer.classList.remove('active');
        
        // Mostrar pantalla principal
        const welcomeScreen = document.getElementById('welcome-screen');
        welcomeScreen.classList.add('active');
        
        // Reset wizard
        this.currentStep = 1;
        this.formData = {};
        this.isDraft = false;
    }
}

// Componente para el Paso 1: Identificación de Semillas
class SeedIdentificationStep {
    constructor(formData = {}, onDataChange) {
        this.formData = formData;
        this.onDataChange = onDataChange;
        this.selectedSeedType = formData.seedType || null;
        this.capturedImages = formData.images || [];
        this.recordedAudio = formData.audio || null;
        this.customSeedName = formData.customSeedName || '';
        
        // Catálogo de semillas comunes en Chugchilán
        this.seedCatalog = [
            {
                id: 'sara',
                name: 'Maíz',
                kichwaName: 'Sara',
                icon: '🌽',
                category: 'cereal',
                varieties: ['Amarillo', 'Blanco', 'Morado', 'Canguil'],
                description: 'Cereal principal de la región andina'
            },
            {
                id: 'purutu',
                name: 'Frijol',
                kichwaName: 'Purutu',
                icon: '🫘',
                category: 'legumbre',
                varieties: ['Negro', 'Rojo', 'Blanco', 'Pintado'],
                description: 'Legumbre rica en proteínas'
            },
            {
                id: 'papa',
                name: 'Papa',
                kichwaName: 'Papa',
                icon: '🥔',
                category: 'tubérculo',
                varieties: ['Chola', 'Leona', 'Uvilla', 'Bolona'],
                description: 'Tubérculo base de la alimentación andina'
            },
            {
                id: 'kinua',
                name: 'Quinua',
                kichwaName: 'Kinua',
                icon: '🌾',
                category: 'cereal',
                varieties: ['Blanca', 'Roja', 'Negra'],
                description: 'Superalimento andino rico en proteínas'
            },
            {
                id: 'sambu',
                name: 'Zambo',
                kichwaName: 'Sambu',
                icon: '🎃',
                category: 'cucurbitácea',
                varieties: ['Grande', 'Mediano', 'Para dulce'],
                description: 'Calabaza tradicional andina'
            },
            {
                id: 'otros',
                name: 'Otra Semilla',
                kichwaName: 'Shuj Muyu',
                icon: '🌿',
                category: 'otros',
                varieties: [],
                description: 'Otra variedad de semilla'
            }
        ];
    }

    async render() {
        const stepElement = document.createElement('div');
        stepElement.className = 'form-step seed-identification-step';
        
        stepElement.innerHTML = `
            <div class="step-header">
                <h2 class="step-title">
                    <span class="step-icon">🌱</span>
                    ¿Qué semilla tienes?
                </h2>
                <p class="step-description">
                    Selecciona el tipo de semilla o toma una foto para identificarla
                </p>
            </div>

            <div class="step-content">
                <!-- Selector Visual de Semillas -->
                <div class="seed-selector">
                    <h3 class="selector-title">Selecciona tu semilla:</h3>
                    <div class="seed-grid">
                        ${this.seedCatalog.map(seed => `
                            <button class="seed-card ${this.selectedSeedType === seed.id ? 'selected' : ''}" 
                                    data-seed-id="${seed.id}"
                                    type="button">
                                <div class="seed-icon">${seed.icon}</div>
                                <div class="seed-names">
                                    <div class="seed-name-spanish">${seed.name}</div>
                                    <div class="seed-name-kichwa">${seed.kichwaName}</div>
                                </div>
                                <div class="seed-category">${seed.category}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Nombre Personalizado (solo si es "otros") -->
                <div class="custom-name-section ${this.selectedSeedType === 'otros' ? 'visible' : 'hidden'}">
                    <label for="custom-seed-name" class="input-label">
                        <span class="label-icon">✍️</span>
                        ¿Cómo se llama tu semilla?
                    </label>
                    <input type="text" 
                           id="custom-seed-name" 
                           class="text-input"
                           placeholder="Ejemplo: Ataco, Chocho, Melloco..."
                           value="${this.customSeedName}"
                           maxlength="50">
                    <small class="input-help">
                        Puedes escribir en español o kichwa
                    </small>
                </div>

                <!-- Sección de Fotos -->
                <div class="photo-section">
                    <h3 class="section-title">
                        <span class="section-icon">📸</span>
                        Foto de tu semilla
                        <span class="optional-badge">Opcional</span>
                    </h3>
                    <p class="section-description">
                        Una foto ayuda a otros a reconocer tu semilla
                    </p>

                    <!-- Botón de Captura -->
                    <button type="button" class="photo-capture-btn" id="capture-photo-btn">
                        <span class="btn-icon">📷</span>
                        <span class="btn-text">Tomar Foto</span>
                    </button>

                    <!-- Galería de Fotos Capturadas -->
                    <div class="captured-photos ${this.capturedImages.length > 0 ? 'visible' : 'hidden'}">
                        <div class="photos-grid" id="photos-grid">
                            ${this.renderCapturedPhotos()}
                        </div>
                    </div>
                </div>

                <!-- Sección de Audio -->
                <div class="audio-section">
                    <h3 class="section-title">
                        <span class="section-icon">🎤</span>
                        Describe tu semilla
                        <span class="optional-badge">Opcional</span>
                    </h3>
                    <p class="section-description">
                        Graba un mensaje describiendo tu semilla (español o kichwa)
                    </p>

                    <!-- Controles de Audio -->
                    <div class="audio-controls">
                        <button type="button" class="audio-record-btn" id="audio-record-btn">
                            <span class="btn-icon">🎤</span>
                            <span class="btn-text">Grabar Mensaje</span>
                        </button>
                        
                        <!-- Player de Audio (si hay grabación) -->
                        <div class="audio-player ${this.recordedAudio ? 'visible' : 'hidden'}" id="audio-player">
                            <audio controls class="audio-element">
                                <!-- Source se agrega dinámicamente -->
                            </audio>
                            <button type="button" class="audio-delete-btn" id="audio-delete-btn">
                                <span class="btn-icon">🗑️</span>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return stepElement;
    }

    activate() {
        // Configurar event listeners después de que el elemento esté en el DOM
        this.setupEventListeners();
        
        // Restaurar estado si hay datos previos
        this.restoreState();
    }

    setupEventListeners() {
        // Selector de semillas
        const seedCards = document.querySelectorAll('.seed-card');
        seedCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const seedId = card.dataset.seedId;
                this.selectSeed(seedId);
            });
        });

        // Input de nombre personalizado
        const customNameInput = document.getElementById('custom-seed-name');
        if (customNameInput) {
            customNameInput.addEventListener('input', (e) => {
                this.customSeedName = e.target.value;
                this.updateFormData();
            });
        }

        // Captura de foto
        const captureBtn = document.getElementById('capture-photo-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                this.openCameraModal();
            });
        }

        // Grabación de audio
        const recordBtn = document.getElementById('audio-record-btn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.toggleAudioRecording();
            });
        }

        // Eliminar audio
        const deleteAudioBtn = document.getElementById('audio-delete-btn');
        if (deleteAudioBtn) {
            deleteAudioBtn.addEventListener('click', () => {
                this.deleteAudio();
            });
        }
    }

    selectSeed(seedId) {
        // Actualizar selección visual
        document.querySelectorAll('.seed-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.seedId === seedId);
        });

        // Actualizar estado
        this.selectedSeedType = seedId;
        
        // Mostrar/ocultar sección de nombre personalizado
        const customSection = document.querySelector('.custom-name-section');
        if (customSection) {
            customSection.classList.toggle('visible', seedId === 'otros');
            customSection.classList.toggle('hidden', seedId !== 'otros');
        }

        // Vibración táctil si está disponible
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        this.updateFormData();
    }

    renderCapturedPhotos() {
        return this.capturedImages.map((image, index) => `
            <div class="captured-photo">
                <img src="${URL.createObjectURL(image)}" alt="Semilla ${index + 1}" class="photo-thumbnail">
                <button type="button" class="photo-delete-btn" data-index="${index}">
                    <span class="btn-icon">❌</span>
                </button>
            </div>
        `).join('');
    }

    async openCameraModal() {
        // Por ahora mostrar alerta - implementaremos el modal después
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            // Crear modal de cámara
            this.createCameraModal(stream);
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }

    createCameraModal(stream) {
        const modal = document.getElementById('camera-modal');
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content camera-modal-content">
                    <div class="modal-header">
                        <h3>Tomar Foto de la Semilla</h3>
                        <button type="button" class="modal-close" id="close-camera">❌</button>
                    </div>
                    <div class="camera-container">
                        <video id="camera-video" autoplay playsinline></video>
                        <canvas id="camera-canvas" style="display: none;"></canvas>
                    </div>
                    <div class="camera-controls">
                        <button type="button" class="btn-secondary" id="cancel-photo">Cancelar</button>
                        <button type="button" class="btn-primary photo-snap-btn" id="snap-photo">
                            <span class="btn-icon">📷</span>
                            Capturar
                        </button>
                    </div>
                </div>
            </div>
        `;

        const video = modal.querySelector('#camera-video');
        video.srcObject = stream;

        // Event listeners del modal
        modal.querySelector('#close-camera').addEventListener('click', () => this.closeCameraModal(stream));
        modal.querySelector('#cancel-photo').addEventListener('click', () => this.closeCameraModal(stream));
        modal.querySelector('#snap-photo').addEventListener('click', () => this.capturePhoto(stream));

        modal.classList.remove('hidden');
    }

    capturePhoto(stream) {
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const ctx = canvas.getContext('2d');

        // Configurar canvas con dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Capturar frame actual
        ctx.drawImage(video, 0, 0);

        // Convertir a blob
        canvas.toBlob((blob) => {
            if (blob) {
                this.capturedImages.push(blob);
                this.updatePhotosDisplay();
                this.updateFormData();
                
                // Vibración de confirmación
                if ('vibrate' in navigator) {
                    navigator.vibrate([100, 50, 100]);
                }
            }
            
            this.closeCameraModal(stream);
        }, 'image/webp', 0.8);
    }

    closeCameraModal(stream) {
        // Detener stream
        stream.getTracks().forEach(track => track.stop());
        
        // Ocultar modal
        const modal = document.getElementById('camera-modal');
        modal.classList.add('hidden');
        modal.innerHTML = '';
    }

    updatePhotosDisplay() {
        const photosGrid = document.getElementById('photos-grid');
        const capturedPhotos = document.querySelector('.captured-photos');
        
        if (photosGrid) {
            photosGrid.innerHTML = this.renderCapturedPhotos();
            
            // Agregar listeners para eliminar fotos
            photosGrid.querySelectorAll('.photo-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(btn.dataset.index);
                    this.removePhoto(index);
                });
            });
        }
        
        if (capturedPhotos) {
            capturedPhotos.classList.toggle('visible', this.capturedImages.length > 0);
            capturedPhotos.classList.toggle('hidden', this.capturedImages.length === 0);
        }
    }

    removePhoto(index) {
        this.capturedImages.splice(index, 1);
        this.updatePhotosDisplay();
        this.updateFormData();
    }

    async toggleAudioRecording() {
        // Implementación básica de grabación de audio
        const recordBtn = document.getElementById('audio-record-btn');
        
        if (!this.isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.startRecording(stream, recordBtn);
            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('No se pudo acceder al micrófono. Verifica los permisos.');
            }
        } else {
            this.stopRecording(recordBtn);
        }
    }

    startRecording(stream, button) {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.isRecording = true;

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.recordedAudio = audioBlob;
            this.updateAudioPlayer();
            this.updateFormData();
            
            // Detener stream
            stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        
        // Actualizar UI
        button.innerHTML = `
            <span class="btn-icon recording">🔴</span>
            <span class="btn-text">Grabando... (Presiona para parar)</span>
        `;
        button.classList.add('recording');

        // Auto-parar después de 30 segundos
        setTimeout(() => {
            if (this.isRecording) {
                this.stopRecording(button);
            }
        }, 30000);
    }

    stopRecording(button) {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Restaurar UI
            button.innerHTML = `
                <span class="btn-icon">🎤</span>
                <span class="btn-text">Grabar Mensaje</span>
            `;
            button.classList.remove('recording');
        }
    }

    updateAudioPlayer() {
        const audioPlayer = document.getElementById('audio-player');
        const audioElement = audioPlayer.querySelector('.audio-element');
        
        if (this.recordedAudio) {
            audioElement.src = URL.createObjectURL(this.recordedAudio);
            audioPlayer.classList.remove('hidden');
            audioPlayer.classList.add('visible');
        }
    }

    deleteAudio() {
        this.recordedAudio = null;
        const audioPlayer = document.getElementById('audio-player');
        audioPlayer.classList.add('hidden');
        audioPlayer.classList.remove('visible');
        this.updateFormData();
    }

    restoreState() {
        // Restaurar selección de semilla
        if (this.selectedSeedType) {
            const seedCard = document.querySelector(`[data-seed-id="${this.selectedSeedType}"]`);
            if (seedCard) {
                seedCard.classList.add('selected');
            }
        }

        // Restaurar fotos
        if (this.capturedImages.length > 0) {
            this.updatePhotosDisplay();
        }

        // Restaurar audio
        if (this.recordedAudio) {
            this.updateAudioPlayer();
        }
    }

    updateFormData() {
        const updatedData = {
            seedType: this.selectedSeedType,
            customSeedName: this.customSeedName,
            images: this.capturedImages,
            audio: this.recordedAudio
        };

        // Determinar nombre final de la semilla
        if (this.selectedSeedType === 'otros' && this.customSeedName) {
            updatedData.seedName = this.customSeedName;
        } else if (this.selectedSeedType) {
            const seedInfo = this.seedCatalog.find(s => s.id === this.selectedSeedType);
            updatedData.seedName = seedInfo ? seedInfo.name : '';
        }

        this.onDataChange(updatedData);
    }
}

// Componente para el Paso 2: Ubicación Local
class LocationStep {
    constructor(formData = {}, onDataChange) {
        this.formData = formData;
        this.onDataChange = onDataChange;
        this.selectedSector = formData.sector || null;
        this.selectedReference = formData.reference || '';
        this.customReference = formData.customReference || '';
        this.coordinates = formData.coordinates || null;
        this.isGettingLocation = false;
        
        // Mapa detallado de sectores de Chugchilán
        this.chigchilanSectors = [
            {
                id: 'centro',
                name: 'Chugchilán Centro',
                description: 'Centro parroquial principal',
                households: 150,
                references: [
                    { id: 'plaza', name: 'Plaza Central', icon: '🏛️' },
                    { id: 'iglesia', name: 'Iglesia Matriz', icon: '⛪' },
                    { id: 'gad', name: 'GAD Parroquial', icon: '🏢' },
                    { id: 'escuela-centro', name: 'Escuela Central', icon: '🏫' },
                    { id: 'mercado', name: 'Mercado', icon: '🏪' },
                    { id: 'cancha-centro', name: 'Cancha Deportiva', icon: '⚽' }
                ]
            },
            {
                id: 'guangopud-alto',
                name: 'Guangopud Alto',
                description: 'Sector alto de Guangopud',
                households: 80,
                references: [
                    { id: 'escuela-guangopud', name: 'Escuela Guangopud', icon: '🏫' },
                    { id: 'casa-comunal-ga', name: 'Casa Comunal', icon: '🏘️' },
                    { id: 'tienda-maria', name: 'Tienda de María', icon: '🏪' },
                    { id: 'capilla-ga', name: 'Capilla', icon: '⛪' }
                ]
            },
            {
                id: 'guangopud-bajo',
                name: 'Guangopud Bajo',
                description: 'Sector bajo cerca del río',
                households: 60,
                references: [
                    { id: 'rio-toachi', name: 'Río Toachi', icon: '🌊' },
                    { id: 'puente-colgante', name: 'Puente Colgante', icon: '🌉' },
                    { id: 'molino-agua', name: 'Molino de Agua', icon: '⚙️' },
                    { id: 'cancha-gb', name: 'Cancha de Fútbol', icon: '⚽' }
                ]
            },
            {
                id: 'san-francisco',
                name: 'San Francisco',
                description: 'Comunidad San Francisco',
                households: 90,
                references: [
                    { id: 'capilla-sf', name: 'Capilla San Francisco', icon: '⛪' },
                    { id: 'cancha-sf', name: 'Cancha Deportiva', icon: '⚽' },
                    { id: 'escuela-sf', name: 'Escuela Comunitaria', icon: '🏫' },
                    { id: 'tienda-carlos', name: 'Tienda de Carlos', icon: '🏪' }
                ]
            },
            {
                id: 'cuatro-esquinas',
                name: 'Cuatro Esquinas',
                description: 'Cruce principal de caminos',
                households: 70,
                references: [
                    { id: 'cruce-principal', name: 'Cruce de Caminos', icon: '🛣️' },
                    { id: 'tienda-rosa', name: 'Tienda de Rosa', icon: '🏪' },
                    { id: 'parada-chiva', name: 'Parada de Chiva', icon: '🚌' },
                    { id: 'casa-comunal-ce', name: 'Casa Comunal', icon: '🏘️' }
                ]
            },
            {
                id: 'yuracasha',
                name: 'Yuracasha',
                description: 'Sector montañoso',
                households: 45,
                references: [
                    { id: 'mirador-yuracasha', name: 'Mirador Natural', icon: '🏔️' },
                    { id: 'capilla-yura', name: 'Capilla', icon: '⛪' },
                    { id: 'fuente-agua', name: 'Fuente de Agua', icon: '💧' }
                ]
            },
            {
                id: 'la-delicia',
                name: 'La Delicia',
                description: 'Sector agrícola',
                households: 55,
                references: [
                    { id: 'escuela-delicia', name: 'Escuela La Delicia', icon: '🏫' },
                    { id: 'cancha-delicia', name: 'Cancha Multiple', icon: '⚽' },
                    { id: 'casa-comunal-ld', name: 'Casa Comunal', icon: '🏘️' }
                ]
            },
            {
                id: 'sigchos-loma',
                name: 'Sigchos Loma',
                description: 'Sector límite con Sigchos',
                households: 40,
                references: [
                    { id: 'limite-sigchos', name: 'Límite Parroquial', icon: '🚧' },
                    { id: 'capilla-sl', name: 'Capilla', icon: '⛪' },
                    { id: 'cancha-sl', name: 'Cancha', icon: '⚽' }
                ]
            }
        ];
    }

    async render() {
        const stepElement = document.createElement('div');
        stepElement.className = 'form-step location-step';
        
        stepElement.innerHTML = `
            <div class="step-header">
                <h2 class="step-title">
                    <span class="step-icon">📍</span>
                    ¿Dónde te encuentras?
                </h2>
                <p class="step-description">
                    Selecciona tu sector en Chugchilán y una referencia conocida
                </p>
            </div>

            <div class="step-content">
                <!-- Selector de Sector -->
                <div class="sector-selector">
                    <h3 class="selector-title">Tu sector:</h3>
                    <div class="sectors-grid">
                        ${this.chigchilanSectors.map(sector => `
                            <button class="sector-card ${this.selectedSector === sector.id ? 'selected' : ''}" 
                                    data-sector-id="${sector.id}"
                                    type="button">
                                <div class="sector-header">
                                    <h4 class="sector-name">${sector.name}</h4>
                                    <span class="sector-households">${sector.households} familias</span>
                                </div>
                                <p class="sector-description">${sector.description}</p>
                            </button>
                        `).join('')}
                    </div>
                    
                    <!-- Opción para sector no listado -->
                    <button class="sector-card custom-sector ${this.selectedSector === 'otro' ? 'selected' : ''}" 
                            data-sector-id="otro"
                            type="button">
                        <div class="sector-header">
                            <h4 class="sector-name">Mi sector no está</h4>
                            <span class="sector-icon">➕</span>
                        </div>
                        <p class="sector-description">Agregar otro sector de Chugchilán</p>
                    </button>
                </div>

                <!-- Input para sector personalizado -->
                <div class="custom-sector-input ${this.selectedSector === 'otro' ? 'visible' : 'hidden'}">
                    <label for="custom-sector-name" class="input-label">
                        <span class="label-icon">📝</span>
                        ¿Cómo se llama tu sector?
                    </span>
                    <input type="text" 
                           id="custom-sector-name" 
                           class="text-input"
                           placeholder="Ejemplo: Shiry Huaycu, Rumipamba..."
                           value="${this.formData.customSector || ''}"
                           maxlength="50">
                </div>

                <!-- Referencias del Sector Seleccionado -->
                <div class="reference-selector ${this.selectedSector && this.selectedSector !== 'otro' ? 'visible' : 'hidden'}">
                    <h3 class="selector-title">¿Cerca de dónde?</h3>
                    <p class="selector-description">
                        Selecciona un lugar conocido para que otros te encuentren fácilmente
                    </p>
                    <div class="references-grid" id="references-grid">
                        <!-- Referencias se cargan dinámicamente -->
                    </div>
                    
                    <!-- Referencia personalizada -->
                    <div class="custom-reference-option">
                        <button type="button" class="custom-reference-btn ${this.selectedReference === 'custom' ? 'selected' : ''}" 
                                id="custom-reference-btn">
                            <span class="btn-icon">➕</span>
                            <span class="btn-text">Otra referencia</span>
                        </button>
                    </div>
                </div>

                <!-- Input para referencia personalizada -->
                <div class="custom-reference-input ${this.selectedReference === 'custom' ? 'visible' : 'hidden'}">
                    <label for="custom-reference-name" class="input-label">
                        <span class="label-icon">🏠</span>
                        Describe la ubicación:
                    </label>
                    <input type="text" 
                           id="custom-reference-name" 
                           class="text-input"
                           placeholder="Ejemplo: Casa de Don Pedro, Junto al eucalipto grande..."
                           value="${this.customReference}"
                           maxlength="100">
                    <small class="input-help">
                        Describe un lugar que la gente conozca en tu sector
                    </small>
                </div>

                <!-- Sección de GPS (Opcional) -->
                <div class="gps-section">
                    <h3 class="section-title">
                        <span class="section-icon">🛰️</span>
                        Ubicación GPS
                        <span class="optional-badge">Opcional</span>
                    </h3>
                    <p class="section-description">
                        Permite obtener tu ubicación exacta para intercambios más precisos
                    </p>

                    <div class="gps-controls">
                        <button type="button" class="gps-button" id="get-location-btn">
                            <span class="btn-icon">📍</span>
                            <span class="btn-text">Obtener Mi Ubicación</span>
                        </button>
                        
                        <!-- Información de ubicación obtenida -->
                        <div class="location-info ${this.coordinates ? 'visible' : 'hidden'}" id="location-info">
                            <div class="location-card">
                                <div class="location-icon">📍</div>
                                <div class="location-details">
                                    <p class="location-status">✅ Ubicación obtenida</p>
                                    <p class="location-accuracy" id="location-accuracy">
                                        Precisión: --
                                    </p>
                                </div>
                                <button type="button" class="location-clear-btn" id="clear-location-btn">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resumen de Ubicación -->
                <div class="location-summary ${this.selectedSector ? 'visible' : 'hidden'}" id="location-summary">
                    <h3 class="summary-title">📋 Resumen de tu ubicación:</h3>
                    <div class="summary-content">
                        <div class="summary-item">
                            <span class="summary-label">Sector:</span>
                            <span class="summary-value" id="summary-sector">--</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Referencia:</span>
                            <span class="summary-value" id="summary-reference">--</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">GPS:</span>
                            <span class="summary-value" id="summary-gps">No disponible</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return stepElement;
    }

    activate() {
        this.setupEventListeners();
        this.restoreState();
        this.updateReferencesGrid();
        this.updateSummary();
    }

    setupEventListeners() {
        // Selección de sectores
        const sectorCards = document.querySelectorAll('.sector-card');
        sectorCards.forEach(card => {
            card.addEventListener('click', () => {
                const sectorId = card.dataset.sectorId;
                this.selectSector(sectorId);
            });
        });

        // Input de sector personalizado
        const customSectorInput = document.getElementById('custom-sector-name');
        if (customSectorInput) {
            customSectorInput.addEventListener('input', (e) => {
                this.formData.customSector = e.target.value;
                this.updateFormData();
                this.updateSummary();
            });
        }

        // Botón de referencia personalizada
        const customRefBtn = document.getElementById('custom-reference-btn');
        if (customRefBtn) {
            customRefBtn.addEventListener('click', () => {
                this.selectReference('custom');
            });
        }

        // Input de referencia personalizada
        const customRefInput = document.getElementById('custom-reference-name');
        if (customRefInput) {
            customRefInput.addEventListener('input', (e) => {
                this.customReference = e.target.value;
                this.updateFormData();
                this.updateSummary();
            });
        }

        // GPS
        const getLocationBtn = document.getElementById('get-location-btn');
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }

        const clearLocationBtn = document.getElementById('clear-location-btn');
        if (clearLocationBtn) {
            clearLocationBtn.addEventListener('click', () => {
                this.clearLocation();
            });
        }
    }

    selectSector(sectorId) {
        // Actualizar selección visual
        document.querySelectorAll('.sector-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.sectorId === sectorId);
        });

        this.selectedSector = sectorId;

        // Mostrar/ocultar inputs personalizados
        this.toggleCustomSectorInput(sectorId === 'otro');
        this.toggleReferenceSelector(sectorId !== 'otro' && sectorId !== null);

        // Actualizar grid de referencias
        this.updateReferencesGrid();

        // Limpiar referencia anterior si cambia sector
        if (sectorId !== 'otro') {
            this.selectedReference = null;
            this.customReference = '';
        }

        // Vibración táctil
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        this.updateFormData();
        this.updateSummary();
    }

    selectReference(referenceId) {
        this.selectedReference = referenceId;

        // Actualizar selección visual en referencias
        document.querySelectorAll('.reference-card, .custom-reference-btn').forEach(element => {
            element.classList.remove('selected');
        });

        if (referenceId === 'custom') {
            document.getElementById('custom-reference-btn').classList.add('selected');
        } else {
            const referenceCard = document.querySelector(`[data-reference-id="${referenceId}"]`);
            if (referenceCard) {
                referenceCard.classList.add('selected');
            }
        }

        // Mostrar/ocultar input personalizado
        this.toggleCustomReferenceInput(referenceId === 'custom');

        // Vibración táctil
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        this.updateFormData();
        this.updateSummary();
    }

    updateReferencesGrid() {
        const referencesGrid = document.getElementById('references-grid');
        if (!referencesGrid || !this.selectedSector || this.selectedSector === 'otro') {
            return;
        }

        const selectedSectorData = this.chigchilanSectors.find(s => s.id === this.selectedSector);
        if (!selectedSectorData) return;

        referencesGrid.innerHTML = selectedSectorData.references.map(ref => `
            <button class="reference-card ${this.selectedReference === ref.id ? 'selected' : ''}" 
                    data-reference-id="${ref.id}"
                    type="button">
                <div class="reference-icon">${ref.icon}</div>
                <div class="reference-name">${ref.name}</div>
            </button>
        `).join('');

        // Agregar event listeners a las nuevas referencias
        referencesGrid.querySelectorAll('.reference-card').forEach(card => {
            card.addEventListener('click', () => {
                const refId = card.dataset.referenceId;
                this.selectReference(refId);
            });
        });
    }

    async getCurrentLocation() {
        const getLocationBtn = document.getElementById('get-location-btn');
        
        if (this.isGettingLocation) return;

        try {
            this.isGettingLocation = true;
            
            // Actualizar botón
            getLocationBtn.innerHTML = `
                <span class="btn-icon spinning">🔄</span>
                <span class="btn-text">Obteniendo ubicación...</span>
            `;
            getLocationBtn.disabled = true;

            const position = await this.getGeolocation();
            
            this.coordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
            };

            this.showLocationInfo();
            this.updateFormData();
            this.updateSummary();

            // Vibración de éxito
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }

        } catch (error) {
            console.error('Error obteniendo ubicación:', error);
            this.showLocationError(error.message);
        } finally {
            this.isGettingLocation = false;
            
            // Restaurar botón
            getLocationBtn.innerHTML = `
                <span class="btn-icon">📍</span>
                <span class="btn-text">Obtener Mi Ubicación</span>
            `;
            getLocationBtn.disabled = false;
        }
    }

    getGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            };

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }

    showLocationInfo() {
        const locationInfo = document.getElementById('location-info');
        const accuracyElement = document.getElementById('location-accuracy');
        
        if (locationInfo && this.coordinates) {
            locationInfo.classList.remove('hidden');
            locationInfo.classList.add('visible');
            
            if (accuracyElement) {
                const accuracy = Math.round(this.coordinates.accuracy);
                accuracyElement.textContent = `Precisión: ${accuracy} metros`;
            }
        }
    }

    showLocationError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification notification-warning';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">⚠️</span>
                <span class="notification-text">Error GPS: ${message}</span>
                <button class="notification-dismiss">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        notification.querySelector('.notification-dismiss').addEventListener('click', () => {
            notification.remove();
        });
    }

    clearLocation() {
        this.coordinates = null;
        
        const locationInfo = document.getElementById('location-info');
        if (locationInfo) {
            locationInfo.classList.add('hidden');
            locationInfo.classList.remove('visible');
        }
        
        this.updateFormData();
        this.updateSummary();
    }

    toggleCustomSectorInput(show) {
        const customSectorInput = document.querySelector('.custom-sector-input');
        if (customSectorInput) {
            customSectorInput.classList.toggle('visible', show);
            customSectorInput.classList.toggle('hidden', !show);
        }
    }

    toggleReferenceSelector(show) {
        const referenceSelector = document.querySelector('.reference-selector');
        if (referenceSelector) {
            referenceSelector.classList.toggle('visible', show);
            referenceSelector.classList.toggle('hidden', !show);
        }
    }

    toggleCustomReferenceInput(show) {
        const customReferenceInput = document.querySelector('.custom-reference-input');
        if (customReferenceInput) {
            customReferenceInput.classList.toggle('visible', show);
            customReferenceInput.classList.toggle('hidden', !show);
        }
    }

    updateSummary() {
        const locationSummary = document.getElementById('location-summary');
        const summaryElements = {
            sector: document.getElementById('summary-sector'),
            reference: document.getElementById('summary-reference'),
            gps: document.getElementById('summary-gps')
        };

        if (!locationSummary) return;

        // Mostrar resumen solo si hay sector seleccionado
        const shouldShow = this.selectedSector !== null;
        locationSummary.classList.toggle('visible', shouldShow);
        locationSummary.classList.toggle('hidden', !shouldShow);

        if (!shouldShow) return;

        // Actualizar sector
        if (summaryElements.sector) {
            if (this.selectedSector === 'otro') {
                summaryElements.sector.textContent = this.formData.customSector || 'Sector personalizado';
            } else {
                const sectorData = this.chigchilanSectors.find(s => s.id === this.selectedSector);
                summaryElements.sector.textContent = sectorData ? sectorData.name : '--';
            }
        }

        // Actualizar referencia
        if (summaryElements.reference) {
            if (this.selectedReference === 'custom') {
                summaryElements.reference.textContent = this.customReference || 'Referencia personalizada';
            } else if (this.selectedReference && this.selectedSector !== 'otro') {
                const sectorData = this.chigchilanSectors.find(s => s.id === this.selectedSector);
                const refData = sectorData?.references.find(r => r.id === this.selectedReference);
                summaryElements.reference.textContent = refData ? refData.name : '--';
            } else {
                summaryElements.reference.textContent = 'No especificada';
            }
        }

        // Actualizar GPS
        if (summaryElements.gps) {
            if (this.coordinates) {
                const accuracy = Math.round(this.coordinates.accuracy);
                summaryElements.gps.textContent = `Disponible (±${accuracy}m)`;
            } else {
                summaryElements.gps.textContent = 'No disponible';
            }
        }
    }

    restoreState() {
        // Restaurar sector seleccionado
        if (this.selectedSector) {
            const sectorCard = document.querySelector(`[data-sector-id="${this.selectedSector}"]`);
            if (sectorCard) {
                sectorCard.classList.add('selected');
            }
            
            this.toggleCustomSectorInput(this.selectedSector === 'otro');
            this.toggleReferenceSelector(this.selectedSector !== 'otro');
        }

        // Restaurar referencia seleccionada
        if (this.selectedReference) {
            this.toggleCustomReferenceInput(this.selectedReference === 'custom');
        }

        // Restaurar ubicación GPS
        if (this.coordinates) {
            this.showLocationInfo();
        }
    }

    updateFormData() {
        const updatedData = {
            sector: this.selectedSector,
            reference: this.selectedReference,
            customReference: this.customReference,
            coordinates: this.coordinates
        };

        // Agregar datos del sector personalizado si aplica
        if (this.selectedSector === 'otro') {
            updatedData.customSector = this.formData.customSector;
        }

        this.onDataChange(updatedData);
    }
}

// Componente para el Paso 3: Detalles del Intercambio
class ExchangeDetailsStep {
    constructor(formData = {}, onDataChange) {
        this.formData = formData;
        this.onDataChange = onDataChange;
        this.quantity = formData.quantity || '';
        this.quantityUnit = formData.quantityUnit || '';
        this.exchangeType = formData.exchangeType || [];
        this.acceptsMoney = formData.acceptsMoney || false;
        this.prefersLocal = formData.prefersLocal || true;
        this.description = formData.description || '';
        this.recordedDescription = formData.recordedDescription || null;
        
        // Unidades de medida comunes en Chugchilán
        this.measurementUnits = [
            { id: 'punados', name: 'Puñados', icon: '✋', description: 'Medida tradicional con la mano' },
            { id: 'granos', name: 'Granos sueltos', icon: '🌾', description: 'Semillas individuales' },
            { id: 'libras', name: 'Libras', icon: '⚖️', description: 'Medida en libras' },
            { id: 'kilos', name: 'Kilos', icon: '📏', description: 'Medida en kilogramos' },
            { id: 'mazorcas', name: 'Mazorcas', icon: '🌽', description: 'Para maíz completo' },
            { id: 'atados', name: 'Atados', icon: '🎋', description: 'Amarrados en manojos' },
            { id: 'tazas', name: 'Tazas', icon: '🥤', description: 'Medida casera' },
            { id: 'fundas', name: 'Fundas', icon: '🛍️', description: 'En bolsas pequeñas' }
        ];
        
        // Tipos de intercambio
        this.exchangeTypes = [
            { 
                id: 'semillas', 
                name: 'Otras semillas', 
                icon: '🌱', 
                description: 'Intercambio por otras variedades',
                popular: true 
            },
            { 
                id: 'ayuda-chakra', 
                name: 'Ayuda en la chakra', 
                icon: '🤝', 
                description: 'Trabajo colaborativo (minga)',
                popular: true 
            },
            { 
                id: 'regalo', 
                name: 'Solo regalo (yanakunakuy)', 
                icon: '❤️', 
                description: 'Compartir sin esperar nada',
                popular: true 
            },
            { 
                id: 'productos', 
                name: 'Productos caseros', 
                icon: '🥘', 
                description: 'Comida, artesanías, etc.' 
            },
            { 
                id: 'animales', 
                name: 'Animales pequeños', 
                icon: '🐓', 
                description: 'Cuyes, gallinas, etc.' 
            },
            { 
                id: 'dinero', 
                name: 'Dinero', 
                icon: '💰', 
                description: 'Pago en efectivo' 
            }
        ];
    }

    async render() {
        const stepElement = document.createElement('div');
        stepElement.className = 'form-step exchange-details-step';
        
        stepElement.innerHTML = `
            <div class="step-header">
                <h2 class="step-title">
                    <span class="step-icon">🤝</span>
                    Detalles del intercambio
                </h2>
                <p class="step-description">
                    Cuéntanos cuánto tienes y qué aceptas a cambio
                </p>
            </div>

            <div class="step-content">
                <!-- Cantidad Disponible -->
                <div class="quantity-section">
                    <h3 class="section-title">
                        <span class="section-icon">📊</span>
                        ¿Cuánto tienes disponible?
                    </h3>
                    
                    <div class="quantity-inputs">
                        <div class="quantity-amount">
                            <label for="quantity-input" class="input-label">
                                <span class="label-icon">🔢</span>
                                Cantidad:
                            </label>
                            <input type="number" 
                                   id="quantity-input" 
                                   class="number-input"
                                   placeholder="¿Cuánto?"
                                   value="${this.quantity}"
                                   min="0"
                                   step="0.5">
                        </div>
                        
                        <div class="quantity-unit">
                            <label class="input-label">
                                <span class="label-icon">📏</span>
                                Medida:
                            </label>
                            <div class="units-grid">
                                ${this.measurementUnits.map(unit => `
                                    <button class="unit-card ${this.quantityUnit === unit.id ? 'selected' : ''}" 
                                            data-unit-id="${unit.id}"
                                            type="button">
                                        <div class="unit-icon">${unit.icon}</div>
                                        <div class="unit-name">${unit.name}</div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Resumen de cantidad -->
                    <div class="quantity-summary ${this.quantity && this.quantityUnit ? 'visible' : 'hidden'}" id="quantity-summary">
                        <div class="summary-card">
                            <span class="summary-icon">📦</span>
                            <span class="summary-text" id="quantity-text">--</span>
                        </div>
                    </div>
                </div>

                <!-- Tipo de Intercambio -->
                <div class="exchange-type-section">
                    <h3 class="section-title">
                        <span class="section-icon">🔄</span>
                        ¿Qué aceptas a cambio?
                    </h3>
                    <p class="section-description">
                        Puedes seleccionar varias opciones
                    </p>
                    
                    <div class="exchange-types-grid">
                        ${this.exchangeTypes.map(type => `
                            <button class="exchange-type-card ${this.exchangeType.includes(type.id) ? 'selected' : ''} ${type.popular ? 'popular' : ''}" 
                                    data-type-id="${type.id}"
                                    type="button">
                                <div class="type-icon">${type.icon}</div>
                                <div class="type-info">
                                    <div class="type-name">${type.name}</div>
                                    <div class="type-description">${type.description}</div>
                                </div>
                                ${type.popular ? '<div class="popular-badge">Popular</div>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Preferencias Adicionales -->
                <div class="preferences-section">
                    <h3 class="section-title">
                        <span class="section-icon">⚙️</span>
                        Preferencias
                    </h3>
                    
                    <div class="preferences-options">
                        <label class="checkbox-option">
                            <input type="checkbox" 
                                   id="prefers-local" 
                                   ${this.prefersLocal ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            <div class="option-content">
                                <div class="option-title">
                                    <span class="option-icon">🏠</span>
                                    Prefiero gente de mi sector
                                </div>
                                <div class="option-description">
                                    Priorizar intercambios locales
                                </div>
                            </div>
                        </label>
                        
                        <label class="checkbox-option">
                            <input type="checkbox" 
                                   id="flexible-quantity" 
                                   ${this.formData.flexibleQuantity || false ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            <div class="option-content">
                                <div class="option-title">
                                    <span class="option-icon">🔄</span>
                                    Cantidad flexible
                                </div>
                                <div class="option-description">
                                    Puedo dar más o menos según la necesidad
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Descripción Adicional -->
                <div class="description-section">
                    <h3 class="section-title">
                        <span class="section-icon">💬</span>
                        Información adicional
                        <span class="optional-badge">Opcional</span>
                    </h3>
                    <p class="section-description">
                        Comparte detalles sobre tu semilla o condiciones especiales
                    </p>
                    
                    <!-- Opciones de descripción -->
                    <div class="description-options">
                        <button type="button" class="description-option-btn ${this.description ? 'active' : ''}" id="text-description-btn">
                            <span class="btn-icon">✍️</span>
                            <span class="btn-text">Escribir mensaje</span>
                        </button>
                        
                        <button type="button" class="description-option-btn ${this.recordedDescription ? 'active' : ''}" id="audio-description-btn">
                            <span class="btn-icon">🎤</span>
                            <span class="btn-text">Grabar mensaje</span>
                        </button>
                    </div>
                    
                    <!-- Área de texto -->
                    <div class="text-description ${this.description ? 'visible' : 'hidden'}" id="text-description">
                        <textarea id="description-textarea" 
                                  class="description-textarea"
                                  placeholder="Ejemplo: 'Estas semillas vienen de mi abuela, son muy resistentes al frío..'"
                                  maxlength="300">${this.description}</textarea>
                        <div class="textarea-counter">
                            <span id="char-counter">${this.description.length}</span>/300
                        </div>
                    </div>
                    
                    <!-- Grabación de audio -->
                    <div class="audio-description ${this.recordedDescription ? 'visible' : 'hidden'}" id="audio-description">
                        <div class="audio-controls">
                            <button type="button" class="audio-record-btn" id="description-record-btn">
                                <span class="btn-icon">🎤</span>
                                <span class="btn-text">Grabar descripción</span>
                            </button>
                            
                            <!-- Player de audio -->
                            <div class="audio-player ${this.recordedDescription ? 'visible' : 'hidden'}" id="description-audio-player">
                                <audio controls class="audio-element">
                                    <!-- Source se agrega dinámicamente -->
                                </audio>
                                <button type="button" class="audio-delete-btn" id="description-audio-delete">
                                    <span class="btn-icon">🗑️</span>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resumen Final -->
                <div class="final-summary">
                    <h3 class="summary-title">
                        <span class="summary-icon">📋</span>
                        Resumen del intercambio
                    </h3>
                    <div class="summary-content" id="final-summary-content">
                        <!-- Contenido se genera dinámicamente -->
                    </div>
                </div>
            </div>
        `;

        return stepElement;
    }

    activate() {
        this.setupEventListeners();
        this.restoreState();
        this.updateQuantitySummary();
        this.updateFinalSummary();
    }

    setupEventListeners() {
        // Input de cantidad
        const quantityInput = document.getElementById('quantity-input');
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => {
                this.quantity = e.target.value;
                this.updateQuantitySummary();
                this.updateFinalSummary();
                this.updateFormData();
            });
        }

        // Unidades de medida
        const unitCards = document.querySelectorAll('.unit-card');
        unitCards.forEach(card => {
            card.addEventListener('click', () => {
                const unitId = card.dataset.unitId;
                this.selectUnit(unitId);
            });
        });

        // Tipos de intercambio
        const exchangeTypeCards = document.querySelectorAll('.exchange-type-card');
        exchangeTypeCards.forEach(card => {
            card.addEventListener('click', () => {
                const typeId = card.dataset.typeId;
                this.toggleExchangeType(typeId);
            });
        });

        // Checkboxes de preferencias
        const prefersLocalCheckbox = document.getElementById('prefers-local');
        if (prefersLocalCheckbox) {
            prefersLocalCheckbox.addEventListener('change', (e) => {
                this.prefersLocal = e.target.checked;
                this.updateFormData();
            });
        }

        const flexibleQuantityCheckbox = document.getElementById('flexible-quantity');
        if (flexibleQuantityCheckbox) {
            flexibleQuantityCheckbox.addEventListener('change', (e) => {
                this.formData.flexibleQuantity = e.target.checked;
                this.updateFormData();
            });
        }

        // Botones de descripción
        const textDescriptionBtn = document.getElementById('text-description-btn');
        const audioDescriptionBtn = document.getElementById('audio-description-btn');
        
        if (textDescriptionBtn) {
            textDescriptionBtn.addEventListener('click', () => {
                this.toggleTextDescription();
            });
        }
        
        if (audioDescriptionBtn) {
            audioDescriptionBtn.addEventListener('click', () => {
                this.toggleAudioDescription();
            });
        }

        // Textarea de descripción
        const descriptionTextarea = document.getElementById('description-textarea');
        if (descriptionTextarea) {
            descriptionTextarea.addEventListener('input', (e) => {
                this.description = e.target.value;
                this.updateCharCounter();
                this.updateFinalSummary();
                this.updateFormData();
            });
        }

        // Grabación de audio de descripción
        const descriptionRecordBtn = document.getElementById('description-record-btn');
        if (descriptionRecordBtn) {
            descriptionRecordBtn.addEventListener('click', () => {
                this.toggleDescriptionRecording();
            });
        }

        const descriptionAudioDelete = document.getElementById('description-audio-delete');
        if (descriptionAudioDelete) {
            descriptionAudioDelete.addEventListener('click', () => {
                this.deleteDescriptionAudio();
            });
        }
    }

    selectUnit(unitId) {
        // Actualizar selección visual
        document.querySelectorAll('.unit-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.unitId === unitId);
        });

        this.quantityUnit = unitId;
        
        // Vibración táctil
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        this.updateQuantitySummary();
        this.updateFinalSummary();
        this.updateFormData();
    }

    toggleExchangeType(typeId) {
        const index = this.exchangeType.indexOf(typeId);
        
        if (index > -1) {
            // Remover si ya está seleccionado
            this.exchangeType.splice(index, 1);
        } else {
            // Agregar si no está seleccionado
            this.exchangeType.push(typeId);
        }

        // Actualizar selección visual
        const card = document.querySelector(`[data-type-id="${typeId}"]`);
        if (card) {
            card.classList.toggle('selected', this.exchangeType.includes(typeId));
        }

        // Vibración táctil
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        this.updateFinalSummary();
        this.updateFormData();
    }

    toggleTextDescription() {
        const textDescription = document.getElementById('text-description');
        const textBtn = document.getElementById('text-description-btn');
        const audioDescription = document.getElementById('audio-description');
        const audioBtn = document.getElementById('audio-description-btn');
        
        const isVisible = textDescription.classList.contains('visible');
        
        if (isVisible) {
            // Ocultar descripción de texto
            textDescription.classList.remove('visible');
            textDescription.classList.add('hidden');
            textBtn.classList.remove('active');
        } else {
            // Mostrar descripción de texto y ocultar audio
            textDescription.classList.remove('hidden');
            textDescription.classList.add('visible');
            textBtn.classList.add('active');
            
            audioDescription.classList.remove('visible');
            audioDescription.classList.add('hidden');
            audioBtn.classList.remove('active');
            
            // Focus en textarea
            const textarea = document.getElementById('description-textarea');
            if (textarea) {
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }

    toggleAudioDescription() {
        const audioDescription = document.getElementById('audio-description');
        const audioBtn = document.getElementById('audio-description-btn');
        const textDescription = document.getElementById('text-description');
        const textBtn = document.getElementById('text-description-btn');
        
        const isVisible = audioDescription.classList.contains('visible');
        
        if (isVisible) {
            // Ocultar descripción de audio
            audioDescription.classList.remove('visible');
            audioDescription.classList.add('hidden');
            audioBtn.classList.remove('active');
        } else {
            // Mostrar descripción de audio y ocultar texto
            audioDescription.classList.remove('hidden');
            audioDescription.classList.add('visible');
            audioBtn.classList.add('active');
            
            textDescription.classList.remove('visible');
            textDescription.classList.add('hidden');
            textBtn.classList.remove('active');
        }
    }

    async toggleDescriptionRecording() {
        const recordBtn = document.getElementById('description-record-btn');
        
        if (!this.isRecordingDescription) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.startDescriptionRecording(stream, recordBtn);
            } catch (error) {
                console.error('Error accessing microphone:', error);
                this.showError('No se pudo acceder al micrófono');
            }
        } else {
            this.stopDescriptionRecording(recordBtn);
        }
    }

    startDescriptionRecording(stream, button) {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.isRecordingDescription = true;

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.recordedDescription = audioBlob;
            this.updateDescriptionAudioPlayer();
            this.updateFinalSummary();
            this.updateFormData();
            
            stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        
        button.innerHTML = `
            <span class="btn-icon recording">🔴</span>
            <span class="btn-text">Grabando... (Toca para parar)</span>
        `;
        button.classList.add('recording');

        setTimeout(() => {
            if (this.isRecordingDescription) {
                this.stopDescriptionRecording(button);
            }
        }, 60000); // 1 minuto máximo
    }

    stopDescriptionRecording(button) {
        if (this.mediaRecorder && this.isRecordingDescription) {
            this.mediaRecorder.stop();
            this.isRecordingDescription = false;
            
            button.innerHTML = `
                <span class="btn-icon">🎤</span>
                <span class="btn-text">Grabar descripción</span>
            `;
            button.classList.remove('recording');
        }
    }

    updateDescriptionAudioPlayer() {
        const audioPlayer = document.getElementById('description-audio-player');
        const audioElement = audioPlayer.querySelector('.audio-element');
        
        if (this.recordedDescription) {
            audioElement.src = URL.createObjectURL(this.recordedDescription);
            audioPlayer.classList.remove('hidden');
            audioPlayer.classList.add('visible');
        }
    }

    deleteDescriptionAudio() {
        this.recordedDescription = null;
        const audioPlayer = document.getElementById('description-audio-player');
        audioPlayer.classList.add('hidden');
        audioPlayer.classList.remove('visible');
        this.updateFinalSummary();
        this.updateFormData();
    }

    updateQuantitySummary() {
        const quantitySummary = document.getElementById('quantity-summary');
        const quantityText = document.getElementById('quantity-text');
        
        if (this.quantity && this.quantityUnit) {
            const unitData = this.measurementUnits.find(u => u.id === this.quantityUnit);
            const unitName = unitData ? unitData.name : this.quantityUnit;
            
            quantityText.textContent = `${this.quantity} ${unitName}`;
            quantitySummary.classList.remove('hidden');
            quantitySummary.classList.add('visible');
        } else {
            quantitySummary.classList.add('hidden');
            quantitySummary.classList.remove('visible');
        }
    }

    updateCharCounter() {
        const counter = document.getElementById('char-counter');
        if (counter) {
            counter.textContent = this.description.length;
        }
    }

    updateFinalSummary() {
        const summaryContent = document.getElementById('final-summary-content');
        if (!summaryContent) return;

        let summaryHTML = '';

        // Información de la semilla (del paso anterior)
        if (this.formData.seedName) {
            summaryHTML += `
                <div class="summary-item">
                    <span class="summary-label">Semilla:</span>
                    <span class="summary-value">${this.formData.seedName}</span>
                </div>
            `;
        }

        // Cantidad
        if (this.quantity && this.quantityUnit) {
            const unitData = this.measurementUnits.find(u => u.id === this.quantityUnit);
            const unitName = unitData ? unitData.name : this.quantityUnit;
            summaryHTML += `
                <div class="summary-item">
                    <span class="summary-label">Cantidad:</span>
                    <span class="summary-value">${this.quantity} ${unitName.toLowerCase()}</span>
                </div>
            `;
        }

        // Tipos de intercambio
        if (this.exchangeType.length > 0) {
            const typeNames = this.exchangeType.map(typeId => {
                const typeData = this.exchangeTypes.find(t => t.id === typeId);
                return typeData ? typeData.name : typeId;
            }).join(', ');

            summaryHTML += `
                <div class="summary-item">
                    <span class="summary-label">Acepta:</span>
                    <span class="summary-value">${typeNames}</span>
                </div>
            `;
        }

        // Ubicación (del paso anterior)
        if (this.formData.sector) {
            let locationText = '';
            if (this.formData.sector === 'otro') {
                locationText = this.formData.customSector || 'Sector personalizado';
            } else {
                locationText = this.formData.sector;
            }

            summaryHTML += `
                <div class="summary-item">
                    <span class="summary-label">Ubicación:</span>
                    <span class="summary-value">${locationText}</span>
                </div>
            `;
        }



        // Descripción adicional
        if (this.description || this.recordedDescription) {
            const descType = this.description ? 'Texto escrito' : 'Audio grabado';
            summaryHTML += `
                <div class="summary-item">
                    <span class="summary-label">Descripción:</span>
                    <span class="summary-value">${descType}</span>
                </div>
            `;
        }

        summaryContent.innerHTML = summaryHTML || '<p class="no-summary">Completa la información arriba</p>';
    }

    restoreState() {
        // Restaurar cantidad
        if (this.quantity) {
            const quantityInput = document.getElementById('quantity-input');
            if (quantityInput) {
                quantityInput.value = this.quantity;
            }
        }

        // Restaurar unidad
        if (this.quantityUnit) {
            const unitCard = document.querySelector(`[data-unit-id="${this.quantityUnit}"]`);
            if (unitCard) {
                unitCard.classList.add('selected');
            }
        }

        // Restaurar tipos de intercambio
        this.exchangeType.forEach(typeId => {
            const typeCard = document.querySelector(`[data-type-id="${typeId}"]`);
            if (typeCard) {
                typeCard.classList.add('selected');
            }
        });

        // Restaurar descripción de texto
        if (this.description) {
            const textDescription = document.getElementById('text-description');
            const textBtn = document.getElementById('text-description-btn');
            if (textDescription && textBtn) {
                textDescription.classList.remove('hidden');
                textDescription.classList.add('visible');
                textBtn.classList.add('active');
            }
            this.updateCharCounter();
        }

        // Restaurar audio de descripción
        if (this.recordedDescription) {
            const audioDescription = document.getElementById('audio-description');
            const audioBtn = document.getElementById('audio-description-btn');
            if (audioDescription && audioBtn) {
                audioDescription.classList.remove('hidden');
                audioDescription.classList.add('visible');
                audioBtn.classList.add('active');
            }
            this.updateDescriptionAudioPlayer();
        }
    }

    updateFormData() {
        const updatedData = {
            quantity: this.quantity,
            quantityUnit: this.quantityUnit,
            exchangeType: this.exchangeType,
            acceptsMoney: this.exchangeType.includes('dinero'),
            prefersLocal: this.prefersLocal,
            description: this.description,
            recordedDescription: this.recordedDescription,
            flexibleQuantity: this.formData.flexibleQuantity || false
        };

        this.onDataChange(updatedData);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification notification-error';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">❌</span>
                <span class="notification-text">${message}</span>
                <button class="notification-dismiss">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
        
        notification.querySelector('.notification-dismiss').addEventListener('click', () => {
            notification.remove();
        });
    }
}

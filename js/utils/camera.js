/**
 * Utilidades para manejo de cámara con mejor error handling
 * Optimizado para PWA en HTTPS (GitHub Pages)
 */

class CameraManager {
    constructor() {
        this.stream = null;
        this.isSupported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    }

    async requestCameraPermission() {
        if (!this.isSupported) {
            throw new Error('Cámara no soportada en este dispositivo');
        }

        try {
            // Solicitar permisos específicos
            const constraints = {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'environment' // Cámara trasera preferida
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            return this.stream;

        } catch (error) {
            console.error('Error accediendo a cámara:', error);
            
            let errorMessage = 'No se pudo acceder a la cámara. ';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Permisos denegados. Permite el acceso a la cámara en la configuración del navegador.';
                    break;
                case 'NotFoundError':
                    errorMessage += 'No se encontró cámara en el dispositivo.';
                    break;
                case 'NotReadableError':
                    errorMessage += 'La cámara está siendo usada por otra aplicación.';
                    break;
                case 'SecurityError':
                    errorMessage += 'Acceso denegado por seguridad. Asegúrate de usar HTTPS.';
                    break;
                default:
                    errorMessage += `Error: ${error.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    async capturePhoto(videoElement) {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            context.drawImage(videoElement, 0, 0);
            
            // Convertir a blob optimizado
            return new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/webp', 0.8);
            });
            
        } catch (error) {
            console.error('Error capturando foto:', error);
            throw new Error('No se pudo capturar la foto');
        }
    }
}

// Instancia global
window.cameraManager = new CameraManager();

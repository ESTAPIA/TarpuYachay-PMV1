/**
 * Tarpu Yachay - Aplicación PWA para intercambio de semillas
 * Archivo principal de JavaScript
 */

// Variables globales
let seeds = [];
let filteredSeeds = [];  // para búsqueda en tiempo real
const STORAGE_KEY = 'tarpuYachaySeeds';
let isOnline = navigator.onLine;
let editingSeedId = null;  // ID en edición

// Monitores de conectividad
window.addEventListener('online', () => {
    isOnline = true;
    document.body.classList.remove('offline-mode');
    showConnectivityMessage('¡Conexión restablecida! 🌐', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    document.body.classList.add('offline-mode');
    showConnectivityMessage('Modo sin conexión. Los datos se guardarán localmente 📱', 'warning');
});

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 Tarpu Yachay iniciado correctamente');
    
    // Verificar conectividad inicial
    if (!isOnline) {
        document.body.classList.add('offline-mode');
        showConnectivityMessage('Modo sin conexión. Los datos se guardarán localmente 📱', 'warning');
    }
    
    // Inicializar la aplicación
    initApp();
    
    // Configurar botón de activación de teclado
    setupKeyboardTrigger();
    
    // Mejorar inputs para modo offline
    enhanceOfflineInputs();
    
    // Setup búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim().toLowerCase();
            filteredSeeds = seeds.filter(seed =>
                seed.name.toLowerCase().includes(term) ||
                seed.type.toLowerCase().includes(term) ||
                seed.owner.toLowerCase().includes(term)
            );
            displaySeeds();  // renderiza usando filteredSeeds si no está vacío
        });
    }

    // Setup filtros
    const filterType   = document.getElementById('filterType');
    const filterStatus = document.getElementById('filterStatus');

    if (filterType) {
      filterType.addEventListener('change', applyFilters);
    }
    if (filterStatus) {
      filterStatus.addEventListener('change', applyFilters);
    }
});

/**
 * Inicializa la aplicación
 */
async function initApp() {
  await loadSeeds();       // carga desde IndexedDB
  setupFormEvents();
  displaySeeds();
}

/**
 * Configura los eventos del formulario
 */
function setupFormEvents() {
    const form = document.getElementById('seedForm');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('📝 Formulario configurado');
    }
}

/**
 * Maneja el envío del formulario
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Obtener datos del formulario
    const formData = new FormData(event.target);
    const seedData = {
        name: formData.get('seedName'),
        type: formData.get('seedType'),
        owner: formData.get('ownerName'),
        location: formData.get('location') || 'No especificada',
        quantity: formData.get('quantity') || 'No especificada',
        description: formData.get('description') || 'Sin descripción',
        status: formData.get('status'),
        dateCreated: new Date().toLocaleDateString('es-EC')
    };
    
    // Validación básica
    if (!seedData.name || !seedData.type || !seedData.owner) {
        alert('Por favor completa todos los campos obligatorios (*)');
        return;
    }
    
    if (editingSeedId !== null) {
      await updateSeed(seedData);
      await loadSeeds();                          // <-- recargar desde DB
      document.querySelector('#seedForm button[type="submit"]').textContent = '💾 Guardar Semilla';
    } else {
      seedData.id = Date.now();
      await saveSeed(seedData);
    }
    
    // Limpiar formulario
    event.target.reset();
    
    // Mostrar mensaje de éxito
    showSuccessMessage('¡Semilla registrada exitosamente! 🎉');
    
    // Actualizar la lista de semillas
    displaySeeds();                                // <-- re-render sin F5
    console.log('🌱 Nueva semilla guardada:', seedData);
}

/**
 * Guarda una semilla en localStorage y actualiza el array
 */
async function saveSeed(seedData) {
    seeds.unshift(seedData);
    if (window.db?.addSeed) {
        await window.db.addSeed({ id: seedData.id, ...seedData });
        console.log('💾 Semilla guardada en IndexedDB');
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
        console.warn('⚠️ DB helper no disponible, guardado en localStorage');
    }
    filteredSeeds = [];
}

/**
 * Carga las semillas desde localStorage
 */
async function loadSeeds() {
    if (!window.db?.getAllSeeds) {
        console.error('❌ DB helper no disponible, fallback a localStorage');
        seeds = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        filteredSeeds = [];
        return;
    }
    seeds = await window.db.getAllSeeds();
    filteredSeeds = [];
    console.log('📦 Semillas cargadas desde IndexedDB:', seeds.length);
}

/**
 * Muestra las semillas en la interfaz
 */
function displaySeeds() {
    const container = document.getElementById('seedsList');
    
    if (!container) return;
    
    const list = (filteredSeeds.length || document.getElementById('searchInput').value)
      ? filteredSeeds
      : seeds;

    // Si no hay semillas, mostrar mensaje vacío
    if (list.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay semillas que coincidan.</p>';
        return;
    }
    
    // Generar HTML para todas las semillas
    const seedsHTML = list.map(seed => createSeedCard(seed)).join('');
    container.innerHTML = seedsHTML;
    
    console.log('🌾 Mostrando', seeds.length, 'semillas en la interfaz');
}

// Modificar createSeedCard para incluir botón de eliminación
function createSeedCard(seed) {
    const statusClass = seed.status === 'disponible' ? 'status-disponible' : 'status-no-disponible';
    const statusText  = seed.status === 'disponible' ? 'Disponible' : 'No disponible';

    return `
      <div class="seed-card" data-id="${seed.id}">
        <h3>
          <span role="img" aria-label="semilla">🌱</span>
          ${seed.name}
        </h3>
        <div class="seed-info">
            <p><strong>Tipo:</strong> ${capitalizeFirst(seed.type)}</p>
            <p><strong>Propietario:</strong> ${seed.owner}</p>
            <p><strong>Ubicación:</strong> ${seed.location}</p>
            <p><strong>Cantidad:</strong> ${seed.quantity}</p>
            <p><strong>Descripción:</strong> ${seed.description}</p>
            <p><strong>Registrado:</strong> ${seed.dateCreated}</p>
        </div>
        <span class="status-badge ${statusClass}" aria-label="${statusText}">
          ${statusText}
        </span>
        <button class="edit-btn"  data-id="${seed.id}" aria-label="Editar semilla">✏️</button>
        <button class="delete-btn" data-id="${seed.id}" aria-label="Eliminar semilla">🗑️</button>
      </div>
    `;
}

/**
 * Capitaliza la primera letra de una cadena
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Muestra un mensaje de éxito temporal
 */
function showSuccessMessage(message) {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
        animation: fadeIn 0.3s ease;
    `;
    messageDiv.textContent = message;
    
    // Agregar al DOM
    document.body.appendChild(messageDiv);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
    
    // ARIA-live announcement
    const live = document.getElementById('live-region');
    if (live) live.textContent = message;
}

/**
 * Muestra un mensaje sobre el estado de conectividad
 */
function showConnectivityMessage(message, type) {
    const messageDiv = document.createElement('div');
    const backgroundColor = type === 'success' ? '#4CAF50' : '#ff9800';
    
    messageDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
        animation: fadeIn 0.3s ease;
        max-width: 80%;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

/**
 * Configura el botón para forzar la activación del teclado
 */
function setupKeyboardTrigger() {
    const triggerBtn = document.getElementById('keyboardTrigger');
    
    if (triggerBtn) {
        triggerBtn.addEventListener('click', function() {
            // Crear un input temporal y enfocarlo
            const tempInput = document.createElement('input');
            tempInput.type = 'text';
            tempInput.style.position = 'absolute';
            tempInput.style.opacity = '0';
            tempInput.style.height = '0';
            tempInput.style.width = '0';
            
            document.body.appendChild(tempInput);
            tempInput.focus();
            
            // Limpiar después de 100ms
            setTimeout(() => {
                document.body.removeChild(tempInput);
                
                // Intenta enfocar el primer input del formulario
                const firstInput = document.getElementById('seedName');
                if (firstInput) {
                    firstInput.focus();
                    // Forzar la visualización del teclado
                    firstInput.click();
                }
            }, 100);
            
            console.log('🔤 Intentando activar teclado virtual');
        });
    }
    
    // Detectar cuando el teclado virtual está abierto
    window.addEventListener('resize', function() {
        if (window.innerHeight < window.outerHeight) {
            document.body.classList.add('keyboard-open');
        } else {
            document.body.classList.remove('keyboard-open');
        }
    });
}

// Detector de modo offline y ajustes para inputs
document.addEventListener('DOMContentLoaded', function() {
    // Mejorar inputs para modo offline
    enhanceOfflineInputs();
});

/**
 * Mejora la interacción con los inputs en modo offline
 */
function enhanceOfflineInputs() {
    // Crear botón de ayuda para inputs (siempre visible)
    const inputHelper = document.createElement('button');
    inputHelper.className = 'offline-input-helper';
    inputHelper.innerHTML = '⌨️';
    inputHelper.setAttribute('aria-label', 'Activar teclado');
    document.body.appendChild(inputHelper);
    
    // Añadir eventos a todos los inputs
    const allInputs = document.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
        // Al tocar un input, forzar el foco
        input.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            this.focus();
            if (this.tagName === 'SELECT') {
                this.click();
            }
        });
        
        // Asegurar que el teclado aparezca en móviles
        input.addEventListener('focus', function() {
            // Forzar scroll al elemento para evitar problemas con teclado virtual
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
    // Evento para el botón de ayuda
    inputHelper.addEventListener('click', function() {
        // Forzar foco en el primer input
        const firstInput = document.querySelector('input, textarea');
        if (firstInput) {
            firstInput.focus();
            // En algunos navegadores, necesitamos forzar la apertura del teclado
            if (navigator.userAgent.match(/Android/i)) {
                // Intento para Android
                firstInput.click();
            } else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
                // Intento para iOS
                firstInput.readOnly = false;
                firstInput.blur();
                firstInput.focus();
            }
        }
    });
}

// Registrar Service Worker para funcionalidad PWA (optimizado para debugging)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado correctamente:', registration.scope);
                
                // Debugging adicional
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Nueva versión del SW disponible');
                });
            })
            .catch((error) => {
                console.error('❌ Error al registrar Service Worker:', error);
            });
    });
}

// Nueva función para combinar búsqueda y filtros
function applyFilters() {
  const term   = document.getElementById('searchInput').value.trim().toLowerCase();
  const type   = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;

  filteredSeeds = seeds.filter(seed => {
    const matchesSearch = !term
      || seed.name.toLowerCase().includes(term)
      || seed.type.toLowerCase().includes(term)
      || seed.owner.toLowerCase().includes(term);

    const matchesType = !type || seed.type === type;
    const matchesStatus = !status || seed.status === status;

    return matchesSearch && matchesType && matchesStatus;
  });

  displaySeeds();
}

// Delegado para botones editar/borrar
document.getElementById('seedsList').addEventListener('click', function(e) {
  const id = Number(e.target.getAttribute('data-id'));
  if (e.target.classList.contains('delete-btn')) {
    deleteSeed(id);
  }
  if (e.target.classList.contains('edit-btn')) {
    populateForm(id);
  }
});

/**
 * Llena el formulario para edición
 */
function populateForm(id) {
  const seed = seeds.find(s => s.id === id);
  if (!seed) return;

  document.getElementById('seedName').value        = seed.name;
  document.getElementById('seedType').value        = seed.type;
  document.getElementById('ownerName').value       = seed.owner;
  document.getElementById('location').value        = seed.location;
  document.getElementById('quantity').value        = seed.quantity;
  document.getElementById('description').value     = seed.description;
  document.getElementById('status').value          = seed.status;

  editingSeedId = id;
  document.querySelector('#seedForm button[type="submit"]').textContent = '✏️ Actualizar';
}

/**
 * Actualiza semilla existente
 */
async function updateSeed(data) {
  const updated = { id: editingSeedId, ...data };
  if (window.db?.updateSeed) {
    await window.db.updateSeed(updated);
    console.log('✏️ Semilla actualizada en IndexedDB');
  } else {
    seeds = seeds.map(s => s.id === editingSeedId ? updated : s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
    console.warn('⚠️ DB helper no disponible, update en localStorage');
  }
  editingSeedId = null;
}

/**
 * Elimina una semilla
 */
async function deleteSeed(id) {
    if (window.db?.deleteSeed) {
        await window.db.deleteSeed(id);
        console.log('🗑️ Semilla eliminada de IndexedDB');
    } else {
        seeds = seeds.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
        console.warn('⚠️ DB helper no disponible, delete en localStorage');
    }
    
    await loadSeeds();    // <-- recargar desde IndexedDB o localStorage
    displaySeeds();       // <-- re-renderizar lista sin F5
}

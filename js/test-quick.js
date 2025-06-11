/**
 * Testing rápido para verificar funcionalidad básica
 * Ejecutar en DevTools Console
 */

// Test 1: Verificar que las clases existen
function testClassesExist() {
    console.log('🧪 Test 1: Verificando clases...');
    const tests = [
        { name: 'TarpuStorage', exists: typeof TarpuStorage !== 'undefined' },
        { name: 'TarpuYachayApp', exists: typeof TarpuYachayApp !== 'undefined' },
        { name: 'FormValidator', exists: typeof FormValidator !== 'undefined' }
    ];
    
    tests.forEach(test => {
        console.log(`${test.exists ? '✅' : '❌'} ${test.name}: ${test.exists ? 'OK' : 'FALTA'}`);
    });
}

// Test 2: Verificar storage
function testStorage() {
    console.log('🧪 Test 2: Verificando storage...');
    try {
        const hasIndexedDB = 'indexedDB' in window;
        const hasLocalStorage = 'localStorage' in window;
        console.log(`✅ IndexedDB: ${hasIndexedDB ? 'Disponible' : 'No disponible'}`);
        console.log(`✅ LocalStorage: ${hasLocalStorage ? 'Disponible' : 'No disponible'}`);
        return hasIndexedDB || hasLocalStorage;
    } catch (error) {
        console.error('❌ Error storage:', error);
        return false;
    }
}

// Test 3: Verificar PWA features
function testPWAFeatures() {
    console.log('🧪 Test 3: Verificando PWA...');
    const features = {
        serviceWorker: 'serviceWorker' in navigator,
        mediaDevices: 'mediaDevices' in navigator,
        geolocation: 'geolocation' in navigator,
        vibrate: 'vibrate' in navigator
    };
    
    Object.entries(features).forEach(([feature, available]) => {
        console.log(`${available ? '✅' : '⚠️'} ${feature}: ${available ? 'OK' : 'No disponible'}`);
    });
    
    return features;
}

// Test 4: Verificar formulario wizard
function testWizard() {
    console.log('🧪 Test 4: Verificando wizard...');
    try {
        const startButton = document.getElementById('start-button');
        const formWizard = document.getElementById('form-wizard');
        
        console.log(`${startButton ? '✅' : '❌'} Botón inicio: ${startButton ? 'Encontrado' : 'No encontrado'}`);
        console.log(`${formWizard ? '✅' : '❌'} Form wizard: ${formWizard ? 'Encontrado' : 'No encontrado'}`);
        
        return startButton && formWizard;
    } catch (error) {
        console.error('❌ Error wizard:', error);
        return false;
    }
}

// Ejecutar todos los tests
function runAllTests() {
    console.log('🚀 INICIANDO TESTS RÁPIDOS TARPU YACHAY...\n');
    
    testClassesExist();
    console.log('');
    
    const storageOK = testStorage();
    console.log('');
    
    const pwaFeatures = testPWAFeatures();
    console.log('');
    
    const wizardOK = testWizard();
    console.log('');
    
    // Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log(`Storage: ${storageOK ? '✅ OK' : '❌ FALLA'}`);
    console.log(`PWA básico: ${pwaFeatures.serviceWorker ? '✅ OK' : '⚠️ Limitado'}`);
    console.log(`Wizard: ${wizardOK ? '✅ OK' : '❌ FALLA'}`);
    
    if (storageOK && wizardOK) {
        console.log('\n🎉 TESTS BÁSICOS PASARON - App lista para demo!');
        console.log('🚀 Puedes proceder con la presentación');
        return true;
    } else {
        console.log('\n⚠️ ALGUNOS TESTS FALLARON - Revisar errores');
        return false;
    }
}

// Auto-ejecutar cuando esté listo
window.addEventListener('load', () => {
    setTimeout(runAllTests, 2000);
});

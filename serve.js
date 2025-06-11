/**
 * Servidor local simple para testing PWA con HTTPS
 * Para probar cámara y GPS en móviles
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Servir archivos estáticos
app.use(express.static('.'));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Para testing sin HTTPS (funciona en localhost)
app.listen(port, () => {
    console.log('🌱 Tarpu Yachay ejecutándose en:');
    console.log(`📱 Local: http://localhost:${port}`);
    console.log(`🌐 Red: http://[tu-ip]:${port}`);
    console.log('\n💡 Para cámara en móvil, usa la IP de red');
});

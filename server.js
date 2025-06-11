const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Servir archivos estáticos
app.use(express.static('.'));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log('🌱 TARPU YACHAY SERVER INICIADO');
    console.log('');
    console.log('📱 En tu computadora:');
    console.log(`   http://localhost:${port}`);
    console.log('');
    console.log('📱 En tu teléfono (usar esta IP):');
    
    // Detectar IP de la red
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`   http://${net.address}:${port}`);
            }
        }
    }
    
    console.log('');
    console.log('✅ Servidor listo para testing con cámara!');
});

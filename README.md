# 🌱 Tarpu Yachay

**Tarpu Yachay** es una PWA para intercambio comunitario de semillas nativas. Permite registro, búsqueda, filtrado, edición y eliminación de semillas, con almacenamiento en IndexedDB y funcionamiento offline.

## Características
- Registro de semillas (nombre, tipo, propietario, ubicación, cantidad, descripción, estado)
- Búsqueda en tiempo real
- Filtros por tipo y estado
- Edición y eliminación de registros
- Almacenamiento persistente en IndexedDB (fallback a localStorage)
- Offline-first con Service Worker
- Instalable como PWA (manifiesto, iconos, offline.html)

## Instalación y desarrollo
```bash
# Clonar repositorio
git clone https://github.com/ESTAPIA/TarpuYachay-PMV1.git

# Entrar en carpeta
cd tarpu-yachay

# Abrir con Live Server (VS Code) o servir con http-server:
npx http-server . -p 5500

# Abrir en el navegador
http://localhost:5500
```

## Despliegue en GitHub Pages
1. Confirma que tu repositorio tiene archivo `index.html` en la raíz.
2. En GitHub → Settings → Pages, selecciona rama `main` y carpeta `/ (root)`.
3. Guarda y espera la URL de publicación.

## Uso offline
1. Carga la app online al menos una vez.
2. Instálala desde el navegador (Add to Home Screen).
3. Activa Modo Avión y abre la PWA: seguirá funcionando con datos locales.

## Contribuciones
1. Haz fork del repo.
2. Crea tu rama (`git checkout -b feature/mi-cambio`).
3. Commit de tus cambios (`git commit -m "feat: descripción del cambio"`).
4. Push a tu rama (`git push origin feature/mi-cambio`).
5. Abre un Pull Request.

## Sitio en Producción

Ya puedes acceder a la PWA publicada en GitHub Pages:

https://ESTAPIA.github.io/TarpuYachay-PMV1/

*Recuerda que tardará unos minutos tras el primer push.*

---

© 2024 Proyecto Tarpu Yachay – Comunidad ESTAPIA.

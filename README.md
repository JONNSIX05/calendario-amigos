# Calendario de Disponibilidad para Amigos (DnD & Otros planes)

Aplicación web full-stack (**React + Vite** en el frontend y **Node.js + Express + SQLite** en el backend) pensada para coordinar días disponibles entre amigos, con pestañas separadas por roles, invitaciones de un solo uso e identidad visual personalizada.

## Características principales

- **Dos calendarios separados por pestañas y roles**:
  - `🎲 DnD` (activo por defecto, visible en modo lectura incluso sin iniciar sesión).
  - `✨ Otros planes` (visible y editable únicamente para usuarios autenticados con ese permiso).
- **Login oculto en menú desplegable**: la página principal es directamente el calendario; el acceso a **Iniciar sesión**, **Registrarse**, **Perfil** y **Panel Admin** está en el menú superior derecho.
- **Registro en 2 pasos con invitaciones de un solo uso**:
  - Primero se valida el código de invitación (sin revelar a qué calendarios da acceso).
  - Una vez validado, se abre la captura de datos donde cada amigo elige su **ícono** (16 íconos SVG predeterminados o subida segura de `.svg`/`.png`) y su **color de fondo** (paleta de 12 colores + selector libre).
  - Cada invitación se invalida automáticamente tras usarse una vez.
- **Panel Admin de Invitaciones y Roles**: genera enlaces de invitación (`/?invite=CODIGO`) eligiendo acceso a **DnD**, **Otros planes** o **Ambos**, y permite modificar roles de amigos ya registrados en cualquier momento.
- **Disponibilidad por día**: estados `Disponible` y `Quizás` + nota breve opcional (máx. 160 caracteres).
- **Sección inferior de "Mejores Días"**: ordena automáticamente primero los días donde **todos los miembros del calendario activo pueden** (`🎉 Todos pueden`), seguidos por mayor coincidencia.
- **UX/UI**: mapa de calor sutil en las celdas, modo **Marcado Rápido**, barra de amigos interactiva para filtrar subgrupos, indicador de quién falta por marcar en el mes, tooltips en PC y tema **Oscuro / Claro**.

---

## Stack tecnológico

- **Frontend**: React 18, Vite 6, Lucide Icons, CSS con variables de tema (Oscuro/Claro).
- **Backend**: Node.js 22+, Express 4, SQLite (`better-sqlite3`), JWT en cookies `httpOnly`, `bcryptjs`, `multer`.
- **Pruebas**: Suite de integración con `node:test`.

---

## Inicio rápido (Local)

### Requisitos
- **Node.js 20+** (recomendado Node.js 22 LTS) y **npm**.

### 1. Instalar dependencias
```bash
npm run install:all
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y personaliza `JWT_SECRET` y `ADMIN_SETUP_CODE`.

### 3. Ejecutar en desarrollo
```bash
npm run dev
```
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3001`

### 4. Crear tu cuenta Administrador
1. Abre `http://localhost:5173`.
2. Despliega **Menú → Registrarse**.
3. Ingresa el código configurado en `ADMIN_SETUP_CODE` (por defecto `ADMIN2026`).
4. Completa tus datos, ícono y color. Esa primera cuenta tendrá rol **Admin** con acceso a **DnD** y **Otros planes**.
5. Desde **Menú → Invitaciones y roles** genera enlaces de un solo uso para tus amigos.

---

## Scripts disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run install:all` | Instala dependencias en raíz, `server/` y `client/`. |
| `npm run dev` | Levanta el backend (`--watch`) y el frontend (Vite) en paralelo. |
| `npm run build` | Compila el frontend de producción en `client/dist/`. |
| `npm start` | Inicia el servidor unificado (sirve API + uploads + `client/dist/`). |
| `npm test` | Ejecuta las pruebas de integración del backend (`node --test`). |

---

## Estructura del proyecto

```text
Calendario/
├── package.json              # Scripts raíz
├── .env.example              # Plantilla de variables de entorno
├── .gitignore
├── docs/
│   └── API.md                # Referencia completa de endpoints REST
├── server/
│   ├── src/
│   │   ├── app.js            # Configuración Express, seguridad uploads y SPA
│   │   ├── index.js          # Arranque del servidor
│   │   ├── db.js             # Esquema SQLite (users, invites, availability)
│   │   ├── middleware/       # Autenticación JWT y guardias de rol
│   │   ├── routes/           # auth, profile, availability, admin
│   │   └── utils/            # Validación PNG y sanitización SVG
│   └── tests/api.test.js     # Pruebas de integración
└── client/
    └── src/
        ├── api/              # Cliente HTTP con cookies
        ├── components/       # Header, AuthDropdown, RegisterModal, CalendarGrid, BestDaysList, etc.
        ├── data/             # 16 íconos SVG predeterminados y paleta de colores
        ├── styles/           # CSS responsive con tema Oscuro/Claro
        └── utils/            # Utilidades de calendario y ranking de mejores días
```

---

## Seguridad incluida

- Contraseñas hasheadas con `bcryptjs`.
- Sesiones almacenadas en cookies `httpOnly` (`SameSite=Lax`, `Secure` configurable vía `COOKIE_SECURE=true`).
- Validación de subida de íconos (máx. 512 KB): verificación de cabecera mágica para `.png` y sanitización de `<script>`, manejadores `on*` y enlaces externos en `.svg`.
- Los íconos subidos se sirven con `X-Content-Type-Options: nosniff` y `Content-Security-Policy: default-src 'none'; sandbox`.

---

## Documentación adicional

- [Referencia de la API REST](docs/API.md)

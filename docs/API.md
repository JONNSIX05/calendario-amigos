# Referencia de la API REST

Todas las rutas responden en JSON. La autenticación utiliza una cookie `httpOnly` llamada `cal_session` (enviada automáticamente con `credentials: 'include'`).

---

## Autenticación (`/api/auth`)

### `GET /api/auth/status`
Indica si la aplicación necesita configuración inicial (no existe ningún usuario registrado todavía).
- **Respuesta `200`**: `{ "needsSetup": true | false }`

### `GET /api/auth/me`
Devuelve el usuario autenticado actual o `null` si no hay sesión activa.
- **Respuesta `200`**: `{ "user": User | null }`

### `GET /api/auth/invite/:code`
Valida si un código de invitación está activo y no ha sido usado (no expone roles ni permisos).
- **Respuesta `200`**: `{ "valid": true }`
- **Respuesta `404`**: `{ "valid": false, "error": "..." }`

### `POST /api/auth/register`
Registra un nuevo usuario consumiendo el código de invitación de un solo uso (o creando el Admin inicial con `ADMIN_SETUP_CODE`).
- **Body**:
  ```json
  {
    "username": "alex_dnd",
    "displayName": "Alex",
    "password": "miPassword123",
    "inviteCode": "CODIGO10CH",
    "iconValue": "d20",
    "iconBgColor": "#6366f1"
  }
  ```
- **Respuesta `201`**: `{ "user": User }` + cookie `cal_session`.
- **Errores**: `400` (validación), `403` (código inválido/usado), `409` (usuario duplicado).

### `POST /api/auth/login`
Inicia sesión con usuario y contraseña.
- **Body**: `{ "username": "...", "password": "..." }`
- **Respuesta `200`**: `{ "user": User }` + cookie `cal_session`.

### `POST /api/auth/logout`
Cierra la sesión y elimina la cookie `cal_session`.
- **Respuesta `200`**: `{ "ok": true }`

---

## Perfil e Íconos (`/api/profile`)

Requiere sesión autenticada (`401` si no hay sesión).

### `PATCH /api/profile`
Actualiza nombre visible, color de fondo del ícono y/o ícono predeterminado.
- **Body** (campos opcionales):
  ```json
  {
    "displayName": "Alex M.",
    "iconBgColor": "#ec4899",
    "iconType": "preset",
    "iconValue": "wizard"
  }
  ```
- **Respuesta `200`**: `{ "user": User }`

### `POST /api/profile/icon`
Sube un ícono personalizado en formato `.svg` o `.png` (máx. 512 KB).
- **Content-Type**: `multipart/form-data` con campo `icon`.
- **Respuesta `200`**: `{ "user": User }` (con `icon_type: "upload"` e `icon_value: "/uploads/icons/..."`).

---

## Disponibilidad (`/api/availability`)

### `GET /api/availability?month=YYYY-MM&calendar=dnd|plans`
Obtiene la lista de amigos con acceso al calendario solicitado y sus registros del mes.
- **`calendar=dnd`**: público en modo lectura sin login (o requiere `can_dnd` si hay sesión).
- **`calendar=plans`**: requiere sesión (`401`) y permiso `can_plans` o `is_admin` (`403`).
- **Respuesta `200`**:
  ```json
  {
    "calendar": "dnd",
    "month": "2026-11",
    "users": [{ "id": 1, "username": "...", "display_name": "...", "icon_type": "preset", "icon_value": "d20", "icon_bg_color": "#6366f1" }],
    "entries": [{ "id": 10, "user_id": 1, "calendar_type": "dnd", "date": "2026-11-28", "status": "available", "note": "Llevo dados" }]
  }
  ```

### `PUT /api/availability/:date`
Crea o actualiza la disponibilidad del usuario autenticado para la fecha `YYYY-MM-DD`.
- **Body**:
  ```json
  {
    "calendar": "dnd",
    "status": "available",
    "note": "Libre después de las 7pm"
  }
  ```
- **Valores válidos de `status`**: `"available"` | `"maybe"`.
- **Respuesta `200`**: `{ "entry": Entry }`

### `DELETE /api/availability/:date?calendar=dnd|plans`
Elimina la disponibilidad del usuario autenticado en esa fecha y calendario.
- **Respuesta `200`**: `{ "ok": true }`

---

## Administración (`/api/admin`)

Todas las rutas requieren `is_admin = true` (`403` en caso contrario).

### `GET /api/admin/invites`
Lista todas las invitaciones creadas y su estado (`uses_count`, `active`, permisos).

### `POST /api/admin/invites`
Genera un código de invitación **de un solo uso** (`max_uses = 1`).
- **Body**:
  ```json
  {
    "label": "Para Sofía",
    "can_dnd": true,
    "can_plans": false
  }
  ```
- **Respuesta `201`**: `{ "invite": Invite }`

### `DELETE /api/admin/invites/:id`
Elimina/revoca una invitación.

### `GET /api/admin/users`
Lista todos los usuarios registrados y sus roles.

### `PATCH /api/admin/users/:id/roles`
Actualiza los permisos de acceso de un usuario existente.
- **Body**: `{ "can_dnd": true, "can_plans": true }`
- **Respuesta `200`**: `{ "user": User }`

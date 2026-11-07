# demoIA · Poroteo Legislativo · Frontend

Interfaz de **demoIA**, el prototipo de Poroteo Legislativo de [Democracia en Red](https://democraciaenred.org), desarrollado en el programa _Hola Mundo Profesional_ (HMP).

Permite explorar la Cámara de Diputados (composición, diputados, votaciones históricas) y hacer un **poroteo manual**: estimar banca por banca cómo votaría cada diputado un proyecto de ley y ver en vivo si hay quórum y si se aprueba. Más adelante la estimación la va a hacer una IA.

Cada persona tiene su **cuenta** (email + contraseña) y sus poroteos comienzan privados y pueden compartirse con miembros o publicarse. La exploración de la Cámara es pública.

> Backend: [Agente-BackEnd-Legislativo](https://github.com/zozodei/Agente-BackEnd-Legislativo). El front **solo** habla con esa API, nunca con Supabase directo.

## Stack

- React 19 + Vite 6 + TypeScript (strict)
- React Router 7 · TanStack Query 5 · Recharts
- CSS Modules + tokens de diseño en variables CSS (modo claro / oscuro)
- Tipografías self-hosted con Fontsource: Newsreader, Public Sans, IBM Plex Mono
- Vitest + Testing Library · ESLint 9 + Prettier

## Instalación

```bash
git clone https://github.com/zozodei/Agente-FrontEnd-Legislativo.git
cd Agente-FrontEnd-Legislativo
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Necesitás el backend corriendo en `http://localhost:4000` (en desarrollo, Vite hace proxy de `/api`).

## Variables de entorno

| Variable             | Descripción                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_URL`       | URL del backend en producción, sin barra final. Vacía en desarrollo (se usa el proxy). |
| `VITE_DEV_API_PROXY` | Destino del proxy de `/api` en desarrollo (default `http://localhost:4000`).           |

Todo lo que empieza con `VITE_` queda visible en el navegador: **nunca** poner claves acá.

## Scripts

| Script              | Qué hace                           |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Servidor de desarrollo             |
| `npm run build`     | Chequeo de tipos + build a `dist/` |
| `npm run preview`   | Sirve el build                     |
| `npm test`          | Tests (Vitest)                     |
| `npm run lint`      | ESLint                             |
| `npm run typecheck` | Solo TypeScript                    |
| `npm run format`    | Prettier                           |

## Pantallas

| Ruta                 | Pantalla                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| `/`                  | Portada: qué es demoIA, cómo funciona, hemiciclo en vivo, hoja de ruta         |
| `/camara`            | Panel general: hemiciclo por bloques, números de la Cámara, últimas votaciones |
| `/login`             | Iniciar sesión                                                                 |
| `/registro`          | Crear cuenta (con aviso si hay que confirmar el email)                         |
| `/diputados`         | Buscador y grilla/lista con filtros por bloque y provincia                     |
| `/diputados/:id`     | Perfil: datos, mandato, estadísticas, gráficos, trayectoria e historial        |
| `/votaciones`        | Leyes votadas con búsqueda y filtros                                           |
| `/votaciones/:id`    | Detalle: resultado, hemiciclo por voto, resumen por bloque, quién votó qué     |
| `/poroteos` 🔒       | Mis poroteos                                                                   |
| `/poroteos/nuevo` 🔒 | Cargar un proyecto (título, descripción, texto o PDF)                          |
| `/poroteos/:id` 🔒   | Editor del poroteo con contador en vivo                                        |

🔒 = requiere sesión (sin sesión redirige a `/login?redirect=…`).

## Autenticación

- El backend expone `/api/auth/{registro,login,refresh,logout,me}`; el front nunca habla con Supabase.
- La sesión (`accessToken`, `refreshToken`, `expiresAt`) se guarda en `localStorage` (`poroteo.sesion`).
- `src/api/client.ts` agrega `Authorization: Bearer …` a cada request, renueva el token antes de que venza y, ante un `401`, hace **un solo** refresh compartido por todas las requests que fallaron juntas. Si el refresh falla, limpia la sesión y emite `auth:logout`.
- `AuthProvider` / `useAuth()` (`src/features/auth`) exponen `{ usuario, estado, login, registrar, logout }` y sincronizan la sesión entre pestañas.

## Estructura

```
src/
  api/          cliente HTTP, funciones por recurso, query keys
  components/   ui/ (botones, badges, campos, estados), hemiciclo/, layout/
  features/     auth/, dashboard/, diputados/, votaciones/, poroteo/ (queries + componentes propios)
  pages/        una por ruta (lazy)
  hooks/        hooks genéricos (tema, debounce, filtros en la URL)
  types/        tipos compartidos (= DTOs del backend)
  styles/       tokens.css, global.css, palette.ts (colores de datos)
  utils/        formato de números/fechas, texto
```

Más detalle en [`CLAUDE.md`](CLAUDE.md).

## Fuente de los datos

Votaciones de [¿Cómo Votó?](https://comovoto.dev.ar), de Rodrigo Quiroga ([repo](https://github.com/rquiroga7/Como_voto)). La fuente se cita en el pie de todas las páginas.

Foto de portada: “Atardecer en el Congreso de la Nación Argentina”, de Miguel César ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Atardecer_en_el_Congreso_de_la_Naci%C3%B3n_Argentina.jpg), CC BY-SA 3.0). El crédito se muestra en la portada.

## Backoffice y roles de aplicación

El perfil del backend devuelve `rol: 'usuario' | 'superadmin'`. La configuración
`SUPERADMIN_EMAILS` vive solo en el backend, no en variables `VITE_`. El frontend
nunca decide el rol por email ni por metadata de Supabase: consume el perfil
verificado y el backend autoriza cada consulta administrativa.

| Ruta                       | Pantalla                                                    | Acceso     |
| -------------------------- | ----------------------------------------------------------- | ---------- |
| `/backoffice`              | Métricas disponibles                                        | superadmin |
| `/backoffice/cuentas`      | Cuentas paginadas (ID, email, registro, último acceso, rol) | superadmin |
| `/backoffice/poroteos`     | Búsqueda y listado paginado                                 | superadmin |
| `/backoffice/poroteos/:id` | Texto, resultado y votos sin edición                        | superadmin |

Después del login un superadmin va a `/backoffice`; un usuario conserva el destino
habitual. La misma decisión se usa en registro si hay sesión y al ingresar luego
de confirmar el correo. No existe una redirección global: el superadmin puede
volver a `/poroteos`, Cámara y demás pantallas. El backoffice permite volver y
cerrar sesión; no tiene operaciones de escritura.

`RutaProtegida` espera el perfil actual de `/auth/me`; nunca usa el rol guardado
como permiso. `AuthProvider` incorpora el estado `error` con reintento y conserva
el token si falla esa verificación, pero no abre rutas privadas. La revisión de
sesión evita que una respuesta antigua restaure la cuenta después de logout.
`RutaSuperadmin` se monta para `/backoffice` y todas las hijas y vuelve a consultar
el perfil en cada ruta y al recuperar foco: anónimo a login, usuario a acceso
denegado, superadmin al contenido. `/api/admin` valida nuevamente la identidad y
los permisos en el backend. Ocultar un enlace no constituye autorización.

Las consultas están en `features/backoffice/queries.ts`, las llamadas de solo
lectura en `api/admin.ts` y sus claves bajo `queryKeys.adminAll`. Se borran al
entrar/salir o cambiar de cuenta. La interfaz utiliza CSS Modules, tokens y estados
existentes, con grilla adaptable y tablas con desplazamiento propio en celular.

Para habilitar las cuentas, ver `docs/backoffice.md` y `docs/autenticacion.md` del
repositorio backend. No crear tabla `usuarios` ni configurar permisos desde el
navegador. No se modificó el esquema, no se crearon cuentas ni se enviaron correos.
El usuario configura manualmente Email/Confirm email/SMTP y registra y confirma
las tres direcciones permitidas antes de iniciar sesión.

Las rutas privadas autorizan por membresía. user_id conserva al creador y no concede acceso. Dueños y colaboradores aparecen en Mis poroteos. Solo dueños publican, gestionan participantes y eliminan. El backoffice sigue siendo de consulta.

Las claves de poroteos incluyen el ID del perfil verificado para separar cachés,
sin enviar ese ID como prueba de autorización. No se reutilizan filas anteriores
como placeholder. Cambiar de cuenta o salir cancela consultas y borra datos y
mutaciones privadas, también entre pestañas. Mientras se verifica la nueva sesión
no se muestra contenido privado. Las respuestas pendientes no repueblan la caché
de otra cuenta ni reintentan escrituras usando su token. Un refresh antiguo no
restaura una sesión cerrada ni reemplaza otra cuenta.

Pruebas automatizadas nuevas en `src/features/auth/privacidad.test.tsx`: dos
identidades, cambio por storage, logout pendiente, mutaciones tardías, refresh
pendiente y protección ante reintentos con identidad nueva. Se conservan los
estados de carga, vacío, sesión vencida y 404, además de redirecciones por rol.
Modelo, migración local no aplicada y pruebas manuales pendientes en
`Agente-BackEnd-Legislativo/docs/poroteos-privados.md`. No se modificó Supabase remoto.

Pruebas administrativas en features/backoffice/backoffice.test.tsx; el backoffice mantiene consulta global sin edición.

## Poroteos colaborativos y públicos

/poroteos incluye los proyectos donde el perfil es dueño o colaborador. El editor
consume permisos efectivos del backend y muestra rol y visibilidad. Incluye edición
de título, descripción y texto, votos, participantes por email registrado, roles,
salida, publicación y confirmación de borrado. No se crean cuentas ni invitaciones.

/poroteos-publicos y /poroteos-publicos/:id son vistas anónimas de solo lectura.
Las respuestas se piden con cache: no-store, sin token ni refresh. TanStack usa
staleTime: 0 y gcTime: 0 para estas consultas; el detalle revalida cada 15 segundos,
al volver y al recuperar foco. Un 404 posterior oculta inmediatamente el contenido.
Lo ya visto por otra persona no puede retirarse de sus copias. No hay caché persistida.

Toda escritura lleva la version leída. Ante 409 se conserva el borrador y no hay
reintento automático. Recargar requiere una decisión explícita; se pueden copiar los
campos y revisar los votos antes de descartarlos. La versión base no se adopta de
refetches silenciosos. Contenido y votos se guardan mediante acciones independientes
de la RPC atómica; si se editan ambos, guardar cada sección avanza la versión propia.
Los participantes usan claves privadas bajo poroteos/usuario y se eliminan con la
caché de la cuenta al cerrar sesión o cambiar de identidad, incluidas otras pestañas.

Contrato backend: docs/poroteos-colaborativos.md en Agente-BackEnd-Legislativo.
Pruebas nuevas: features/poroteo/colaboracion.test.tsx y privacidad.test.tsx.
No se implementó Google, no se modificó Supabase remoto ni se realizó deploy.

Verificación visual local: Chrome headless con datos simulados para editor, detalle público y galería, a 360 y 1440 px en ambos temas; 12 combinaciones sin desbordes ni errores de renderizado.

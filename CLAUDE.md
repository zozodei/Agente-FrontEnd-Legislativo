# CLAUDE.md · Frontend de demoIA (Poroteo Legislativo)

Guía para cualquier agente o persona que trabaje en este repo. Leela completa antes de tocar código. **Mantenela actualizada** en el mismo PR en que cambies rutas, componentes centrales, tokens o convenciones.

---

## 1. Contexto

- **Quiénes:** equipo de estudiantes del programa _Hola Mundo Profesional_ (HMP), haciendo una práctica en la ONG **Democracia en Red**.
- **Objetivo final:** subir un proyecto de ley y que una IA haga el **poroteo**: estimar qué votaría cada legislador del Congreso de la Nación Argentina y cuál sería el resultado.
- **Nombre del producto:** **demoIA** (democracia + IA). Wordmark en `components/layout/Brand.tsx`.
- **Etapa actual:** prototipo de **poroteo manual** (sin IA), **solo Cámara de Diputados** (257 bancas, quórum 129). Sirve para validar estética, funcionalidad y experiencia con la ONG.
- **Este repo no es descartable:** se usa hasta el final (IA + Senado).
- **Backend:** repo `Agente-BackEnd-Legislativo` (Node + Express). Su `CLAUDE.md` documenta la base de datos y la API completa.

## 2. Stack y arquitectura

React 19 + Vite 6 + TypeScript strict. React Router 7 (data router), TanStack Query 5, Recharts, CSS Modules.

```
Navegador  →  backend (/api/...)  →  Supabase
                    ↑
       Las fotos son la excepción: se cargan directo con su foto_url pública (Storage).
       La foto de portada se carga de Wikimedia Commons (ver LandingPage.tsx, con crédito).
```

```
src/
  main.tsx            fuentes + estilos globales + <App/>
  App.tsx             QueryClient (staleTime 60s, sin reintentos en 4xx)
  router.tsx          rutas; cada página es lazy()
  api/
    client.ts         request<T>() + ApiError + errorMessage() + fieldErrors(). ÚNICO lugar que
                      hace fetch. Agrega el Bearer token y maneja el refresh (ver §5 bis).
    session.ts        sesión en localStorage (poroteo.sesion / poroteo.usuario), LOGOUT_EVENT
    resources.ts      authApi, diputadosApi, votacionesApi, statsApi, poroteosApi, catalogosApi
    queryKeys.ts      claves de TanStack Query centralizadas
  types/index.ts      tipos = DTOs del backend (camelCase). Si cambia la API, cambiá esto.
  styles/
    tokens.css        ÚNICA fuente de colores, tipografía, espaciado, movimiento (claro + oscuro)
    global.css        reset + base
    palette.ts        colores de datos para JS: VOTO_COLOR, bloqueStyle(), COALICION_COLOR
  components/
    hemiciclo/        <Hemiciclo/>, <Leyenda/>, layout.ts (geometría pura), types.ts (Banca)
    layout/           AppLayout (franja, encabezado, nav, pie noche, tema; recibe `cuenta` como
                      slot), Brand (BrandMark + Wordmark "demoIA")
    ui/               Avatar, Button/ButtonLink (variantes inverse/outlineInverse para fondo
                      noche), Badges (Voto, Resultado, Bloque), Fields (SearchInput, TextField,
                      SelectField, Checkbox, Segmented), Pagination, States (Skeleton, Spinner,
                      EmptyState, ErrorState con `mensaje`), Typography (Kicker, SectionHeader,
                      Stat, PageHeader), VoteBar
  features/
    auth/                       AuthProvider + context + useAuth, RutaProtegida, validacion.ts
                                (validaciones, mensajes de error, destinoSeguro), google.ts
                                (parseo del callback de Google), components/ AuthShell,
                                CuentaMenu (zona de sesión del encabezado), GoogleButton
    dashboard/queries.ts        useResumen
    diputados/                  queries (useDiputados, useDiputado, useVotosDiputado, diputadoToBanca)
                                components/ DiputadoCard, HistorialVotos, PerfilCharts
    votaciones/                 queries (useVotaciones, useVotacion), components/ VotacionRow, VotosTabla
    poroteo/                    queries (CRUD + mutaciones), resultado.ts (cálculo en vivo),
                                usePoroteoEditor.ts (estado local + deshacer), components/
                                ResultadoPanel, BloqueAcciones, ListaVotos
  pages/              una por ruta: LandingPage, CamaraPage, DiputadosPage, DiputadoPage,
                      VotacionesPage, VotacionPage, LoginPage, RegistroPage, AuthCallbackPage,
                      PoroteosPage, NuevoPoroteoPage, PoroteoPage, NotFoundPage
  hooks/              useTheme, useDebouncedValue, useDocumentTitle, useSearchParamState
  utils/              format.ts (números/fechas es-AR), text.ts (normalize, titleCase, nombreLegible)
```

**Regla de dependencias:** `pages → features → components/ui, api, hooks, utils`. Los componentes de `components/` no importan de `features/` ni de `pages/` (por eso `AppLayout` recibe la zona de cuenta como prop `cuenta` desde `router.tsx`).

## 3. Rutas

| Ruta                 | Página           | Datos                                                                                                              |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`                  | LandingPage      | Portada a todo el ancho (`handle.bleed`). `useDiputados` + `useResumen`                                            |
| `/camara`            | CamaraPage       | `useDiputados` (hemiciclo) + `useResumen`                                                                          |
| `/login`             | LoginPage        | `useAuth().login` + botón de Google (`iniciarGoogle`). Respeta `?redirect=` (solo rutas internas: `destinoSeguro`) |
| `/registro`          | RegistroPage     | `useAuth().registrar` + botón de Google. Si `requiereConfirmacion` → pantalla "revisá tu email"                    |
| `/auth/callback`     | AuthCallbackPage | Vuelta de Google: parsea el hash, guarda la sesión, valida con `/auth/me` y redirige (pública, `bleed`)            |
| `/diputados`         | DiputadosPage    | `useDiputados` (los 257, filtrado en memoria; filtros en la URL)                                                   |
| `/diputados/:id`     | DiputadoPage     | `useDiputado` + `useVotosDiputado` (paginado en servidor)                                                          |
| `/votaciones`        | VotacionesPage   | `useVotaciones` (paginado y filtrado en servidor; filtros en la URL)                                               |
| `/votaciones/:id`    | VotacionPage     | `useVotacion`                                                                                                      |
| `/poroteos` 🔒       | PoroteosPage     | `usePoroteos` ("Mis poroteos": incluye membresías como dueño o colaborador)                                        |
| `/poroteos/nuevo` 🔒 | NuevoPoroteoPage | `useCrearPoroteo` (JSON o multipart con PDF). Acepta `location.state.titulo` para precargar                        |
| `/poroteos/:id` 🔒   | PoroteoPage      | `usePoroteo` + `useDiputados`; guarda con `useGuardarVotos` (modo `replace`). 404 = "No existe o no tenés acceso"  |

🔒 = dentro de `<RutaProtegida/>`: sin sesión → `/login?redirect=<ruta>` (reenvía `location.state` como `state.desde`).

## 4. El hemiciclo (`components/hemiciclo`)

La pieza visual más importante. Props principales:

```tsx
<Hemiciclo
  bancas={Banca[]}            // { id, nombre, bloque, provincia, fotoUrl, voto?, href?, orden? }
  modo="bloques" | "votacion" | "poroteo"
  ariaLabel="…"               // resumen accesible obligatorio
  resaltadas={Set<id> | null} // atenúa el resto (filtros)
  onBancaClick / onBancaPaint // solo modo poroteo (click y arrastre con mouse)
  centro={<ReactNode/>}       // contenido en el centro del arco
/>
```

- `layout.ts` (pura, testeada): filas concéntricas, bancas proporcionales al radio, ordenadas por ángulo. `rowsFor(257) = 10`, `rowsFor(72) = 5` (listo para el Senado).
- Las bancas se ordenan por `bloqueStyle(bloque).orden` (izquierda → derecha, ver `palette.ts`) y luego por `orden`/nombre. Así cada bloque es una porción del arco.
- Color: modo `bloques` → color del bloque; `votacion`/`poroteo` → `VOTO_COLOR`. Sin voto = punteado.
- Tooltip con foto, nombre, bloque, provincia (y voto). En táctil, el primer toque fija la ficha con link "Ver perfil".
- Accesibilidad: el SVG es `role="img"` con `ariaLabel`; en el poroteo la **vista Lista** es la alternativa navegable con teclado.

## 5. Poroteo manual

- `usePoroteoEditor(poroteo, tipoMayoria)`: estado local `Map<diputadoId, voto>`, deshacer (50 pasos), `dirty`, `resumen` en vivo. Se monta con `key={poroteo.id}`.
- Diputado sin voto en el mapa = **sin asignar** (no se guarda fila). `INDEFINIDO` explícito casi no se usa en la UI manual (el botón "?" limpia).
- `features/poroteo/resultado.ts` es **copia exacta** de `backend/src/services/resultado.js`. Si cambiás una, cambiá la otra y sus tests (`resultado.test.ts` y `backend/tests/resultado.test.js` tienen los mismos casos).
- Reglas: quórum 129 presentes (afirm + neg + abst). `simple`: afirm > neg. `absoluta`: afirm ≥ 129. `dos_tercios`: afirm ≥ ⌈2/3 presentes⌉. Mejor/peor caso con los votos en disputa → `definido`.
- UX: pincel (teclas 1–5), click/arrastre en bancas, acciones por bloque, "Sin asignar → Ausente", deshacer (Ctrl+Z), guardar (Ctrl+S), aviso al salir con cambios sin guardar (`useBlocker` + `beforeunload`).

## 5 bis. Autenticación

- Endpoints del backend: `POST /auth/registro`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/google`, `POST /auth/google/id-token`. **El editor `/poroteos` exige token**; la consulta `/poroteos-publicos` es anónima; diputados, votaciones, bloques, distritos y stats son públicos. En poroteos, `404` también significa "es de otra persona".
- **Google (redirect):** `GoogleButton` (Login/Registro) → `useAuth().iniciarGoogle(destino)` pide `GET /auth/google?redirectTo=<origen>/auth/callback` y devuelve la URL; el botón navega con `window.location.href`. El destino post-login viaja en `sessionStorage` (`auth.google.redirect`), no en la URL. `/auth/callback` (pública) parsea el hash con `parseCallbackGoogle()` (`features/auth/google.ts`), limpia el hash de la URL con `history.replaceState`, guarda la sesión con `entrarConTokens()` (valida con `/auth/me`) y redirige al destino o a `/`. Errores de Google (`error`/`error_description`, en hash o query) se muestran con `mensajeErrorGoogle()`. `loginGoogleConIdToken()` queda listo para One Tap. Sin Supabase en el front, nunca.
- Sesión en `localStorage` (`poroteo.sesion`) + copia del usuario (`poroteo.usuario`, solo presentación; nunca habilita rutas ni roles). `expiresAt` viene en **segundos**.
- `request()` en `api/client.ts`:
  - agrega `Authorization: Bearer` si hay sesión (opción `anonimo: true` para login/registro: ni token ni refresh, ahí un 401 es "credenciales incorrectas");
  - si quedan < 60 s, renueva antes de mandar;
  - ante 401 con token: si otra request ya renovó, reintenta con el token nuevo; si no, `refrescarSesion()`. **Una sola promesa de refresh en vuelo** (cada refreshToken sirve una vez);
  - refresh rechazado → `limpiarSesion()` + evento `auth:logout` en `window`. Sin red → no cierra la sesión.
- `AuthProvider` (en `App.tsx`, dentro del QueryClientProvider): estado `'cargando' | 'autenticado' | 'anonimo' | 'error'`; verifica con `/auth/me` al arrancar; escucha `auth:logout` y `storage` (otras pestañas). Al entrar/salir borra de la caché las queries de `poroteos` (son privadas).
- Mensajes de error de cuenta: `authErrorMessage()`; errores por campo (`BAD_REQUEST`): `fieldErrors()` (`body.email` → `email`).
- Nunca loguear tokens, nunca mandarlos en la URL, nunca guardar la contraseña.

## 6. Dirección visual (no negociable)

**Editorial / cívica**, tipo medio de datos periodístico. **No debe parecer hecho por IA.**

- ❌ Nada de gradientes violetas, glassmorphism, tarjetas iguales con emojis, sombras gigantes, bordes redondeados grandes, estética de template SaaS. No usar Inter.
- ✅ Papel cálido (`--paper`) + tinta (`--ink`). Reglas horizontales (`border-top: 2px solid var(--rule-strong-color)`) para separar secciones, como en un diario.
- ✅ Tipografía: **Newsreader** (titulares, números grandes, `--font-display`), **Public Sans** (cuerpo, `--font-body`), **IBM Plex Mono** (kickers, fechas, etiquetas de datos, `--font-mono`). Cifras con `className="num"` (tabular).
- ✅ Color fuerte **solo para datos** (votos y bloques). La UI es monocroma con `--accent` (azul patrio) para links y foco.
- ✅ **Identidad patria** (marca, nunca datos): `--celeste`, `--sol` (sol de mayo), `--noche` (azul noche) y `--franja` (celeste-blanco-celeste). Se usan en: la franja del encabezado y del pie, el pie noche, la portada, el panel de login/registro, el trazo celeste + sol arriba de cada `PageHeader` y el "IA" del wordmark. Sobre fondo noche, redefinir `--celeste-ink: var(--celeste)` y usar los botones `inverse` / `outlineInverse`.
- ✅ Lo "tecnológico" se expresa con mono, retícula fina (líneas celeste al 7–10 %) y el cursor de la tarjeta de ejemplo: **sin** neón, glow ni gradientes violetas.
- ✅ Todo color/espaciado sale de `styles/tokens.css`. **No hardcodear hex en componentes** (excepción: `palette.ts`).
- ✅ Modo oscuro: tokens redefinidos en `tokens.css` (sistema o forzado con `data-theme`). Probá siempre los dos.
- ✅ Movimiento sutil: `--dur-*` y `--ease-out`; respetan `prefers-reduced-motion`.
- Paleta de votos validada para daltonismo (protan/deutan ΔE ≥ 7) con el voto siempre también como texto. "Ausente" es gris a propósito.

Estados: toda vista con datos tiene **skeleton** (carga), **EmptyState** (vacío) y **ErrorState** con reintentar (error).

## 7. Seguridad: reglas que no se rompen

- El front **nunca** habla con Supabase ni tiene claves. Solo `fetch` a nuestro backend vía `api/client.ts`.
- Todo `VITE_*` es público. Nunca poner secretos en `.env` del front.
- No commitear `.env`. Solo `.env.example`.
- No usar `dangerouslySetInnerHTML` con datos de la API.
- Links externos con `target="_blank"` siempre con `rel="noreferrer"`.

## 8. Convenciones

- Componentes en PascalCase (`DiputadoCard.tsx`) + `Nombre.module.css` al lado. Hooks `useAlgo.ts`. Páginas con `export default` (por `lazy`); el resto, exports nombrados.
- Imports con alias `@/` (= `src/`).
- Datos remotos **solo** con TanStack Query desde `features/*/queries.ts`. Claves en `api/queryKeys.ts`.
- Textos de UI en español rioplatense ("Buscá", "Probá"). Nombres de bloques/provincias vienen en MAYÚSCULAS: mostrarlos con `titleCase()`.
- Fechas de votaciones vienen sin zona horaria: usar `formatDate`/`formatDateShort` (no `new Date(iso)` directo).
- Responsive: probar en 360px de ancho. Sin scroll horizontal de página.

### Git

- Ramas: `main` (estable, lo que se muestra) · `develop` (integración) · `feature/...`, `fix/...`, `chore/...`, `docs/...` desde `develop`.
- **Nunca commitear directo a `main` ni a `develop`.** PR a `develop` con descripción; `develop → main` para releases.
- **Conventional Commits** en español: `feat(poroteo): pintar bancas arrastrando`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`, `test:`.
- CI (`.github/workflows/ci.yml`): lint, format check, typecheck, tests y build.

## 9. Comandos

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173 (backend en :4000)
npm test
npm run lint
npm run typecheck
npm run build
```

## 10. Roadmap

1. ✅ Poroteo manual de Diputados.
2. **IA:** botón "Estimar con IA" en el editor → `POST /api/poroteos/:id/prediccion` (a crear en el backend). Mostrar `confianza` (opacidad o anillo en la banca), `justificacion` y `fuentes` en el tooltip/lista, y diferenciar votos `origen: 'ia'` de los corregidos a mano. Los tipos `PoroteoVoto` ya tienen esos campos.
3. **Sugerir desde historial:** precargar el poroteo con cómo votó cada diputado en leyes similares (`cv_buscar_leyes` + `cv_historial_diputados` del backend).
4. **Senado:** `<Hemiciclo/>` ya soporta cualquier N (72 bancas = 5 filas). Falta selector de cámara, quórum 37 y datos.
5. **Auth para organizaciones** + correcciones con trazabilidad.
6. Exportar un poroteo (imagen del hemiciclo / CSV / link público de solo lectura).

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

Pruebas en `features/backoffice/backoffice.test.tsx`: roles y redirecciones,
restauración sin confiar en localStorage, reintento, logout/cache, rutas directas,
retirada de permisos, páginas y estados. Prueba visual local a 360 px y escritorio
en temas claro/oscuro con respuestas simuladas, sin acceder a Supabase. El chequeo
global de formato ya señalaba `Hemiciclo.module.css` antes de esta tarea; ese
archivo no fue modificado.

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

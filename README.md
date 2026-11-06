# demoIA · Poroteo Legislativo · Frontend

Interfaz de **demoIA**, el prototipo de Poroteo Legislativo de [Democracia en Red](https://democraciaenred.org), desarrollado en el programa _Hola Mundo Profesional_ (HMP).

Permite explorar la Cámara de Diputados (composición, diputados, votaciones históricas) y hacer un **poroteo manual**: estimar banca por banca cómo votaría cada diputado un proyecto de ley y ver en vivo si hay quórum y si se aprueba. Más adelante la estimación la va a hacer una IA.

Cada persona tiene su **cuenta** (email + contraseña) y sus poroteos son privados. La exploración de la Cámara es pública.

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
- **Google:** botón "Continuar con Google" en `/login` y `/registro` (flujo PKCE a través del backend; vuelve a `/auth/callback`). La configuración de Google Cloud y Supabase está en el README del backend.
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

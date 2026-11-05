# Poroteo Legislativo · Frontend

Interfaz del prototipo de **Poroteo Legislativo** de [Democracia en Red](https://democraciaenred.org), desarrollado en el programa _Hola Mundo Profesional_ (HMP).

Permite explorar la Cámara de Diputados (composición, diputados, votaciones históricas) y hacer un **poroteo manual**: estimar banca por banca cómo votaría cada diputado un proyecto de ley y ver en vivo si hay quórum y si se aprueba. Más adelante la estimación la va a hacer una IA.

> Backend: [Agente-BackEnd-Legislativo](https://github.com/zozodei/Agente-BackEnd-Legislativo). El front **solo** habla con esa API, nunca con Supabase directo.

## Stack

- React 19 + Vite 6 + TypeScript (strict)
- React Router 7 · TanStack Query 5 · Recharts
- CSS Modules + tokens de diseño en variables CSS (modo claro / oscuro)
- Tipografía self-hosted con Fontsource: Geist. Íconos: lucide-react
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

| Ruta              | Pantalla                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| `/`               | Panel general: hemiciclo por bloques, números de la Cámara, últimas votaciones |
| `/diputados`      | Buscador y grilla/lista con filtros por bloque y provincia                     |
| `/diputados/:id`  | Perfil: datos, mandato, estadísticas, gráficos, trayectoria e historial        |
| `/votaciones`     | Leyes votadas con búsqueda y filtros                                           |
| `/votaciones/:id` | Detalle: resultado, hemiciclo por voto, resumen por bloque, quién votó qué     |
| `/poroteos`       | Poroteos guardados                                                             |
| `/poroteos/nuevo` | Cargar un proyecto (título, descripción, texto o PDF)                          |
| `/poroteos/:id`   | Editor del poroteo con contador en vivo                                        |

## Estructura

```
src/
  api/          cliente HTTP, funciones por recurso, query keys
  components/   ui/ (botones, badges, campos, estados), hemiciclo/, layout/
  features/     dashboard/, diputados/, votaciones/, poroteo/ (queries + componentes propios)
  pages/        una por ruta (lazy)
  hooks/        hooks genéricos (tema, debounce, filtros en la URL)
  types/        tipos compartidos (= DTOs del backend)
  styles/       tokens.css, global.css, palette.ts (colores de datos)
  utils/        formato de números/fechas, texto
```

Más detalle en [`CLAUDE.md`](CLAUDE.md).

## Fuente de los datos

Votaciones de [¿Cómo Votó?](https://comovoto.dev.ar), de Rodrigo Quiroga ([repo](https://github.com/rquiroga7/Como_voto)). La fuente se cita en el pie de todas las páginas.

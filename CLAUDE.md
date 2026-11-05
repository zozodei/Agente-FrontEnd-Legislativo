# CLAUDE.md · Frontend del Poroteo Legislativo

Guía para cualquier agente o persona que trabaje en este repo. Leela completa antes de tocar código. **Mantenela actualizada** en el mismo PR en que cambies rutas, componentes centrales, tokens o convenciones.

---

## 1. Contexto

- **Quiénes:** equipo de estudiantes del programa _Hola Mundo Profesional_ (HMP), haciendo una práctica en la ONG **Democracia en Red**.
- **Objetivo final:** subir un proyecto de ley y que una IA haga el **poroteo**: estimar qué votaría cada legislador del Congreso de la Nación Argentina y cuál sería el resultado.
- **Etapa actual:** prototipo de **poroteo manual** (sin IA), **solo Cámara de Diputados** (257 bancas, quórum 129). Sirve para validar estética, funcionalidad y experiencia con la ONG.
- **Este repo no es descartable:** se usa hasta el final (IA + Senado).
- **Backend:** repo `Agente-BackEnd-Legislativo` (Node + Express). Su `CLAUDE.md` documenta la base de datos y la API completa.

## 2. Stack y arquitectura

React 19 + Vite 6 + TypeScript strict. React Router 7 (data router), TanStack Query 5, CSS Modules. Gráficos propios en `components/charts` (sin librería).

```
Navegador  →  backend (/api/...)  →  Supabase
                    ↑
       Las fotos son la excepción: se cargan directo con su foto_url pública (Storage).
```

```
src/
  main.tsx            fuentes + estilos globales + <App/>
  App.tsx             QueryClient (staleTime 60s, sin reintentos en 4xx)
  router.tsx          rutas; cada página es lazy()
  api/
    client.ts         request<T>() + ApiError + errorMessage(). ÚNICO lugar que hace fetch.
    resources.ts      diputadosApi, votacionesApi, statsApi, poroteosApi, catalogosApi
    queryKeys.ts      claves de TanStack Query centralizadas
  types/index.ts      tipos = DTOs del backend (camelCase). Si cambia la API, cambiá esto.
  styles/
    tokens.css        ÚNICA fuente de colores, tipografía, espaciado, movimiento (claro + oscuro)
    global.css        reset + base
    palette.ts        colores de datos para JS: VOTO_COLOR, bloqueStyle(), COALICION_COLOR
  components/
    charts/           primitivas de gráficos: SegmentedBar (un todo en partes), DotScale (escala
                      0–100 con un punto por categoría y puntos chicos por año), StackedRows (una
                      barra fina por fila/año, con cortes), ChartTooltip/useChartTooltip
    hemiciclo/        <Hemiciclo/>, <Leyenda/>, layout.ts (geometría pura), types.ts (Banca)
    layout/           AppLayout (encabezado, nav, pie con la fuente, selector de tema)
    ui/               Avatar, Button/ButtonLink, Badges (Voto, Resultado, Bloque), Fields
                      (SearchInput, SelectField, Checkbox, Segmented), Pagination, States
                      (Skeleton, EmptyState, ErrorState), Typography (SectionHeader, Meta,
                      Stat, PageHeader), VoteBar
  features/
    dashboard/queries.ts        useResumen
    diputados/                  queries (useDiputados, useDiputado, useVotosDiputado, diputadoToBanca)
                                components/ DiputadoCard, HistorialVotos, PerfilCharts (ComoVotaChart,
                                AfinidadChart, ActividadChart, MandatoBar, Comparado)
    votaciones/                 queries (useVotaciones, useVotacion), components/ VotacionRow, VotosTabla
    poroteo/                    queries (CRUD + mutaciones), resultado.ts (cálculo en vivo), archivo.ts (esPdf),
                                usePoroteoEditor.ts (estado local + deshacer), components/
                                ResultadoPanel, BloqueAcciones, ListaVotos
  pages/              una por ruta: HomePage, DiputadosPage, DiputadoPage, VotacionesPage,
                      VotacionPage, PoroteosPage, NuevoPoroteoPage, PoroteoPage, NotFoundPage
  hooks/              useTheme, useDebouncedValue, useDocumentTitle, useSearchParamState
  utils/              format.ts (números/fechas es-AR), text.ts (normalize, titleCase, nombreLegible)
```

**Regla de dependencias:** `pages → features → components/ui, api, hooks, utils`. Los componentes de `components/` no importan de `features/` ni de `pages/`.

## 3. Rutas

| Ruta              | Página           | Datos                                                                                       |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `/`               | HomePage         | `useDiputados` (hemiciclo) + `useResumen`                                                   |
| `/diputados`      | DiputadosPage    | `useDiputados` (los 257, filtrado en memoria; filtros en la URL)                            |
| `/diputados/:id`  | DiputadoPage     | `useDiputado` + `useVotosDiputado` (paginado en servidor)                                   |
| `/votaciones`     | VotacionesPage   | `useVotaciones` (paginado y filtrado en servidor; filtros en la URL)                        |
| `/votaciones/:id` | VotacionPage     | `useVotacion`                                                                               |
| `/poroteos`       | PoroteosPage     | `usePoroteos`                                                                               |
| `/poroteos/nuevo` | NuevoPoroteoPage | `useCrearPoroteo` (JSON o multipart con PDF). Acepta `location.state.titulo` para precargar |
| `/poroteos/:id`   | PoroteoPage      | `usePoroteo` + `useDiputados`; guarda con `useGuardarVotos` (modo `replace`)                |

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

## 6. Dirección visual (no negociable)

**Producto de datos cívicos con terminación de primer nivel** (referencia: apps de Apple). Es una herramienta de trabajo: la interfaz se tiene que poder leer de un vistazo y desaparecer detrás de la tarea. La identidad argentina vive en la marca, no en los datos.

**Sistema** (todo sale de `styles/tokens.css`; **no hardcodear hex en componentes**, salvo `palette.ts` y el velo de la foto de la portada):

- **Tipografía:** una sola familia, **Geist** (`--font-sans`), para títulos, texto y datos. Escala fija en rem (11 · 12 · 13 · 15 cuerpo · 17 · 21 · 26 · 32 · 44); solo el titular de la portada es fluido (`--text-display`). Títulos en 650–700 con tracking negativo (−0.025 a −0.04em). Cifras alineadas con `className="num"`.
- **Color:** fondo `--paper` (#f5f5f7), superficies `--surface` blancas, tinta `--ink` (#1d1d1f) y grises `--ink-2/3/4`. **Un solo color de acción**, `--accent` (azul), para links, botón primario y foco. `--celeste` y `--sol` solo en el isotipo. Color fuerte **solo para datos** (votos y bloques, `palette.ts`), y **nunca en el texto**: el color va en un punto o marca al lado.
- **Superficies:** paneles blancos con `--radius-lg` (16) y `--shadow-1`, **sin bordes**. Elevación: o borde o sombra, nunca los dos. Tarjetas `--radius-md` (12), controles 8, botones y chips en píldora. Dentro de un panel los campos usan `--field-bg`/`--field-shadow` (se redefinen en el panel: gris sin sombra).
- **Componentes:** botones `primary` (azul lleno, uno por pantalla), `secondary` (gris suave), `ghost` (texto azul), `danger`. Íconos **solo de `lucide-react`** (trazo 1.75–2), nunca emojis ni flechas de texto (→, ↗). Control segmentado estilo iOS. Barra de navegación translúcida (`backdrop-filter`) y fija.
- **Prohibido:** etiquetas chiquitas arriba de los títulos ("kickers"/eyebrows), MAYÚSCULAS sostenidas, monoespaciada como adorno, bordes de color a un costado de tarjetas o avisos (>1px), gradientes en texto, tarjetas iguales con ícono + título + texto como estructura de página.
- **Estados:** todo control tiene hover, foco visible (`--focus-ring`), deshabilitado y carga. Toda vista con datos tiene skeleton, `EmptyState` (dice qué hacer) y `ErrorState` (dice qué pasó y cómo seguir).
- **Movimiento:** 140–220 ms con `--ease-out` (exponencial). Un solo momento coreografiado: la foto de la portada. Respeta `prefers-reduced-motion`.
- **Modo oscuro:** negro puro de fondo con superficies `#1c1c1e`. Se prueba siempre junto con el claro.
- **Foto del Congreso** (`public/congreso.jpg`) a todo el ancho en la portada, pasando por debajo de la barra translúcida y fundiéndose con el fondo; el panel del hemiciclo se monta encima.

### Gráficos (`components/charts`)

Reglas de la skill de dataviz, aplicadas:

- **Elegí la forma por el dato, no por costumbre.** Muchos diputados tienen 1–2 años de datos: por eso nada de gráficos de líneas por año (quedan vacíos). Usamos formas que funcionan con 1 o con 30 años (`DotScale`, `StackedRows`).
- Marcas finas (barras de 8–12 px, segmentada alta de 28 px), **2 px de separación** en el color de fondo entre partes, puntos con anillo de 2 px.
- **El texto nunca lleva el color del dato:** el color va en un punto/marca al lado; el valor, en tinta.
- Siempre leyenda o etiqueta en texto (nunca solo color) + tooltip con hover **y teclado** (`useChartTooltip().bind`) + alternativa en tabla cuando hay muchos valores.
- Colores en orden fijo por entidad (el color sigue al voto/bloque, nunca al ranking). Paleta de coaliciones validada (CVD ΔE ≥ 19; el amarillo del PRO va siempre con etiqueta).
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
2. **IA:** botón "Estimar con IA" en el editor (la confianza se puede mostrar con `DotScale` o la opacidad de la banca; la base de gráficos ya está) → `POST /api/poroteos/:id/prediccion` (a crear en el backend). Mostrar `confianza` (opacidad o anillo en la banca), `justificacion` y `fuentes` en el tooltip/lista, y diferenciar votos `origen: 'ia'` de los corregidos a mano. Los tipos `PoroteoVoto` ya tienen esos campos.
3. **Sugerir desde historial:** precargar el poroteo con cómo votó cada diputado en leyes similares (`cv_buscar_leyes` + `cv_historial_diputados` del backend).
4. **Senado:** `<Hemiciclo/>` ya soporta cualquier N (72 bancas = 5 filas). Falta selector de cámara, quórum 37 y datos.
5. **Auth para organizaciones** + correcciones con trazabilidad.
6. Exportar un poroteo (imagen del hemiciclo / CSV / link público de solo lectura).

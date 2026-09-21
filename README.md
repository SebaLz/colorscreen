<p align="center">
  <img src="docs/banner.svg" alt="Color Screen" width="920" />
</p>

<p align="center">
  <strong>Convertí cualquier pantalla en una luz.</strong><br />
  Para videollamadas, foto, streams o un cuarto que necesita ambiente.
</p>

<p align="center">
  <a href="https://colorscreen.sebastianalcaraz.com"><img src="https://img.shields.io/badge/live-colorscreen.sebastianalcaraz.com-e48b58?style=for-the-badge" alt="Live" /></a>
  <a href="https://colorscreen.vercel.app"><img src="https://img.shields.io/badge/vercel-deploy-111111?style=for-the-badge&logo=vercel" alt="Vercel" /></a>
  <img src="https://img.shields.io/badge/PWA-fullscreen-7a3a88?style=for-the-badge" alt="PWA" />
</p>

<p align="center">
  <a href="https://colorscreen.sebastianalcaraz.com"><strong>Abrir Color Screen →</strong></a>
</p>

---

## La idea

El display es la lámpara. Tocás un color, mezclás dos o tres, o elegís un estilo — Key cálida, Ring light, Atardecer, Sleep — y lo abrís a pantalla completa. La UI se esconde sola. La pantalla se queda despierta.

Sirve para:

- rellenar la cara en una call sin comprar un panel
- un blanco Kelvin decente para foto
- un neón, un océano o una vela en el living
- un ámbar de noche que no te destroza el cuarto

## Qué podés hacer

| | |
| --- | --- |
| **Color** | Pad HSL, slider de matiz, hex, RGB, eyedropper y random |
| **Mix** | 2 a 4 colores, pesos, resultado uniforme o fundido |
| **Degradé** | Linear o radial, con ángulo |
| **Split** | Dos luces en la misma pantalla, corte vertical u horizontal |
| **Kelvin** | Blancos de 1800K a 7500K — vela, tungsteno, día, nublado |
| **Estilos** | 30 looks: videollamada, blancos, escenas y utilidad |
| **Luz** | Brillo, softbox, grano, warm/cool, breathe / pulse / flicker / aurora |
| **Uso real** | Fullscreen, wake lock, timer, favoritos, recents y links compartibles |

Instalable como PWA (`display: fullscreen`).

## Estilos

**Videollamada** — Key cálida · Beauty · Oficina · Fill frío · Ring light · Stream noche · Podcast · Entrevista

**Blancos** — Vela 1900K · Tungsteno · Soft white · Neutral · Día 5600K · Nublado 6500K

**Escenas** — Atardecer · Océano · Bosque · Neón · Lavanda · Ember · Aurora · Champagne · Vino · Spa

**Utilidad** — Cuarto oscuro · Foco azul · Sleep · Foto · Apagado · Warm / Cool split

## Atajos

| Tecla | Acción |
| --- | --- |
| `F` | Fullscreen |
| `H` / espacio | Mostrar / ocultar UI |
| `←` `→` | Matiz |
| `↑` `↓` | Brillo |
| `R` | Random |
| `S` | Compartir look |
| `C` | Copiar hex |
| `1`–`8` | Primeros estilos |

Los looks viajan en la URL. Favoritos y recents quedan en el browser.

## Local

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Vite + React + TypeScript. Sin backend: todo corre en el cliente.

## Stack

React 19 · Vite 8 · TypeScript · Vercel · Cloudflare DNS en `colorscreen.sebastianalcaraz.com`

Hecho por [Sebastián Alcaraz](https://www.sebastianalcaraz.com).

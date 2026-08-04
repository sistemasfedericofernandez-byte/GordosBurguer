# Cómo clonar este sistema para otra hamburguesería

Esta guía es para cuando quieras levantar el mismo sistema (el que armamos para
Menú Porá) para un local distinto, cambiando solo marca/colores/datos y
manteniendo el funcionamiento igual.

## 1. Qué es el sistema (resumen)

Next.js 16 + React 19 + TypeScript, desplegado en Vercel, con Postgres
(Supabase) como base de datos y Google Sheets como respaldo/editor de
catálogo en vivo. Incluye:

- **Caja** (`/`): carga de pedidos, cierre de caja, historial, compras/insumos.
- **Cocina** (`/cocina`): pantalla para la cocina con los pedidos en curso.
- **Pedidos públicos** (`/pedir`): página que le mandás al cliente por
  WhatsApp para que pida solo — queda pendiente de confirmación en Caja.
- **Cadetes** (`/cadete/[token]`): link personal por cadete para ver sus
  entregas, marcar salida/entrega, y cobrar lo que corresponda.
- **Bot de WhatsApp** (opcional): responde automático con IA (OpenAI) usando
  el catálogo real con precios, y linkea a `/pedir`.
- **Impresora térmica 58mm** (opcional, WebUSB) con fallback de impresión por
  navegador.
- **Menú editable en vivo desde Google Sheets**: cambiás un precio en la
  planilla y se refleja solo en la app (y viceversa).

## 2. Qué es genérico (no tocás nada) vs. qué es específico de cada local

**No se toca (es el motor, sirve para cualquier local):** todo el código de
`app/api/*`, `lib/*` (excepto los textos de marca listados abajo), el schema
de Prisma, la lógica de Caja/Cocina/Envíos/Cadetes/Compras/Historial, el
sistema de PIN, el bot de WhatsApp (la lógica), la impresora.

**Se genera nuevo por cada local:**
- Una base de datos Postgres nueva (Supabase).
- Una planilla de Google Sheets nueva.
- Un proyecto de Vercel nuevo (dominio propio).
- Un número de WhatsApp Business nuevo (Meta).
- Fotos de productos nuevas (`public/menu/`).
- Los textos/colores de marca (lista exacta abajo).

## 3. Recomendación: un repo (fork) por local

Como son cambios puntuales de marca y no de funcionalidad, lo más simple es
**clonar este repo a uno nuevo por cada hamburguesería** (no complicarlo con
multi-tenant todavía). Pasos:

```bash
# 1. Cloná este repo con otro nombre
git clone https://github.com/sistemasfedericofernandez-byte/MenuPora.git nombre-del-local
cd nombre-del-local
git remote remove origin
# 2. Creá un repo nuevo en GitHub para este local y pusheá ahí
git remote add origin https://github.com/tu-usuario/nombre-del-local.git
git push -u origin main
```

Si más adelante son muchos locales y mantener 6 repos separados se vuelve
pesado, ahí sí conviene invertir en una versión "multi-tenant" (una sola app,
la marca sale de una tabla `Business` en vez de estar hardcodeada) — pero
para 5-6 locales, repos separados es más simple y rápido de tener andando.

## 4. Infraestructura nueva por local

| Servicio | Qué hacer | Dónde |
|---|---|---|
| Base de datos | Crear proyecto nuevo en Supabase (Postgres), copiar la connection string del **Transaction pooler** (puerto 6543, no el direct connection) | supabase.com |
| Migraciones | Correr las migraciones de `prisma/migrations/` contra la base nueva | ver `prisma/migrations/` |
| Google Sheet | Duplicar la planilla de Menú Porá (Archivo → Crear una copia), compartirla con el mismo Service Account de Google Cloud (o crear uno nuevo) | Google Sheets |
| Vercel | Proyecto nuevo, importado del repo nuevo, dominio propio (`nombre-del-local.vercel.app` o dominio personalizado) | vercel.com |
| WhatsApp Business | Número nuevo dado de alta en Meta for Developers (ver README, sección "Bot de WhatsApp") | developers.facebook.com |
| OpenAI | Podés reusar la misma cuenta/API key para todos los locales (los costos se acumulan juntos), o crear una key separada por local si querés facturar por separado | platform.openai.com |

### Variables de entorno a cargar en Vercel (por local)

Están documentadas en `.env.example`. Resumen:

- `DATABASE_URL` (Supabase nuevo)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` (Sheet nuevo)
- `NEXT_PUBLIC_GOOGLE_SHEET_URL` (opcional)
- `NEXT_PUBLIC_SITE_URL` (dominio del local nuevo)
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (WhatsApp nuevo, opcional)
- `OPENAI_API_KEY` (opcional, para el bot)

## 5. Textos de marca hardcodeados — buscar y reemplazar "Menú Porá"

Estos son los únicos lugares donde el nombre del local está escrito a mano.
Buscá "Menú Porá" / "MENU PORA" y reemplazalo por el nombre nuevo en cada uno:

- [app/layout.tsx:8](app/layout.tsx:8) — título de la pestaña del navegador
- [app/page.tsx:187](app/page.tsx:187) — nombre en la barra superior de Caja
- [app/page.tsx:141](app/page.tsx:141) — mensaje de confirmación por WhatsApp al cliente
- [app/cocina/page.tsx:40](app/cocina/page.tsx:40) — nombre en la pantalla de Cocina
- [app/pedir/page.tsx:3](app/pedir/page.tsx:3) — título de la pestaña en `/pedir`
- [app/pedir/PedirClient.tsx:203](app/pedir/PedirClient.tsx:203) — nombre en el banner de `/pedir`
- [lib/openaiBot.ts:47](lib/openaiBot.ts:47) — nombre que usa el bot de WhatsApp para presentarse
- [lib/printer.ts:130](lib/printer.ts:130) — encabezado del ticket térmico

También reemplazá `https://menu-pora.vercel.app` por el dominio nuevo en
[app/api/whatsapp/webhook/route.ts:38](app/api/whatsapp/webhook/route.ts:38)
(fallback si `NEXT_PUBLIC_SITE_URL` no está seteada) y en `.env.example`/README.

El logo hoy es solo un círculo con las iniciales "MP" en CSS
(`.pedir-logo`, `.pedir-hero`), no hay un archivo de imagen — para un local
nuevo alcanza con cambiar las iniciales en el JSX (`app/pedir/PedirClient.tsx`,
buscá `>MP<`) y, si querés, reemplazar la foto de fondo del hero
(`hamburguesa-especial.png` en `app/globals.css`, clase `.pedir-hero`) por una
foto de un producto del local nuevo.

## 6. Colores — todo sale de variables CSS

Los colores están centralizados en `app/globals.css`. Cambiando estas
variables cambia el look de toda la app admin (Caja/Cocina/Envíos/etc, estilo
retro POS):

```css
:root{
  --bg:#171f1a; --panel:#212b24; --paper:#f5f1e6; --ink:#171f1a;
  --mustard:#d98a3d; --red:#c0392b; --green:#4a9163; --blue:#3f8ea8; --purple:#8b6fc7;
  --line:#37423a; --muted:#9aa79c;
}
```

Y la página pública `/pedir` tiene su propia paleta (estilo app de delivery
cálida) definida aparte, en el bloque `.pedir-app{...}` del mismo archivo —
son las mismas variables pero con otros valores, así que para un local nuevo
alcanza con tocar esos dos bloques de colores.

## 7. Fotos de productos

Van en `public/menu/`, el nombre del archivo tiene que matchear el nombre del
producto (slugificado: minúsculas, sin acentos, espacios → guiones). La
función que hace el match está en `lib/menuImages.ts` — tiene una lista
`AVAILABLE_SLUGS` que hay que actualizar con los productos del local nuevo (o,
más simple, dejar que la función intente el match automático por nombre y
listar ahí los que sí tienen foto).

## 8. Checklist rápido para un local nuevo

1. Clonar repo → repo nuevo en GitHub.
2. Supabase nuevo + correr migraciones.
3. Copiar la Google Sheet + compartir con el Service Account.
4. Reemplazar "Menú Porá" en los 8 archivos listados arriba.
5. Cambiar paleta de colores en `globals.css` (los dos bloques).
6. Subir fotos de productos a `public/menu/` y actualizar `menuImages.ts`.
7. Proyecto nuevo en Vercel, cargar variables de entorno, deployar.
8. Cargar el menú (por Sheet o desde Configuración → Menú).
9. (Opcional) Dar de alta WhatsApp Business + webhook para el bot.
10. Probar todo el flujo: pedido por Caja, `/pedir` público, cocina, cadete.

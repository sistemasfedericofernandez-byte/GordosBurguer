# Menú Porá — Sistema

Sistema de pedidos, caja, insumos y envíos. Corre en Vercel, guarda todo en una base Postgres
real (Supabase), y espeja cada pedido, compra, cierre de caja y envío a una planilla de Google
Sheets para que quede un respaldo legible aunque el servidor esté caído. El catálogo se lee en
vivo de la pestaña "Menu" de esa misma planilla: editar un precio ahí lo actualiza en la app sola.

## Qué incluye

- **Caja de hoy**: carga de pedidos, edición, cancelación (con PIN), cierre/reapertura de caja.
- **Página pública de pedidos** (`/pedir`): sin PIN, para mandarle el link a los clientes por
  WhatsApp. Los pedidos que entran por ahí quedan **pendientes de confirmación** — le suena un
  aviso a quien tenga la pestaña de Caja abierta, con botones Confirmar/Rechazar.
- **Bot de WhatsApp** (opcional, ver más abajo): responde automático horarios/precios usando IA
  (OpenAI), y le pasa al cliente el link de `/pedir` si quiere hacer un pedido.
- **Compras / Insumos**: registro de compras con categoría, proveedor y medio de pago, e historial por día.
- **Envíos**: cadetes propios, varias entregas a la vez por cadete, link de Google Maps, y un link
  personal por celular para que el propio cadete cargue la dirección, vea cuánto tiene que cobrar
  (o si ya está todo pagado), llame o le escriba por WhatsApp al cliente, y marque "Salí" / "Entregué".
- **Cocina**: pantalla de solo lectura (`/cocina`) para dejar abierta en una tablet o segundo monitor.
- **Impresora de comandas 58mm** (opcional, ver más abajo): imprime el ticket al confirmar un pedido.
- **Historial ventas** y **Menú**: con exportación a CSV.
- **Configuración**: PIN, tarifa de envío por defecto, y estado de activación (mismo mecanismo de
  período de prueba de siempre), link de pedidos, info del bot, conexión de la impresora.

## Puesta en marcha paso a paso

Vas a necesitar tres cosas: una base de datos Postgres, un Service Account de Google, y una
cuenta de Vercel. Ninguna de estas altas las puede hacer un asistente de IA por vos — son cuentas
tuyas — pero acá está todo el detalle para hacerlas en 15-20 minutos.

### 1. Crear el repositorio en GitHub

Subí esta carpeta (`gordos-cloud/`) a un repositorio nuevo en GitHub (privado, si querés). Vercel
se conecta directo a GitHub para desplegar en cada push.

### 2. Crear la planilla de Google Sheets y el Service Account

1. Creá una planilla nueva en [Google Sheets](https://sheets.google.com) (puede estar vacía, las
   pestañas se crean solas la primera vez que el sistema escribe en ella).
2. Copiá el ID de la planilla: es la parte de la URL entre `/d/` y `/edit`.
3. Andá a [Google Cloud Console](https://console.cloud.google.com/), creá un proyecto (o usá uno
   existente), y habilitá la **Google Sheets API**.
4. Creá una **Service Account** (IAM y administración → Cuentas de servicio → Crear cuenta de
   servicio). No necesita ningún rol especial a nivel del proyecto.
5. Entrá a la cuenta de servicio creada → pestaña **Claves** → **Agregar clave** → **Crear clave
   nueva** → tipo JSON. Se descarga un archivo `.json`.
6. Abrí ese archivo: vas a necesitar los campos `client_email` y `private_key`.
7. Volvé a la planilla de Google Sheets y compartila (botón **Compartir**) con el email de
   `client_email`, dándole permiso de **Editor**.

### 3. Crear el proyecto en Vercel y la base de datos

1. Entrá a [vercel.com](https://vercel.com), creá una cuenta si no tenés, e importá el repositorio
   de GitHub del paso 1.
2. Antes de desplegar (o después, desde el proyecto ya creado), andá a la pestaña **Storage** →
   **Create Database** → elegí **Postgres** (Neon). Conectala al proyecto: esto agrega
   automáticamente la variable `DATABASE_URL`.
3. En **Settings → Environment Variables** del proyecto, agregá las variables restantes de
   `.env.example`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: el `client_email` del archivo JSON.
   - `GOOGLE_PRIVATE_KEY`: el `private_key` del archivo JSON (pegalo completo, con los `\n`).
   - `GOOGLE_SHEET_ID`: el ID de la planilla del paso 2.
   - `NEXT_PUBLIC_GOOGLE_SHEET_URL` (opcional): la URL completa de la planilla, para mostrar el
     botón "Abrir planilla" en Configuración.
4. Aplicá el esquema de la base de datos. Con la CLI de Vercel conectada (`vercel link` y
   `vercel env pull .env.local` en esta carpeta), corré:
   ```bash
   npx prisma migrate deploy
   ```
5. Desplegá (push a la rama principal, o `vercel --prod` desde la CLI).

### 4. Primeros pasos ya en producción

- Entrá a la URL que te dio Vercel. La primera vez, la pestaña **Menú** va a cargar el menú por
  defecto (podés editarlo desde ahí).
- Cargá los cadetes en la pestaña **Envíos** y copiá el link personal de cada uno para pasárselo
  por WhatsApp.
- Abrí `/cocina` en la tablet o monitor de la cocina y dejala abierta.
- El PIN de eliminar pedidos y cambiar configuración arranca en `1234` — cambialo desde
  **Configuración** apenas lo tengas andando.
- Revisá que la planilla de Google Sheets se vaya llenando sola después del primer pedido.
- Andá a **Configuración** → "Página de pedidos para clientes" → copiá el link de `/pedir` y
  pasáselo a los clientes que te escriben por WhatsApp.

## Bot de WhatsApp (opcional)

El sistema funciona perfecto sin esto — es un extra para automatizar respuestas. Necesitás crear
una cuenta de **WhatsApp Business Platform** (Meta) y una API key de **OpenAI**. Son cuentas
tuyas, no las puede crear un asistente de IA por vos.

### 1. Crear la app de Meta y el número de WhatsApp

1. Entrá a [developers.facebook.com](https://developers.facebook.com/) → **Mis Apps** → **Crear app**
   → tipo "Empresa" → agregale el producto **WhatsApp**.
2. En **WhatsApp → Configuración de la API**, vas a ver un número de prueba ya disponible (sirve
   para probar, con hasta 5 números destinatarios agregados a mano) y ahí mismo:
   - El **Phone Number ID** → es `WHATSAPP_PHONE_NUMBER_ID`.
   - Un **token de acceso temporal** (dura 24hs, para probar) o generá uno permanente en
     **Configuración de la empresa → Usuarios del sistema** → `WHATSAPP_ACCESS_TOKEN`.
3. Para recibir mensajes reales de cualquier número (no solo los de prueba) hace falta verificar
   el negocio ante Meta — es un trámite aparte, no bloquea probar el bot mientras tanto.

### 2. Configurar el webhook

1. Elegí vos mismo un texto secreto cualquiera y ponelo como `WHATSAPP_VERIFY_TOKEN` (en Vercel y
   en el paso siguiente tienen que coincidir).
2. En **WhatsApp → Configuración → Webhooks**, cargá:
   - **Callback URL**: `https://tu-dominio.vercel.app/api/whatsapp/webhook`
   - **Verify token**: el mismo texto de `WHATSAPP_VERIFY_TOKEN`
3. Suscribite al campo **messages**.

### 3. Variables en Vercel

Cargá en **Settings → Environment Variables**: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `OPENAI_API_KEY` (se crea en
[platform.openai.com/api-keys](https://platform.openai.com/api-keys)), y
`NEXT_PUBLIC_SITE_URL` con la URL pública del sitio. Redeployá.

### 4. Probar

Mandale un WhatsApp al número de prueba preguntando el horario, o pidiendo la carta — tendría que
responder solo. Si no responde, revisá **Runtime Logs** en Vercel filtrando por `whatsapp`.

## Impresora térmica de comandas (58mm, opcional)

Se imprime un ticket automáticamente cada vez que se confirma un pedido (uno nuevo desde Caja, o
al confirmar uno que llegó por `/pedir`). Funciona con **WebUSB** (Chrome/Edge): no hace falta
instalar ningún programa.

1. Conectá la impresora térmica USB a la computadora de Caja.
2. Andá a **Configuración → Impresora de comandas** → **Conectar impresora** → elegí el dispositivo
   en el diálogo que abre el navegador (una sola vez; el permiso queda guardado).
3. Hacé un pedido de prueba y confirmá — tendría que imprimir el ticket solo.

Si la impresora no imprime nada (por ejemplo, modelo no compatible con los números de
interfaz/endpoint genéricos que usa `lib/printer.ts`), el sistema cae automáticamente al diálogo
de impresión del navegador con un ticket ya formateado a 58mm, para no perder la comanda.

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # crea las tablas en tu DATABASE_URL de desarrollo
npm run dev
```

Necesitás un archivo `.env` local (copiá `.env.example`) apuntando a una base Postgres de prueba
(puede ser la misma de Vercel, o una local con Docker) y, si querés probar el espejo, credenciales
de Google Sheets válidas.

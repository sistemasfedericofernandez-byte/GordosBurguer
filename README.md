# GORDO'S Sistema — versión en la nube

Sistema de pedidos, caja, insumos y envíos para la hamburguesería. A diferencia de la
versión anterior (`GORDO'S-SISTEMA.html`, que guardaba todo en el navegador), esta
versión corre en Vercel, guarda todo en una base Postgres real, y además espeja cada
pedido, compra, cierre de caja y envío a una planilla de Google Sheets para que quede
un respaldo legible aunque el servidor esté caído.

## Qué incluye

- **Caja de hoy**: carga de pedidos, edición, cancelación (con PIN), cierre/reapertura de caja.
- **Compras / Insumos**: registro de compras con categoría, proveedor y medio de pago, e historial por día.
- **Envíos**: cadetes propios, varias entregas a la vez por cadete, link de Google Maps, y un link
  personal por celular para que el propio cadete cargue la dirección y marque "Salí" / "Entregué".
- **Cocina**: pantalla de solo lectura (`/cocina`) para dejar abierta en una tablet o segundo monitor.
- **Historial ventas** y **Menú**: igual que la versión anterior, con exportación a CSV.
- **Configuración**: PIN, tarifa de envío por defecto, y estado de activación (mismo mecanismo de
  período de prueba que la versión anterior).

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

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # crea las tablas en tu DATABASE_URL de desarrollo
npm run dev
```

Necesitás un archivo `.env` local (copiá `.env.example`) apuntando a una base Postgres de prueba
(puede ser la misma de Vercel, o una local con Docker) y, si querés probar el espejo, credenciales
de Google Sheets válidas.

import { google, sheets_v4 } from "googleapis";
import { paymentLabel, deliveryLabel } from "@/lib/domain";

const TABS = {
  orders: { name: "Pedidos", header: ["ID", "Fecha", "Hora", "Numero", "Cliente", "Telefono", "Items", "Pago", "Entrega", "Nota", "Estado", "Total", "Origen", "Confirmacion", "Descuento", "DNI Cupon"] },
  expenses: { name: "Insumos", header: ["ID", "Fecha", "Hora", "Descripcion", "Categoria", "Cantidad", "Proveedor", "Pago", "Nota", "Monto"] },
  closures: { name: "Cierres", header: ["ID", "Fecha", "CerradoEl", "CerradoPor", "Total", "Efectivo", "MercadoPago", "Transferencia"] },
  cadetes: { name: "Cadetes", header: ["ID", "Nombre", "Telefono", "Estado"] },
  deliveries: { name: "Envios", header: ["ID", "Pedido", "Cadete", "Direccion", "Tarifa", "EnvioPagado", "Estado", "Salio", "Entrego"] },
  menu: { name: "Menu", header: ["ID", "Categoria", "Nombre", "Precio", "Descripcion", "Activo"] },
} as const;

type TabKey = keyof typeof TABS;

let sheetsClientPromise: Promise<sheets_v4.Sheets> | null = null;
const ensuredTabs = new Set<string>();

function getSpreadsheetId(): string | null {
  return process.env.GOOGLE_SHEET_ID || null;
}

function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (!sheetsClientPromise) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !key) throw new Error("Faltan credenciales de Google Sheets");
    const auth = new google.auth.JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClientPromise = Promise.resolve(google.sheets({ version: "v4", auth }));
  }
  return sheetsClientPromise;
}

async function ensureTab(sheets: sheets_v4.Sheets, spreadsheetId: string, tab: TabKey): Promise<void> {
  if (ensuredTabs.has(tab)) return;
  const { name, header } = TABS[tab];
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === name);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header as unknown as string[]] },
    });
  }
  ensuredTabs.add(tab);
}

async function findRowById(sheets: sheets_v4.Sheets, spreadsheetId: string, tabName: string, id: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:A` });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1; // 1-indexed sheet row
  }
  return null;
}

/** Escribe (alta o reemplazo) una fila identificada por id en la pestaña dada. Best-effort: nunca lanza. */
export async function mirrorUpsert(tab: TabKey, id: string, row: (string | number)[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return;
  try {
    const sheets = await getSheetsClient();
    await ensureTab(sheets, spreadsheetId, tab);
    const { name } = TABS[tab];
    const rowNum = await findRowById(sheets, spreadsheetId, name, id);
    if (rowNum) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${name}!A${rowNum}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${name}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    }
  } catch (err) {
    console.error(`No se pudo espejar en Google Sheets (${tab}):`, err);
  }
}

/** Marca una fila como eliminada (no la borra, para no perder historial). Best-effort. */
export async function mirrorMarkDeleted(tab: TabKey, id: string, statusColumnIndex: number, value = "Eliminado"): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return;
  try {
    const sheets = await getSheetsClient();
    await ensureTab(sheets, spreadsheetId, tab);
    const { name } = TABS[tab];
    const rowNum = await findRowById(sheets, spreadsheetId, name, id);
    if (!rowNum) return;
    const col = String.fromCharCode("A".charCodeAt(0) + statusColumnIndex);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!${col}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [[value]] },
    });
  } catch (err) {
    console.error(`No se pudo marcar eliminado en Google Sheets (${tab}):`, err);
  }
}

type OrderItemLike = { name: string; qty: number };
type OrderLike = {
  id: string;
  dateKey: string;
  createdAt: Date;
  num: number;
  customerName: string;
  customerPhone: string;
  items: unknown;
  payment: string;
  delivery: string;
  note: string;
  status: string;
  total: number;
  source: string;
  confirmStatus: string;
  discount?: number;
  couponDni?: string | null;
};

export function mirrorOrder(o: OrderLike): Promise<void> {
  const items = Array.isArray(o.items) ? (o.items as OrderItemLike[]) : [];
  return mirrorUpsert("orders", o.id, [
    o.id,
    o.dateKey,
    new Date(o.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    o.num,
    o.customerName || "",
    o.customerPhone || "",
    items.map((it) => `${it.qty}x ${it.name}`).join(" | "),
    paymentLabel(o.payment),
    deliveryLabel(o.delivery),
    o.note || "",
    o.status,
    o.total,
    o.source === "cliente" ? "Cliente" : "Local",
    o.confirmStatus,
    o.discount || 0,
    o.couponDni || "",
  ]);
}

export function mirrorOrderDeleted(id: string): Promise<void> {
  return mirrorMarkDeleted("orders", id, 10);
}

type ExpenseLike = {
  id: string;
  dateKey: string;
  createdAt: Date;
  description: string;
  category: string;
  quantity: string;
  supplier: string;
  payment: string;
  note: string;
  amount: number;
};

export function mirrorExpense(e: ExpenseLike): Promise<void> {
  return mirrorUpsert("expenses", e.id, [
    e.id,
    e.dateKey,
    new Date(e.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    e.description,
    e.category,
    e.quantity || "",
    e.supplier || "",
    paymentLabel(e.payment),
    e.note || "",
    e.amount,
  ]);
}

export function mirrorExpenseDeleted(id: string): Promise<void> {
  return mirrorMarkDeleted("expenses", id, 8);
}

type ClosureLike = {
  id: string;
  dateKey: string;
  closedAt: Date;
  closedBy: string;
  totals: unknown;
};

export function mirrorClosure(c: ClosureLike): Promise<void> {
  const t = (c.totals && typeof c.totals === "object" ? c.totals : {}) as Record<string, number>;
  return mirrorUpsert("closures", c.id, [
    c.id,
    c.dateKey,
    new Date(c.closedAt).toLocaleString("es-AR"),
    c.closedBy || "",
    t.total || 0,
    t.efectivo || 0,
    t.mercadopago || 0,
    t.transferencia || 0,
  ]);
}

type CadeteLike = { id: string; name: string; phone: string; active: boolean };

export function mirrorCadete(c: CadeteLike): Promise<void> {
  return mirrorUpsert("cadetes", c.id, [c.id, c.name, c.phone || "", c.active ? "Activo" : "Inactivo"]);
}

type DeliveryLike = {
  id: string;
  order: { num: number };
  cadete: { name: string } | null;
  address: string;
  tariff: number;
  tariffPaid: boolean;
  status: string;
  departedAt: Date | null;
  deliveredAt: Date | null;
};

export function mirrorDelivery(d: DeliveryLike): Promise<void> {
  return mirrorUpsert("deliveries", d.id, [
    d.id,
    d.order.num,
    d.cadete?.name || "",
    d.address || "",
    d.tariff || 0,
    d.tariffPaid ? "Si" : "No",
    d.status,
    d.departedAt ? new Date(d.departedAt).toLocaleString("es-AR") : "",
    d.deliveredAt ? new Date(d.deliveredAt).toLocaleString("es-AR") : "",
  ]);
}

type MenuItemLike = { id: string; category: string; name: string; price: number; desc: string; active: boolean };

export function mirrorMenuItem(m: MenuItemLike): Promise<void> {
  return mirrorUpsert("menu", m.id, [m.id, m.category, m.name, m.price, m.desc || "", m.active ? "Si" : "No"]);
}

/**
 * Lee el catálogo directamente de la hoja "Menu" (fuente de verdad para el menú:
 * el dueño puede editar precios ahí y se reflejan solos en la app).
 * Devuelve null si Sheets no está configurado o falla, para que el caller use Postgres como respaldo.
 */
export async function getMenuFromSheet(): Promise<MenuItemLike[] | null> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;
  try {
    const sheets = await getSheetsClient();
    await ensureTab(sheets, spreadsheetId, "menu");
    const { name } = TABS.menu;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A2:F10000` });
    const rows = res.data.values || [];
    return rows
      .filter((r) => r[2] && r[2].trim()) // debe tener nombre
      .map((r) => ({
        id: r[0] || `sheet-${r[2]}`,
        category: r[1] || "Otros",
        name: r[2],
        price: parseFloat(r[3]) || 0,
        desc: r[4] || "",
        active: (r[5] || "Si").trim().toLowerCase() !== "no",
      }));
  } catch (err) {
    console.error("No se pudo leer el menú desde Google Sheets:", err);
    return null;
  }
}

export type GymPaymentRow = { dni: string; name: string; nextDueDate: string; daysRemaining: number };

// TEMP: guarda el último error de lectura para diagnosticar en producción. Sacar después.
export let lastGymSheetError: string | null = null;

/**
 * Lee el historial de pagos del gimnasio (planilla propia del gimnasio, no la nuestra —
 * es de solo lectura, nunca le escribimos nada). Es un registro de pagos, no un padrón:
 * puede haber varias filas por DNI (una por cada pago mensual); el caller debe quedarse
 * con la última fila de cada DNI para saber el estado vigente.
 * Columnas esperadas en la pestaña "Pagos": A=Fecha, B=Apellido y nombre, C=DNI,
 * D=Medio de pago, E=Notas, F=Membresia, G=Proximo pago, H=Dias restantes, I=Horario, J=Monto.
 * Devuelve null si GYM_SHEET_ID no está configurado o la lectura falla.
 */
export async function getGymPaymentsFromSheet(): Promise<GymPaymentRow[] | null> {
  const spreadsheetId = process.env.GYM_SHEET_ID || null;
  if (!spreadsheetId) return null;
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Pagos!A2:J20000" });
    const rows = res.data.values || [];
    return rows
      .filter((r) => r[2] && String(r[2]).trim())
      .map((r) => ({
        dni: String(r[2]).trim(),
        name: r[1] || "",
        nextDueDate: r[6] || "",
        daysRemaining: parseInt(r[7], 10),
      }));
  } catch (err) {
    console.error("No se pudo leer los pagos del gimnasio desde Google Sheets:", err);
    lastGymSheetError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

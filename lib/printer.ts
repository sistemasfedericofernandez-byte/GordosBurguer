"use client";

// Integración genérica con impresoras térmicas ESC/POS de 58mm por USB, usando la WebUSB API
// (Chrome/Edge). No hay impresora física para probar en este entorno: los números de
// interfaz/endpoint de más abajo son los más comunes en impresoras térmicas USB genéricas,
// pero puede hacer falta ajustarlos según el modelo real (ver README).

// Tipos mínimos de WebUSB (no vienen en lib.dom por defecto).
type USBEndpoint = { direction: "in" | "out"; endpointNumber: number };
type USBAlternateInterface = { endpoints: USBEndpoint[] };
type USBInterface = { interfaceNumber: number; alternates: USBAlternateInterface[] };
type USBConfiguration = { interfaces: USBInterface[] };
type USBDevice = {
  configuration: USBConfiguration | null;
  configurations: USBConfiguration[];
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: Uint8Array): Promise<unknown>;
};

type UsbLike = {
  requestDevice(options: { filters: unknown[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
};

function getUsb(): UsbLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { usb?: UsbLike }).usb || null;
}

let pairedDevice: USBDevice | null = null;
let claimedInterface = 0;
let outEndpoint = 1;

function findOutEndpoint(device: USBDevice): { iface: number; endpoint: number } {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const out = alt.endpoints.find((e) => e.direction === "out");
        if (out) return { iface: iface.interfaceNumber, endpoint: out.endpointNumber };
      }
    }
  }
  return { iface: 0, endpoint: 1 };
}

async function openAndClaim(device: USBDevice): Promise<void> {
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const { iface, endpoint } = findOutEndpoint(device);
  claimedInterface = iface;
  outEndpoint = endpoint;
  await device.claimInterface(claimedInterface);
  pairedDevice = device;
}

/** Debe llamarse desde un click del usuario (WebUSB lo exige) — típicamente un botón "Conectar impresora". */
export async function connectPrinter(): Promise<boolean> {
  const usb = getUsb();
  if (!usb) {
    alert("Este navegador no soporta WebUSB. Probá con Chrome o Edge en la computadora de la caja.");
    return false;
  }
  try {
    const device = await usb.requestDevice({ filters: [] });
    await openAndClaim(device);
    return true;
  } catch (err) {
    console.error("No se pudo conectar la impresora:", err);
    return false;
  }
}

/** Intenta reconectar automáticamente a una impresora ya autorizada antes, sin pedir permiso de nuevo. */
export async function tryReconnectPrinter(): Promise<boolean> {
  const usb = getUsb();
  if (!usb) return false;
  try {
    const devices = await usb.getDevices();
    if (devices.length === 0) return false;
    await openAndClaim(devices[0]);
    return true;
  } catch (err) {
    console.error("No se pudo reconectar la impresora:", err);
    return false;
  }
}

export function isPrinterConnected(): boolean {
  return pairedDevice !== null;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const ESC = 0x1b;
const GS = 0x1d;

function buildTicketBytes(lines: { text: string; bold?: boolean; center?: boolean }[]): Uint8Array {
  const bytes: number[] = [ESC, 0x40]; // init
  for (const line of lines) {
    bytes.push(ESC, 0x61, line.center ? 0x01 : 0x00);
    bytes.push(ESC, 0x45, line.bold ? 0x01 : 0x00);
    for (const ch of stripAccents(line.text)) bytes.push(ch.charCodeAt(0) & 0xff);
    bytes.push(0x0a);
  }
  bytes.push(0x0a, 0x0a, 0x0a);
  bytes.push(GS, 0x56, 0x00); // corte
  return new Uint8Array(bytes);
}

export type TicketOrder = {
  num: number;
  customerName: string;
  customerPhone: string;
  items: { qty: number; name: string }[];
  total: number;
  delivery: string;
  note: string;
  createdAt: string;
  address?: string;
  collectLabel?: string;
  collectAmount?: number;
};

export function ticketLines(order: TicketOrder): { text: string; bold?: boolean; center?: boolean }[] {
  const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  const lines: { text: string; bold?: boolean; center?: boolean }[] = [
    { text: "GORDO'S BURGER", bold: true, center: true },
    { text: `Pedido #${order.num}`, bold: true, center: true },
    { text: new Date(order.createdAt).toLocaleString("es-AR"), center: true },
    { text: "--------------------------------" },
  ];
  if (order.customerName) lines.push({ text: `Cliente: ${order.customerName}` });
  if (order.customerPhone) lines.push({ text: `Tel: ${order.customerPhone}` });
  lines.push({ text: `Entrega: ${order.delivery.toUpperCase()}` });
  if (order.delivery === "envio" && order.address) lines.push({ text: `Direccion: ${order.address}`, bold: true });
  lines.push({ text: "--------------------------------" });
  for (const it of order.items) lines.push({ text: `${it.qty}x ${it.name}` });
  lines.push({ text: "--------------------------------" });
  lines.push({ text: `TOTAL: ${money(order.total)}`, bold: true });
  if (order.collectLabel) lines.push({ text: order.collectLabel + (order.collectAmount ? `: ${money(order.collectAmount)}` : "") });
  if (order.note) { lines.push({ text: "--------------------------------" }); lines.push({ text: `Nota: ${order.note}` }); }
  return lines;
}

/** Imprime el ticket por WebUSB si hay impresora conectada; si no, no hace nada (usar printTicketFallback como respaldo). */
export async function printTicket(order: TicketOrder): Promise<boolean> {
  if (!pairedDevice) return false;
  try {
    const bytes = buildTicketBytes(ticketLines(order));
    await pairedDevice.transferOut(outEndpoint, bytes);
    return true;
  } catch (err) {
    console.error("Error imprimiendo:", err);
    return false;
  }
}

/** Respaldo sin impresora conectada: abre el diálogo de impresión del navegador con un ticket angosto (58mm). */
export function printTicketFallback(order: TicketOrder): void {
  const lines = ticketLines(order);
  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) return;
  const html = `<!doctype html><html><head><title>Ticket #${order.num}</title>
    <style>
      @page { size: 58mm auto; margin: 2mm; }
      body { font-family: 'Courier New', monospace; font-size: 11px; width: 54mm; margin: 0; }
      p { margin: 2px 0; white-space: pre-wrap; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
    </style></head><body>
    ${lines.map((l) => `<p class="${l.center ? "center " : ""}${l.bold ? "bold" : ""}">${escapeHtml(l.text)}</p>`).join("")}
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Imprime por WebUSB si hay impresora conectada; si no, usa el diálogo de impresión del navegador. */
export async function printOrderTicket(order: TicketOrder): Promise<void> {
  const ok = await printTicket(order);
  if (!ok) printTicketFallback(order);
}

export type CartItem = { id?: string; name: string; price: number; qty: number };

export type Cadete = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  accessToken: string;
};

export type DeliveryInfo = {
  id: string;
  orderId: string;
  cadeteId: string | null;
  cadete: Cadete | null;
  address: string;
  mapsUrl: string;
  tariff: number;
  tariffPaid: boolean;
  status: "pendiente" | "en_camino" | "entregado";
  departedAt: string | null;
  deliveredAt: string | null;
  notes: string;
  order?: Order;
};

export type Order = {
  id: string;
  num: number;
  customerName: string;
  customerPhone: string;
  payment: "efectivo" | "mercadopago" | "transferencia";
  delivery: "mostrador" | "retira" | "envio";
  note: string;
  status: "pendiente" | "completado";
  source: "staff" | "cliente";
  confirmStatus: "pendiente" | "confirmado" | "rechazado";
  total: number;
  items: CartItem[];
  dateKey: string;
  createdAt: string;
  delivery_?: DeliveryInfo | null;
};

export type MenuItem = {
  id: string;
  category: string;
  name: string;
  price: number;
  desc: string;
  active: boolean;
};

export type Expense = {
  id: string;
  description: string;
  category: string;
  quantity: string;
  supplier: string;
  payment: "efectivo" | "mercadopago" | "transferencia";
  note: string;
  amount: number;
  dateKey: string;
  createdAt: string;
};

export type Closure = {
  id: string;
  dateKey: string;
  closedAt: string;
  closedBy: string;
  totals: {
    total: number;
    efectivo: number;
    mercadopago: number;
    transferencia: number;
    count: number;
    envio: number;
    retira: number;
    mostrador: number;
    gastos: number;
    efectivoNeto: number;
  };
};

export type Settings = {
  activated: boolean;
  expired: boolean;
  trialDeadline: number;
  defaultTariff: number;
  businessInfo: string;
};

"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { money } from "@/lib/domain";

export default function MenuTab({ menu, reload }: { menu: MenuItem[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<{ id: string; name: string; price: string; category: string; desc: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Burgers");

  const byCategory: Record<string, MenuItem[]> = {};
  menu.forEach((m) => { (byCategory[m.category] ||= []).push(m); });
  const categories = Object.keys(byCategory).sort((a, b) => (a === "Burgers" ? -1 : b === "Burgers" ? 1 : a.localeCompare(b)));

  const addItem = async () => {
    const price = parseFloat(newPrice);
    if (!newName.trim() || !price || price <= 0) return;
    await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, price, category: newCategory }) });
    setNewName(""); setNewPrice("");
    await reload();
  };
  const startEdit = (item: MenuItem) => setEditing({ id: item.id, name: item.name, price: String(item.price), category: item.category, desc: item.desc });
  const saveEdit = async () => {
    if (!editing) return;
    const price = parseFloat(editing.price);
    if (!editing.name.trim() || !price || price <= 0) return;
    await fetch(`/api/menu/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, price, category: editing.category, desc: editing.desc }),
    });
    setEditing(null);
    await reload();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este producto del menú?")) return;
    await fetch(`/api/menu/${id}`, { method: "DELETE" });
    await reload();
  };

  return (
    <div className="card">
      <h2>Menú</h2>
      {categories.map((cat) => (
        <div key={cat}>
          <div className="cat-label">{cat}</div>
          {byCategory[cat].map((item) => (
            <div className="menu-edit-row" key={item.id}>
              {editing?.id === item.id ? (
                <>
                  <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                  <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    {[...categories, editing.category].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="small-btn done" onClick={saveEdit}>Guardar</button>
                  <button className="small-btn undo" onClick={() => setEditing(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <div style={{ flex: 2, minWidth: 120 }}>{item.name}</div>
                  <div style={{ flex: 1, minWidth: 80, color: "var(--mustard)" }}>{money(item.price)}</div>
                  <button className="small-btn edit" onClick={() => startEdit(item)}>Editar</button>
                  <button className="small-btn del" onClick={() => remove(item.id)}>Eliminar</button>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
      <div className="new-item-form">
        <input type="text" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input type="number" placeholder="Precio" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
          {[...categories, "Burgers", "Extras"].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="mini-btn" onClick={addItem}>Agregar</button>
      </div>
    </div>
  );
}

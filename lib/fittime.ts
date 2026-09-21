import { Pool } from "pg";

/**
 * Consulta de SOLO LECTURA al sistema de gestión de Fit Time (su propia base Postgres) para saber si un
 * DNI es un alumno con la cuota vigente. Reemplaza a la planilla de Google del sistema viejo.
 *
 * Se conecta con un usuario Postgres de solo lectura (hamburgueseria_ro) que únicamente puede leer la
 * vista externo.alumnos_vigencia del lado de Fit Time: DNI, nombre de pila y días restantes de cuota.
 * No ve teléfonos, fechas de nacimiento, montos ni ninguna otra tabla, y no puede escribir nada.
 *
 * La regla de "vigente" vive en esa vista y es la misma que usa Fit Time para dejar entrar a un alumno
 * (obtenerEstadoCuota en su asistencia.actions.ts): se mira el ÚLTIMO pago del alumno y tiene que faltar
 * más de 0 días para su vencimiento (el día del vencimiento ya cuenta como vencido). No se usa el campo
 * "estado" del alumno porque en Fit Time no se actualiza solo. Quedan afuera los alumnos "privados"
 * (entrenamiento personalizado de un admin) y los INACTIVOS, igual que en sus listados y reportes.
 *
 * Requiere FITTIME_DATABASE_URL (connection string de ese usuario de solo lectura).
 */

let pool: Pool | null = null;

function getPool(): Pool | null {
  const raw = process.env.FITTIME_DATABASE_URL;
  if (!raw) return null;
  if (!pool) {
    // Parámetros propios de Prisma que node-pg no entiende.
    const url = new URL(raw);
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    pool = new Pool({
      connectionString: url.toString(),
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 6000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

/** Deja solo los dígitos, igual que hace Fit Time al guardar un DNI ("30.123.456" -> "30123456"). */
export function normalizeDni(raw: string): string {
  return raw.replace(/\D/g, "");
}

export type GymLookup =
  | { status: "unavailable" }
  | { status: "not_found" }
  | { status: "found"; name: string; daysRemaining: number | null };

export async function findGymMemberByDni(rawDni: string): Promise<GymLookup> {
  const dni = normalizeDni(rawDni);
  if (!/^\d{7,8}$/.test(dni)) return { status: "not_found" };

  const db = getPool();
  if (!db) return { status: "unavailable" };

  try {
    const res = await db.query<{ nombre: string; dias: number | null }>(
      `SELECT nombre, dias_restantes AS dias FROM externo.alumnos_vigencia WHERE dni = $1 LIMIT 1`,
      [dni],
    );
    if (res.rows.length === 0) return { status: "not_found" };
    return { status: "found", name: res.rows[0].nombre, daysRemaining: res.rows[0].dias };
  } catch (err) {
    console.error("No se pudo consultar el sistema de Fit Time:", err);
    return { status: "unavailable" };
  }
}

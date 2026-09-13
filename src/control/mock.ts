import Dexie, { type Table } from "dexie";
import type { ControlReglasFila, ControlUsoDiario } from "../db/db";
import type { ControlPlugin } from "./plugin";
import { reglasVacias, type EstadoPermisos, type UsoDia } from "./tipos";
import { diaLocal, desplazarDia } from "./presentacion";

/** Base separada: las muestras nunca se mezclan con el registro real. */
const base = new Dexie("lykari-control-mock");
base.version(1).stores({ reglas: "id", uso: "++id, dia, paquete, [dia+paquete]" });
export const tablasMock = {
  controlReglas: base.table("reglas") as Table<ControlReglasFila, number>,
  controlUsoDiario: base.table("uso") as Table<ControlUsoDiario, number>,
};

const apps = [
  { paquete: "com.zhiliaoapp.musically", nombre: "TikTok", categoria: "social", esSistema: false },
  { paquete: "com.instagram.android", nombre: "Instagram", categoria: "social", esSistema: false },
  { paquete: "org.telegram.messenger", nombre: "Telegram", categoria: "social", esSistema: false },
  { paquete: "com.supercell.clashroyale", nombre: "Clash Royale", categoria: "juego", esSistema: false },
  { paquete: "com.android.chrome", nombre: "Chrome", categoria: "navegador", esSistema: false },
];
// Los esenciales vienen concedidos; los opcionales empiezan apagados para
// mostrar el flujo real (avisos, sección Permisos, concederlos uno a uno).
const permisos: EstadoPermisos = { uso: true, accesibilidad: true, admin: false, superposicion: false, vpn: false, notificaciones: false, noMolestar: false };

function usoDia(dia: string): UsoDia {
  const semilla = Number(dia.slice(-2));
  return { dia, apps: apps.map((app, i) => ({
    paquete: app.paquete, ms: (64 - i * 11 + semilla % 9) * 60_000, aperturas: 16 - i * 3,
  })) };
}

export async function prepararMock(): Promise<void> {
  if (!await tablasMock.controlReglas.get(1)) {
    const reglas = reglasVacias();
    reglas.limites = [
      { paquete: apps[0].paquete, minutosDia: 60, dias: [], activo: true },
      { paquete: apps[1].paquete, minutosDia: 90, aperturasDia: 20, dias: [], activo: true },
    ];
    reglas.modos = [{ id: "sueno-demo", nombre: "Sueño", plantilla: "sueno", horarios: [{ dias: [], desde: "00:00", hasta: "05:00" }], estrategia: "bloquear", apps: apps.slice(0, 4).map((a) => a.paquete), webs: [], silencio: true, activo: true }];
    await tablasMock.controlReglas.put({ id: 1, reglas });
  }
  await base.transaction("rw", tablasMock.controlUsoDiario, async () => {
    await tablasMock.controlUsoDiario.clear();
    const hoy = diaLocal();
    for (let i = 0; i < 62; i++) {
      const dia = desplazarDia(hoy, -i);
      await tablasMock.controlUsoDiario.bulkAdd(usoDia(dia).apps.map((app) => ({ ...app, dia })));
    }
  });
}

export const controlMock: ControlPlugin = {
  async listarApps() { return { apps }; },
  async usoHoy() { return { apps: usoDia(diaLocal()).apps }; },
  async usoRango({ desde, hasta }) {
    const dias: UsoDia[] = [];
    for (let dia = desde; dia <= hasta; dia = desplazarDia(dia, 1)) dias.push(usoDia(dia));
    return { dias };
  },
  async estadoPermisos() { return { ...permisos }; },
  async abrirAjustesPermiso({ tipo }) { permisos[tipo] = true; },
  async guardarReglas() { /* El almacén persiste las reglas en la base de demostración. */ },
  async guardarHashContrasena() {},
  async activarProteccion() {},
  async extensiones(opciones) {
    const extensiones = [{ fecha: Date.now() - 3_600_000, paquete: apps[0].paquete, minutos: 15 }];
    return { extensiones: extensiones.filter((e) => e.fecha >= (opciones?.desde ?? 0)) };
  },
  async intentos(opciones) {
    const intentos = [
      { fecha: Date.now() - 600_000, motivo: "adulto" as const, origen: "ejemplo.test" },
      { fecha: Date.now() - 1_200_000, motivo: "limite" as const, origen: apps[0].paquete },
    ];
    return { intentos: intentos.filter((i) => i.fecha >= (opciones?.desde ?? 0)) };
  },
};

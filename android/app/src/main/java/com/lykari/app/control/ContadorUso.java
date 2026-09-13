package com.lykari.app.control;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

/**
 * Lee el tiempo real en primer plano por app desde `UsageStatsManager`. En vez
 * de `queryUsageStats` (que agrega raro entre días), recorre los eventos
 * MOVE_TO_FOREGROUND/BACKGROUND y suma los intervalos: así el "tiempo de hoy"
 * coincide con lo que ve el usuario.
 *
 * Necesita el permiso especial PACKAGE_USAGE_STATS (Ajustes → Acceso al uso),
 * que no se concede con un diálogo normal; por eso el asistente de permisos
 * abre esa pantalla.
 */
final class ContadorUso {

    private final UsageStatsManager gestor;

    ContadorUso(Context contexto) {
        gestor = (UsageStatsManager) contexto.getApplicationContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
    }

    static long inicioDeHoy() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    static long inicioDeDia(long instante) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(instante);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Milisegundos en primer plano hoy para un paquete. 0 si no hay permiso o datos. */
    long msHoy(String paquete) {
        Map<String, long[]> uso = recorrer(inicioDeHoy(), System.currentTimeMillis());
        long[] v = uso.get(paquete);
        return v == null ? 0 : v[0];
    }

    long aperturasHoy(String paquete) {
        Map<String, long[]> uso = recorrer(inicioDeHoy(), System.currentTimeMillis());
        long[] v = uso.get(paquete);
        return v == null ? 0 : v[1];
    }

    /** Uso de hoy de todas las apps, como el `UsoApp[]` del contrato. */
    JSONArray usoHoy() {
        return aJson(recorrer(inicioDeHoy(), System.currentTimeMillis()));
    }

    /** Uso día por día en el rango [desde, hasta] (inclusive), como `UsoDia[]`. */
    JSONArray usoRango(long desde, long hasta) {
        JSONArray dias = new JSONArray();
        long ahora = System.currentTimeMillis();
        for (long d = inicioDeDia(desde); d <= hasta; d += 24L * 60 * 60 * 1000) {
            long fin = Math.min(d + 24L * 60 * 60 * 1000, ahora);
            if (fin <= d) break;
            Map<String, long[]> uso = recorrer(d, fin);
            try {
                JSONObject dia = new JSONObject();
                dia.put("dia", diaIso(d));
                dia.put("apps", aJson(uso));
                dias.put(dia);
            } catch (JSONException ignorado) {
                // salta el día
            }
        }
        return dias;
    }

    /** paquete → [ms en primer plano, aperturas]. */
    private Map<String, long[]> recorrer(long desde, long hasta) {
        Map<String, long[]> total = new HashMap<>();
        if (gestor == null) return total;
        UsageEvents eventos;
        try {
            // Un poco antes del inicio para captar una app que ya estaba abierta.
            eventos = gestor.queryEvents(desde - 6L * 60 * 60 * 1000, hasta);
        } catch (Exception e) {
            return total;
        }
        Map<String, Long> abiertaDesde = new HashMap<>();
        UsageEvents.Event ev = new UsageEvents.Event();
        while (eventos.hasNextEvent()) {
            eventos.getNextEvent(ev);
            String pkg = ev.getPackageName();
            int tipo = ev.getEventType();
            if (tipo == UsageEvents.Event.MOVE_TO_FOREGROUND
                    || tipo == UsageEvents.Event.ACTIVITY_RESUMED) {
                abiertaDesde.put(pkg, ev.getTimeStamp());
                if (ev.getTimeStamp() >= desde) sumarApertura(total, pkg);
            } else if (tipo == UsageEvents.Event.MOVE_TO_BACKGROUND
                    || tipo == UsageEvents.Event.ACTIVITY_PAUSED
                    || tipo == UsageEvents.Event.ACTIVITY_STOPPED) {
                Long ini = abiertaDesde.remove(pkg);
                if (ini != null) sumarTramo(total, pkg, Math.max(ini, desde), ev.getTimeStamp());
            }
        }
        // Apps que siguen abiertas al final del rango.
        for (Map.Entry<String, Long> e : abiertaDesde.entrySet()) {
            sumarTramo(total, e.getKey(), Math.max(e.getValue(), desde), hasta);
        }
        return total;
    }

    private static void sumarTramo(Map<String, long[]> total, String pkg, long ini, long fin) {
        if (fin <= ini) return;
        long[] v = total.get(pkg);
        if (v == null) { v = new long[]{0, 0}; total.put(pkg, v); }
        v[0] += fin - ini;
    }

    private static void sumarApertura(Map<String, long[]> total, String pkg) {
        long[] v = total.get(pkg);
        if (v == null) { v = new long[]{0, 0}; total.put(pkg, v); }
        v[1] += 1;
    }

    private static JSONArray aJson(Map<String, long[]> uso) {
        JSONArray apps = new JSONArray();
        for (Map.Entry<String, long[]> e : uso.entrySet()) {
            if (e.getValue()[0] <= 0 && e.getValue()[1] <= 0) continue;
            try {
                JSONObject o = new JSONObject();
                o.put("paquete", e.getKey());
                o.put("ms", e.getValue()[0]);
                o.put("aperturas", e.getValue()[1]);
                apps.put(o);
            } catch (JSONException ignorado) {
                // salta la app
            }
        }
        return apps;
    }

    private static String diaIso(long instante) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(instante);
        return String.format(java.util.Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }
}

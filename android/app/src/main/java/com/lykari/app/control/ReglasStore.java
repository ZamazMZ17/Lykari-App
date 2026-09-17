package com.lykari.app.control;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Calendar;

/**
 * Única fuente de reglas para el motor nativo. JS empuja el documento entero
 * (`ReglasControl` de `src/control/tipos.ts`) cada vez que se edita; el
 * servicio de accesibilidad lo lee de acá aunque la app esté cerrada.
 *
 * También guarda lo que solo nace del lado nativo: las extensiones pedidas en
 * la pantalla de bloqueo y los intentos bloqueados (solo paquete o dominio y
 * hora; nunca URLs completas ni texto de chats).
 */
public final class ReglasStore {

    static final String TAG = "LyKariControl";

    private static final String PREFS = "lykari_control";
    private static final String CLAVE_REGLAS = "reglas";
    private static final String CLAVE_HASH = "hash";
    private static final String CLAVE_METODO_ACCESO = "metodoAcceso";
    private static final String CLAVE_EXTENSIONES = "extensiones";
    private static final String CLAVE_INTENTOS = "intentos";
    private static final String CLAVE_GRACIA = "graciaProteccionHasta";
    private static final String CLAVE_CREDITOS_ESTUDIO = "creditos_estudio";

    private static final int MAX_EXTENSIONES = 300;
    private static final int MAX_INTENTOS = 1000;
    private static final int MAX_CREDITOS_ESTUDIO = 300;
    private static final int MINUTOS_CREDITO_ESTUDIO = 15;
    private static final int MAX_CREDITOS_ESTUDIO_DIA = 2;

    private static ReglasStore instancia;

    private final SharedPreferences prefs;
    private JSONObject reglas;

    private ReglasStore(Context contexto) {
        prefs = contexto.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        reglas = parsear(prefs.getString(CLAVE_REGLAS, null));
    }

    public static synchronized ReglasStore de(Context contexto) {
        if (instancia == null) instancia = new ReglasStore(contexto);
        return instancia;
    }

    private static JSONObject parsear(String json) {
        if (json == null) return new JSONObject();
        try {
            return new JSONObject(json);
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    public synchronized JSONObject reglas() {
        return reglas;
    }

    public synchronized void guardarReglas(JSONObject nuevas) {
        reglas = nuevas;
        prefs.edit().putString(CLAVE_REGLAS, nuevas.toString()).apply();
    }

    /* ── Accesos cómodos al documento ─────────────────────────────────── */

    public synchronized JSONObject filtroAdulto() {
        JSONObject f = reglas.optJSONObject("filtroAdulto");
        return f != null ? f : new JSONObject();
    }

    /** Activo salvo que se haya pedido apagarlo y ya pasaron las 24 h. */
    public synchronized boolean filtroAdultoVigente(long ahora) {
        JSONObject f = filtroAdulto();
        if (!f.optBoolean("activo", false)) return false;
        if (f.isNull("apagadoPedidoEn")) return true;
        long pedido = f.optLong("apagadoPedidoEn", 0);
        return pedido <= 0 || ahora < pedido + 24L * 60 * 60 * 1000;
    }

    public synchronized boolean proteccionActiva(long ahora) {
        JSONObject p = reglas.optJSONObject("proteccion");
        if (p == null || !p.optBoolean("activa", false)) return false;
        return ahora >= prefs.getLong(CLAVE_GRACIA, 0);
    }

    /** Tras desactivar con contraseña, unos minutos sin tapar Ajustes para poder desinstalar. */
    public void darGraciaProteccion(long hasta) {
        prefs.edit().putLong(CLAVE_GRACIA, hasta).apply();
    }

    /* ── Contraseña (espejo del hash de Zamly) ────────────────────────── */

    public void guardarHash(String hashHex, String metodo) {
        prefs.edit()
                .putString(CLAVE_HASH, hashHex == null ? null : hashHex.toLowerCase())
                .putString(CLAVE_METODO_ACCESO, "patron".equals(metodo) ? "patron" : "clave")
                .apply();
    }

    public boolean tieneHash() {
        return prefs.getString(CLAVE_HASH, null) != null;
    }

    public boolean usaPatron() {
        return "patron".equals(prefs.getString(CLAVE_METODO_ACCESO, "clave"));
    }

    /** Misma cuenta que `src/db/zamly.ts`: SHA-256 del texto en UTF-8, en hex. */
    public boolean verificar(String contrasena) {
        String guardado = prefs.getString(CLAVE_HASH, null);
        if (guardado == null || contrasena == null) return false;
        return guardado.equals(sha256Hex(contrasena));
    }

    /** El patrón que se dibuja en el bloqueo debe ser el original girado 90° a la derecha. */
    public boolean verificarPatronGirado(String patronGirado) {
        if (!"patron".equals(prefs.getString(CLAVE_METODO_ACCESO, "clave")) || patronGirado == null) return false;
        String[] partes = patronGirado.split("-");
        // índice visto en la cuadrícula girada → índice del patrón que se guardó.
        final int[] inversa = {6, 3, 0, 7, 4, 1, 8, 5, 2};
        StringBuilder original = new StringBuilder();
        for (int i = 0; i < partes.length; i++) {
            try {
                int punto = Integer.parseInt(partes[i]);
                if (punto < 0 || punto > 8) return false;
                if (i > 0) original.append('-');
                original.append(inversa[punto]);
            } catch (NumberFormatException e) { return false; }
        }
        return verificar(original.toString());
    }

    static String sha256Hex(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /* ── Extensiones ──────────────────────────────────────────────────── */

    /** Una única extensión de cinco minutos para todas las apps, por día. */
    public synchronized boolean puedeUsarExtensionHoy() {
        JSONArray lista = parsearLista(prefs.getString(CLAVE_EXTENSIONES, null));
        long hoy = inicioDeHoy();
        for (int i = 0; i < lista.length(); i++) {
            JSONObject previa = lista.optJSONObject(i);
            if (previa != null && previa.optLong("fecha", 0) >= hoy) return false;
        }
        return true;
    }

    public synchronized boolean agregarExtensionUnica(String paquete) {
        if (!puedeUsarExtensionHoy()) return false;
        JSONArray lista = parsearLista(prefs.getString(CLAVE_EXTENSIONES, null));
        JSONObject e = new JSONObject();
        try {
            e.put("fecha", System.currentTimeMillis());
            e.put("paquete", paquete);
            e.put("minutos", 5);
        } catch (JSONException ignorado) {
            return false;
        }
        lista.put(e);
        prefs.edit().putString(CLAVE_EXTENSIONES, recortar(lista, MAX_EXTENSIONES).toString()).apply();
        return true;
    }

    public synchronized JSONArray extensiones(long desde) {
        return filtrarDesde(parsearLista(prefs.getString(CLAVE_EXTENSIONES, null)), desde);
    }

    /** Minutos extra concedidos hoy para ese paquete (o dominio). */
    public synchronized int minutosExtraHoy(String paquete) {
        JSONArray hoy = extensiones(inicioDeHoy());
        int total = 0;
        for (int i = 0; i < hoy.length(); i++) {
            JSONObject e = hoy.optJSONObject(i);
            if (e != null && paquete.equals(e.optString("paquete"))) total += e.optInt("minutos", 0);
        }
        return total;
    }

    /* ── Desbloqueo por estudio ─────────────────────────────────────── */

    /**
     * Crea un crédito de una única app. La WebView nunca elige minutos ni
     * puede saltarse el tope: esta es la autoridad incluso con JS manipulado.
     */
    public synchronized JSONObject registrarDesbloqueoEstudio(String paquete, String origen, Long sesionId) {
        long ahora = System.currentTimeMillis();
        JSONObject resultado = new JSONObject();
        JSONArray creditos = parsearLista(prefs.getString(CLAVE_CREDITOS_ESTUDIO, null));
        int usadosHoy = creditosDeHoy(creditos, inicioDeHoy());
        try {
            resultado.put("concedido", false);
            resultado.put("hastaMs", desbloqueoEstudioHastaMs(paquete));
            resultado.put("restantesHoy", Math.max(0, MAX_CREDITOS_ESTUDIO_DIA - usadosHoy));
            JSONObject puerta = reglas.optJSONObject("puertaEstudio");
            if (puerta == null || !puerta.optBoolean("activa", false)) {
                resultado.put("motivo", "puerta_inactiva");
                return resultado;
            }
            if ("com.whatsapp".equals(paquete) || "com.whatsapp.w4b".equals(paquete)) {
                resultado.put("motivo", "whatsapp_libre");
                return resultado;
            }
            if (!contiene(puerta.optJSONArray("apps"), paquete)) {
                resultado.put("motivo", "app_no_elegida");
                return resultado;
            }
            if (desbloqueoEstudioVigente(paquete)) {
                resultado.put("motivo", "credito_vigente");
                return resultado;
            }
            if (usadosHoy >= MAX_CREDITOS_ESTUDIO_DIA) {
                resultado.put("motivo", "tope_diario");
                return resultado;
            }
            if ("ejercicio".equals(origen) && creditoDeEjercicioHoy(creditos, inicioDeHoy())) {
                resultado.put("motivo", "ejercicio_ya_usado");
                return resultado;
            }
            if (!"quiz".equals(origen) && !"ejercicio".equals(origen)) {
                resultado.put("motivo", "app_no_elegida");
                return resultado;
            }

            long hasta = ahora + MINUTOS_CREDITO_ESTUDIO * 60_000L;
            JSONObject credito = new JSONObject();
            credito.put("paquete", paquete);
            credito.put("origen", origen);
            credito.put("inicio", ahora);
            credito.put("hasta", hasta);
            if (sesionId != null) credito.put("sesionId", sesionId.longValue());
            creditos.put(credito);
            prefs.edit().putString(CLAVE_CREDITOS_ESTUDIO,
                    recortar(creditos, MAX_CREDITOS_ESTUDIO).toString()).apply();
            resultado.put("concedido", true);
            resultado.put("hastaMs", hasta);
            resultado.put("restantesHoy", MAX_CREDITOS_ESTUDIO_DIA - usadosHoy - 1);
            return resultado;
        } catch (JSONException e) {
            return resultado;
        }
    }

    public synchronized boolean desbloqueoEstudioVigente(String paquete) {
        return desbloqueoEstudioHastaMs(paquete) > System.currentTimeMillis();
    }

    public synchronized long desbloqueoEstudioHastaMs(String paquete) {
        JSONArray creditos = parsearLista(prefs.getString(CLAVE_CREDITOS_ESTUDIO, null));
        long hasta = 0;
        for (int i = 0; i < creditos.length(); i++) {
            JSONObject c = creditos.optJSONObject(i);
            if (c != null && paquete.equals(c.optString("paquete"))) {
                hasta = Math.max(hasta, c.optLong("hasta", 0));
            }
        }
        return hasta;
    }

    public synchronized int creditosRestantesEstudioHoy() {
        JSONArray creditos = parsearLista(prefs.getString(CLAVE_CREDITOS_ESTUDIO, null));
        return Math.max(0, MAX_CREDITOS_ESTUDIO_DIA - creditosDeHoy(creditos, inicioDeHoy()));
    }

    private static int creditosDeHoy(JSONArray creditos, long inicioHoy) {
        int total = 0;
        for (int i = 0; i < creditos.length(); i++) {
            JSONObject c = creditos.optJSONObject(i);
            if (c != null && c.optLong("inicio", 0) >= inicioHoy) total++;
        }
        return total;
    }

    private static boolean creditoDeEjercicioHoy(JSONArray creditos, long inicioHoy) {
        for (int i = 0; i < creditos.length(); i++) {
            JSONObject c = creditos.optJSONObject(i);
            if (c != null && c.optLong("inicio", 0) >= inicioHoy
                    && "ejercicio".equals(c.optString("origen"))) return true;
        }
        return false;
    }

    private static boolean contiene(JSONArray lista, String valor) {
        if (lista == null) return false;
        for (int i = 0; i < lista.length(); i++) if (valor.equals(lista.optString(i))) return true;
        return false;
    }

    /* ── Intentos bloqueados ──────────────────────────────────────────── */

    private String ultimoIntentoClave;
    private long ultimoIntentoEn;

    public synchronized void registrarIntento(String motivo, String origen) {
        long ahora = System.currentTimeMillis();
        String clave = motivo + "|" + origen;
        // Un mismo bloqueo dispara muchos eventos seguidos: cuenta como uno.
        if (clave.equals(ultimoIntentoClave) && ahora - ultimoIntentoEn < 60_000) return;
        ultimoIntentoClave = clave;
        ultimoIntentoEn = ahora;
        JSONArray lista = parsearLista(prefs.getString(CLAVE_INTENTOS, null));
        JSONObject e = new JSONObject();
        try {
            e.put("fecha", ahora);
            e.put("motivo", motivo);
            e.put("origen", origen);
        } catch (JSONException ignorado) {
            return;
        }
        lista.put(e);
        prefs.edit().putString(CLAVE_INTENTOS, recortar(lista, MAX_INTENTOS).toString()).apply();
    }

    public synchronized JSONArray intentos(long desde) {
        return filtrarDesde(parsearLista(prefs.getString(CLAVE_INTENTOS, null)), desde);
    }

    /* ── Utilidades ───────────────────────────────────────────────────── */

    static long inicioDeHoy() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private static JSONArray parsearLista(String json) {
        if (json == null) return new JSONArray();
        try {
            return new JSONArray(json);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static JSONArray recortar(JSONArray lista, int max) {
        if (lista.length() <= max) return lista;
        JSONArray r = new JSONArray();
        for (int i = lista.length() - max; i < lista.length(); i++) r.put(lista.opt(i));
        return r;
    }

    private static JSONArray filtrarDesde(JSONArray lista, long desde) {
        JSONArray r = new JSONArray();
        for (int i = 0; i < lista.length(); i++) {
            JSONObject e = lista.optJSONObject(i);
            if (e != null && e.optLong("fecha", 0) >= desde) r.put(e);
        }
        return r;
    }
}

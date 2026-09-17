package com.lykari.app.control;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * El corazón del Control. Corre con la app cerrada y, en cada cambio de
 * ventana, decide si tapar lo que está adelante:
 *
 *  - Límite de tiempo o de aperturas de una app (usa {@link ContadorUso}).
 *  - Modo activo (estudio/sueño/clase).
 *  - Filtro +18: URL y palabras en navegadores, texto visible en apps
 *    vigiladas (Telegram, Reddit…), puertas e invitaciones a grupos. En
 *    TikTok e Instagram solo se aceptan marcas explícitas de la propia app.
 *  - Protección: tapa la pantalla de desinstalar LyKari o de quitarle
 *    permisos/admin/accesibilidad.
 *
 * Las decisiones puras están en {@link Motor}; acá solo se lee la pantalla y
 * se actúa. Nunca guarda URLs ni texto: solo cuenta el intento (paquete o
 * dominio + hora) en {@link ReglasStore}.
 */
public class VigilanteAccesibilidad extends AccessibilityService {

    private ContadorUso contador;

    /** id del campo de dirección por navegador. */
    private static final Map<String, String> BARRA_URL = new HashMap<>();
    static {
        BARRA_URL.put("com.android.chrome", "com.android.chrome:id/url_bar");
        BARRA_URL.put("com.chrome.beta", "com.chrome.beta:id/url_bar");
        BARRA_URL.put("com.brave.browser", "com.brave.browser:id/url_bar");
        BARRA_URL.put("com.sec.android.app.sbrowser", "com.sec.android.app.sbrowser:id/location_bar_edit_text");
        BARRA_URL.put("org.mozilla.firefox", "org.mozilla.firefox:id/mozac_browser_toolbar_url_view");
        BARRA_URL.put("com.microsoft.emmx", "com.microsoft.emmx:id/url_bar");
        BARRA_URL.put("com.opera.browser", "com.opera.browser:id/url_field");
        BARRA_URL.put("com.duckduckgo.mobile.android", "com.duckduckgo.mobile.android:id/omnibarTextInput");
    }

    private String ultimoPaquete = "";
    private long ultimaAccion = 0;
    private long ultimoDnd = 0;
    /** Vuelve a revisar aunque el usuario no cambie de ventana al vencer los 15 min. */
    private final Handler relojEstudio = new Handler(Looper.getMainLooper());
    private Runnable revisionEstudio;
    private String paqueteConCredito = "";
    private long venceCreditoProgramado = 0;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        contador = new ContadorUso(this);
        Log.i(ReglasStore.TAG, "Vigilante conectado");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent evento) {
        if (evento == null || evento.getPackageName() == null) return;
        int tipo = evento.getEventType();
        if (tipo != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                && tipo != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return;

        String paquete = evento.getPackageName().toString();
        if (paquete.equals(getPackageName())) return; // nunca nos tapamos a nosotros

        ReglasStore store = ReglasStore.de(this);
        long ahora = System.currentTimeMillis();

        // Backstop del silencio de los modos mientras el teléfono está en uso
        // (por si se perdió una alarma). Como mucho una vez cada 30 s.
        if (ahora - ultimoDnd > 30_000) {
            ultimoDnd = ahora;
            AplicadorDnd.aplicar(this);
        }

        try {
            // 1. Protección: tapar desinstalar/quitar permisos, aunque sea en Ajustes.
            if (store.proteccionActiva(ahora) && esAjustes(paquete)) {
                if (pantallaAmenazaProteccion()) {
                    registrarYbloquear(store, "proteccion", paquete, "Ajustes",
                            "Esta acción está protegida.", false);
                    return;
                }
            }

            // Las de sistema y la telefonía nunca se tocan (salvo la protección de arriba).
            if (Motor.esEsencial(paquete) || esAjustes(paquete)) return;

            // 2. Filtro +18 (siempre activo si está vigente; no depende de horarios).
            if (store.filtroAdultoVigente(ahora)) {
                String motivoAdulto = revisarAdulto(paquete, store.filtroAdulto());
                if (motivoAdulto != null) {
                    registrarYbloquear(store, "adulto", paquete, tituloApp(paquete),
                            "Este contenido está fuera de lo permitido.", false);
                    return;
                }
            }

            // La puerta se revisa también cuando cambia el contenido: así un
            // crédito que vence con la app abierta no depende de cambiar de app.
            JSONObject pe = store.reglas().optJSONObject("puertaEstudio");
            if (pe != null && pe.optBoolean("activa", false)
                    && contiene(pe.optJSONArray("apps"), paquete)) {
                if (!store.desbloqueoEstudioVigente(paquete)) {
                    registrarYbloquear(store, "estudio", paquete, tituloApp(paquete),
                            "Completa un quiz para abrir esta app durante 15 min.", false);
                    return;
                }
                programarFinCredito(store, paquete, store.desbloqueoEstudioHastaMs(paquete));
            }

            // A partir de acá, solo en cambio de app (no en cada scroll).
            if (tipo != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;

            // 3. Modo activo.
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(ahora);
            JSONArray modos = store.reglas().optJSONArray("modos");
            if (modos != null) {
                for (int i = 0; i < modos.length(); i++) {
                    JSONObject modo = modos.optJSONObject(i);
                    if (modo != null && Motor.modoBloquea(modo, paquete, cal)) {
                        registrarYbloquear(store, "modo", paquete, tituloApp(paquete),
                                "Ahora mismo esta app está en pausa (" + modo.optString("nombre", "modo") + ").",
                                false);
                        return;
                    }
                }
            }

            // 4. Límite de tiempo / aperturas por app.
            JSONObject limite = limitePara(store.reglas().optJSONArray("limites"), paquete, cal);
            if (limite != null) {
                int minutos = limite.optInt("minutosDia", -1);
                if (minutos >= 0) {
                    long permitido = (long) minutos * 60_000
                            + (long) store.minutosExtraHoy(paquete) * 60_000;
                    long usado = contador.msHoy(paquete);
                    if (usado >= permitido) {
                        registrarYbloquear(store, "limite", paquete, tituloApp(paquete),
                                detalleTiempo(usado, permitido), true);
                        return;
                    }
                }
                if (limite.has("aperturasDia") && !limite.isNull("aperturasDia")) {
                    long topeAperturas = limite.optLong("aperturasDia", Long.MAX_VALUE);
                    if (contador.aperturasHoy(paquete) > topeAperturas) {
                        registrarYbloquear(store, "aperturas", paquete, tituloApp(paquete),
                                "Abriste esta app más veces de las que te pusiste hoy.", true);
                        return;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(ReglasStore.TAG, "onAccessibilityEvent", e);
        }
        ultimoPaquete = paquete;
    }

    @Override
    public void onInterrupt() {
        relojEstudio.removeCallbacksAndMessages(null);
    }

    private void programarFinCredito(ReglasStore store, String paquete, long hasta) {
        if (hasta <= System.currentTimeMillis()) return;
        if (paquete.equals(paqueteConCredito) && hasta == venceCreditoProgramado) return;
        if (revisionEstudio != null) relojEstudio.removeCallbacks(revisionEstudio);
        paqueteConCredito = paquete;
        venceCreditoProgramado = hasta;
        revisionEstudio = () -> {
            // No tapa otra app si ya se salió; la puerta la revisará al volver.
            if (paquete.equals(ultimoPaquete) && !store.desbloqueoEstudioVigente(paquete)) {
                registrarYbloquear(store, "estudio", paquete, tituloApp(paquete),
                        "Tus 15 min terminaron.", false);
            }
        };
        relojEstudio.postDelayed(revisionEstudio, Math.max(0, hasta - System.currentTimeMillis()));
    }

    /* ── +18 ──────────────────────────────────────────────────────────── */

    /** Devuelve el sub-motivo si hay que bloquear por +18, o null. */
    private String revisarAdulto(String paquete, JSONObject filtro) {
        JSONArray palabras = filtro.optJSONArray("palabras");
        JSONArray dominios = filtro.optJSONArray("dominios");

        // Navegadores: leer la barra de direcciones.
        if (BARRA_URL.containsKey(paquete)) {
            String url = leerUrl(paquete);
            if (url != null && !url.isEmpty()) {
                String host = Motor.host(url);
                if (dominios != null) {
                    for (int i = 0; i < dominios.length(); i++) {
                        if (Motor.coincideDominio(host, dominios.optString(i))) return "dominio";
                    }
                }
                if (Motor.esDominioPuerta(host) && filtro.optBoolean("bloquearPuertas", true)) return "puerta";
                if (Motor.esInvitacionTelegram(url)) return "puerta";
                if (Motor.esSubredditPuerta(url) && filtro.optBoolean("bloquearPuertas", true)) return "puerta";
                if (Motor.esTextoAdulto(url, palabras)) return "url";
                if (filtro.optBoolean("forzarSafeSearch", true) && Motor.esBuscador(host)) {
                    String seguro = Motor.urlConSafeSearch(url);
                    if (seguro != null) return "safesearch"; // el motor podría reescribir; por ahora bloquea la búsqueda insegura
                }
            }
            return null;
        }

        // Navegador desconocido: bloquear entero si no está permitido.
        JSONArray permitidos = filtro.optJSONArray("navegadoresPermitidos");
        if (esNavegador(paquete) && !contiene(permitidos, paquete)) {
            return "navegador";
        }

        // Apps vigiladas: leer el texto visible.
        if (contiene(filtro.optJSONArray("appsVigiladas"), paquete)) {
            String texto = textoVisible();
            if (texto != null && !texto.isEmpty()) {
                if (filtro.optBoolean("etiquetasSensibles", true) && Motor.tieneEtiquetaSensible(texto)) {
                    return "sensible";
                }
                // En TikTok e Instagram, palabras de la publicación, las
                // recomendaciones y los controles no son evidencia suficiente
                // para cerrar la app. Solo vale la marca explícita anterior.
                if (!Motor.usaSoloMarcasSensibles(paquete) && Motor.esTextoAdulto(texto, palabras)) return "texto";
                // Chats/canales marcados a mano por el usuario.
                JSONArray chats = filtro.optJSONArray("chatsBloqueados");
                if (!Motor.usaSoloMarcasSensibles(paquete) && chats != null) {
                    String t = Motor.normalizarConEspacios(texto);
                    for (int i = 0; i < chats.length(); i++) {
                        String c = Motor.normalizarConEspacios(chats.optString(i));
                        if (!c.isEmpty() && t.contains(c)) return "chat";
                    }
                }
            }
        }
        return null;
    }

    private String leerUrl(String paquete) {
        AccessibilityNodeInfo raiz = getRootInActiveWindow();
        if (raiz == null) return null;
        String id = BARRA_URL.get(paquete);
        try {
            List<AccessibilityNodeInfo> nodos = raiz.findAccessibilityNodeInfosByViewId(id);
            if (nodos != null && !nodos.isEmpty() && nodos.get(0).getText() != null) {
                return nodos.get(0).getText().toString();
            }
        } catch (Exception ignorado) {
            // algunos navegadores no exponen el id
        }
        return null;
    }

    /** Junta el texto visible de la ventana (con tope, para no leer de más). */
    private String textoVisible() {
        AccessibilityNodeInfo raiz = getRootInActiveWindow();
        if (raiz == null) return "";
        StringBuilder sb = new StringBuilder();
        ArrayDeque<AccessibilityNodeInfo> cola = new ArrayDeque<>();
        cola.add(raiz);
        int nodos = 0;
        while (!cola.isEmpty() && sb.length() < 4000 && nodos < 400) {
            AccessibilityNodeInfo n = cola.poll();
            if (n == null) continue;
            nodos++;
            CharSequence t = n.getText();
            if (t != null && t.length() > 0) sb.append(t).append(' ');
            CharSequence d = n.getContentDescription();
            if (d != null && d.length() > 0) sb.append(d).append(' ');
            for (int i = 0; i < n.getChildCount(); i++) {
                AccessibilityNodeInfo h = n.getChild(i);
                if (h != null) cola.add(h);
            }
        }
        return sb.toString();
    }

    /* ── Protección ───────────────────────────────────────────────────── */

    /** ¿La pantalla de Ajustes está por desinstalar LyKari o quitarle permisos? */
    private boolean pantallaAmenazaProteccion() {
        AccessibilityNodeInfo raiz = getRootInActiveWindow();
        if (raiz == null) return false;
        String texto = Motor.normalizarConEspacios(textoDe(raiz));
        boolean mencionaLykari = texto.contains("lykari");
        boolean accionPeligrosa =
                texto.contains("desinstalar") || texto.contains("uninstall")
                || texto.contains("forzar detencion") || texto.contains("force stop")
                || texto.contains("quitar permisos") || texto.contains("desactivar")
                || texto.contains("deactivate") || texto.contains("device admin")
                || texto.contains("administrador de dispositivo")
                || texto.contains("borrar datos") || texto.contains("clear data");
        // La pantalla de accesibilidad de nuestro propio servicio.
        boolean nuestraAccesibilidad = texto.contains("lykari") && texto.contains("accesibilidad");
        return (mencionaLykari && accionPeligrosa) || nuestraAccesibilidad;
    }

    private String textoDe(AccessibilityNodeInfo raiz) {
        StringBuilder sb = new StringBuilder();
        ArrayDeque<AccessibilityNodeInfo> cola = new ArrayDeque<>();
        cola.add(raiz);
        int nodos = 0;
        while (!cola.isEmpty() && nodos < 300) {
            AccessibilityNodeInfo n = cola.poll();
            if (n == null) continue;
            nodos++;
            if (n.getText() != null) sb.append(n.getText()).append(' ');
            if (n.getContentDescription() != null) sb.append(n.getContentDescription()).append(' ');
            for (int i = 0; i < n.getChildCount(); i++) {
                AccessibilityNodeInfo h = n.getChild(i);
                if (h != null) cola.add(h);
            }
        }
        return sb.toString();
    }

    /* ── Acción ───────────────────────────────────────────────────────── */

    private void registrarYbloquear(ReglasStore store, String motivo, String paquete,
                                    String titulo, String detalle, boolean extensible) {
        long ahora = System.currentTimeMillis();
        // Anti-rebote: no relanzar el mismo bloqueo cada pocos ms.
        if (ahora - ultimaAccion < 1200 && paquete.equals(ultimoPaquete)) return;
        ultimaAccion = ahora;
        ultimoPaquete = paquete;

        String origen = motivo.equals("web") ? paquete : paquete;
        store.registrarIntento(motivo, origen);

        if (motivo.equals("proteccion")) {
            // No abrimos otra pantalla: solo sacamos al usuario de Ajustes.
            performGlobalAction(GLOBAL_ACTION_HOME);
            return;
        }

        Intent i = new Intent(this, PantallaBloqueo.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        i.putExtra(PantallaBloqueo.EXTRA_MOTIVO, motivo);
        i.putExtra(PantallaBloqueo.EXTRA_ORIGEN, origen);
        i.putExtra(PantallaBloqueo.EXTRA_TITULO, titulo);
        i.putExtra(PantallaBloqueo.EXTRA_DETALLE, detalle);
        i.putExtra(PantallaBloqueo.EXTRA_EXTENSIBLE, extensible);
        startActivity(i);
    }

    /* ── Utilidades ───────────────────────────────────────────────────── */

    private JSONObject limitePara(JSONArray limites, String paquete, Calendar ahora) {
        if (limites == null) return null;
        int dia = ahora.get(Calendar.DAY_OF_WEEK) - 1;
        for (int i = 0; i < limites.length(); i++) {
            JSONObject l = limites.optJSONObject(i);
            if (l == null || !paquete.equals(l.optString("paquete"))) continue;
            if (!l.optBoolean("activo", true)) continue;
            JSONArray dias = l.optJSONArray("dias");
            if (dias != null && dias.length() > 0) {
                boolean aplica = false;
                for (int k = 0; k < dias.length(); k++) if (dias.optInt(k) == dia) aplica = true;
                if (!aplica) continue;
            }
            return l;
        }
        return null;
    }

    private static String detalleTiempo(long usadoMs, long permitidoMs) {
        long usoMin = usadoMs / 60_000;
        long topeMin = permitidoMs / 60_000;
        return texto(usoMin) + " de " + texto(topeMin) + " hoy.";
    }

    private static String texto(long min) {
        if (min >= 60) {
            long h = min / 60, m = min % 60;
            return m == 0 ? h + " h" : h + " h " + m + " min";
        }
        return min + " min";
    }

    private boolean esAjustes(String paquete) {
        return paquete.equals("com.android.settings")
                || paquete.equals("com.samsung.android.settings")
                || paquete.startsWith("com.android.settings")
                || paquete.equals("com.google.android.packageinstaller")
                || paquete.equals("com.android.packageinstaller");
    }

    private boolean esNavegador(String paquete) {
        return paquete.contains("browser") || paquete.contains("chrome")
                || paquete.contains("firefox") || paquete.contains("opera")
                || paquete.contains("mozilla") || paquete.equals("com.microsoft.emmx");
    }

    private String tituloApp(String paquete) {
        try {
            return getPackageManager().getApplicationLabel(
                    getPackageManager().getApplicationInfo(paquete, 0)).toString();
        } catch (Exception e) {
            return paquete;
        }
    }

    private static boolean contiene(JSONArray lista, String valor) {
        if (lista == null) return false;
        for (int i = 0; i < lista.length(); i++) if (valor.equals(lista.optString(i))) return true;
        return false;
    }
}

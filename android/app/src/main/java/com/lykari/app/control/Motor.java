package com.lykari.app.control;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.Normalizer;
import java.util.Calendar;
import java.util.Locale;

/**
 * Decisiones sin efectos: ¿qué modo está activo?, ¿este paquete está en la
 * lista?, ¿este texto o dominio es +18? Es el espejo en Java de
 * `src/control/reglas.ts`; los casos de `src/control/casos.json` valen para
 * los dos lados.
 *
 * No toca reglas de uso/tiempo: de eso se encarga el servicio con los datos
 * de UsageStats. Acá solo viven decisiones puras sobre las reglas y el texto.
 */
public final class Motor {

    private Motor() {}

    /** Paquetes que un modo "permitir" nunca bloquea, ni el filtro tapa. */
    static final String[] SIEMPRE_PERMITIDAS = {
        "com.lykari.app",
        "com.android.systemui",
        "com.android.settings",
        "com.android.phone",
        "com.android.server.telecom",
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "com.google.android.contacts",
        "com.samsung.android.app.contacts",
        "com.android.emergency",
        "com.android.launcher",
        "com.android.launcher3",
    };

    /**
     * En estas redes, la pantalla solo se revisa para marcas explícitas que
     * pone la propia app. Sus publicaciones y controles mezclan texto fuera
     * de contexto, así que no se analizan por palabras sueltas.
     */
    static final String[] APPS_SOLO_MARCAS_SENSIBLES = {
        "com.instagram.android",
        "com.zhiliaoapp.musically",
    };

    /**
     * Términos +18 inequívocos. Se buscan dentro del texto "compactado" (sin
     * espacios, acentos ni sustituciones tipo p0rn), así que no pueden ser
     * palabras que aparezcan dentro de otras normales.
     */
    static final String[] PALABRAS_ADULTO_BASE = {
        "porn", "xxx", "nsfw", "onlyfans", "fansly", "hentai", "xvideos", "xnxx",
        "pornhub", "xhamster", "redtube", "youporn", "brazzers", "erome", "rule34",
        "nopor", "sexcam", "camgirl", "stripchat", "chaturbate", "bongacams", "livejasmin",
        "spankbang", "eporner", "motherless", "nhentai", "hanime", "javhd", "leakedpacks",
        "packsfiltrados", "contenidoparaadultos", "onlyfansleaks", "fapello", "thothub",
        "coomer", "kemono", "packsdenudes", "packshot",
    };

    /** Términos cortos o ambiguos: solo cuentan como palabra completa. */
    static final String[] PALABRAS_ADULTO_ENTERAS = {
        "porno", "sexo", "sexual", "nsfw", "milf", "nude", "nudes", "tetas", "culonas",
        "putas", "puta", "18+", "+18", "packs", "pack", "hot", "xxx",
    };

    /** Marcas que las propias apps ponen sobre contenido sensible. */
    static final String[] ETIQUETAS_SENSIBLES = {
        "nsfw", "18+", "+18", "contenido sensible", "sensitive content", "contenido para adultos",
        "adult content", "contenido explicito", "explicit content", "solo para adultos",
        "mature content", "este canal no se puede mostrar", "this channel can't be displayed",
        "may contain sensitive", "puede incluir contenido sensible", "ver contenido sensible",
        "show sensitive content", "media may contain",
    };

    /**
     * Puertas: sitios que no son +18 en sí, pero cuyo uso típico es llegar a
     * eso (catálogos de canales de Telegram, chats con desconocidos).
     */
    static final String[] DOMINIOS_PUERTA = {
        "tgstat.com", "tgstat.ru", "telegramchannels.me", "telegram-group.com", "tlgrm.eu",
        "telegramic.org", "telemetr.io", "combot.org", "tdirectory.me", "telegram-store.com",
        "telegramgroups.xyz", "groupsor.link", "omegle.com", "ome.tv", "chatroulette.com",
        "emeraldchat.com", "chathub.cam", "monkey.app", "azar.live", "coomeet.com",
    };

    /** Subreddits que Reddit marca "over18". Se detecta por la ruta /r/<sub>. */
    static final String[] SUBREDDITS_PUERTA = {
        "nsfw", "gonewild", "porn", "realgirls", "nsfw_gif", "rule34", "hentai", "cumsluts",
        "boobs", "ass", "pussy", "milf", "onlyfans", "nsfwhardcore",
    };

    /* ── Modos ────────────────────────────────────────────────────────── */

    /** ¿El horario cubre este instante? Soporta cruce de medianoche. */
    static boolean horarioActivo(JSONObject horario, Calendar ahora) {
        int inicio = minutos(horario.optString("desde", "00:00"));
        int fin = minutos(horario.optString("hasta", "00:00"));
        if (inicio == fin) return false;
        int actual = ahora.get(Calendar.HOUR_OF_DAY) * 60 + ahora.get(Calendar.MINUTE);
        int dia = (ahora.get(Calendar.DAY_OF_WEEK) - 1); // Calendar: 1=domingo → 0=domingo
        JSONArray dias = horario.optJSONArray("dias");
        if (inicio < fin) {
            return aplicaDia(dias, dia) && actual >= inicio && actual < fin;
        }
        // Cruza medianoche: la parte tras las 00:00 pertenece al día anterior.
        if (actual >= inicio && aplicaDia(dias, dia)) return true;
        int diaAyer = (dia + 6) % 7;
        return actual < fin && aplicaDia(dias, diaAyer);
    }

    private static boolean aplicaDia(JSONArray dias, int dia) {
        if (dias == null || dias.length() == 0) return true;
        for (int i = 0; i < dias.length(); i++) {
            if (dias.optInt(i, -1) == dia) return true;
        }
        return false;
    }

    private static int minutos(String hhmm) {
        try {
            return Integer.parseInt(hhmm.substring(0, 2)) * 60 + Integer.parseInt(hhmm.substring(3, 5));
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * ¿Este modo bloquea este paquete ahora mismo? "bloquear" tapa los de la
     * lista; "permitir" tapa todo lo que no esté en la lista (ni sea esencial).
     */
    static boolean modoBloquea(JSONObject modo, String paquete, Calendar ahora) {
        if (!modo.optBoolean("activo", false)) return false;
        JSONArray horarios = modo.optJSONArray("horarios");
        boolean enHorario = false;
        if (horarios != null) {
            for (int i = 0; i < horarios.length(); i++) {
                JSONObject h = horarios.optJSONObject(i);
                if (h != null && horarioActivo(h, ahora)) { enHorario = true; break; }
            }
        }
        if (!enHorario) return false;
        if (esEsencial(paquete)) return false;
        boolean enLista = contiene(modo.optJSONArray("apps"), paquete);
        boolean permitir = "permitir".equals(modo.optString("estrategia", "bloquear"));
        return permitir ? !enLista : enLista;
    }

    /** ¿Hay algún modo activo con silencio cuyo horario cubra este instante? */
    static boolean algunModoSilenciaAhora(JSONArray modos, Calendar ahora) {
        if (modos == null) return false;
        for (int i = 0; i < modos.length(); i++) {
            JSONObject m = modos.optJSONObject(i);
            if (m == null || !m.optBoolean("activo", false) || !m.optBoolean("silencio", false)) continue;
            JSONArray horarios = m.optJSONArray("horarios");
            if (horarios == null) continue;
            for (int k = 0; k < horarios.length(); k++) {
                JSONObject h = horarios.optJSONObject(k);
                if (h != null && horarioActivo(h, ahora)) return true;
            }
        }
        return false;
    }

    /**
     * Minutos hasta el próximo cambio de estado de silencio (un modo empieza o
     * termina), mirando dentro de las próximas 24 h. Sirve para programar la
     * alarma que enciende/apaga No molestar aunque el teléfono esté quieto.
     * Devuelve 1..1440; si no encuentra nada, 60 como colchón.
     */
    static int minutosAlProximoCambio(JSONArray modos, Calendar ahora) {
        boolean estadoAhora = algunModoSilenciaAhora(modos, ahora);
        Calendar t = (Calendar) ahora.clone();
        for (int m = 1; m <= 24 * 60; m++) {
            t.add(Calendar.MINUTE, 1);
            if (algunModoSilenciaAhora(modos, t) != estadoAhora) return m;
        }
        return 60;
    }

    static boolean esEsencial(String paquete) {
        for (String p : SIEMPRE_PERMITIDAS) if (p.equals(paquete)) return true;
        return false;
    }

    /** TikTok e Instagram no se bloquean por texto suelto de publicaciones. */
    static boolean usaSoloMarcasSensibles(String paquete) {
        for (String p : APPS_SOLO_MARCAS_SENSIBLES) if (p.equals(paquete)) return true;
        return false;
    }

    private static boolean contiene(JSONArray lista, String valor) {
        if (lista == null) return false;
        for (int i = 0; i < lista.length(); i++) {
            if (valor.equals(lista.optString(i))) return true;
        }
        return false;
    }

    /* ── Texto +18 ────────────────────────────────────────────────────── */

    /**
     * Deja el texto en minúsculas, sin acentos, sin espacios ni signos, y
     * deshace las sustituciones típicas (p0rn → porn, s3xo → sexo, xn|x).
     */
    static String compactar(String texto) {
        if (texto == null) return "";
        String base = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        StringBuilder sb = new StringBuilder(base.length());
        for (int i = 0; i < base.length(); i++) {
            char c = base.charAt(i);
            switch (c) {
                case '0': sb.append('o'); break;
                case '1': sb.append('i'); break;
                case '3': sb.append('e'); break;
                case '4': sb.append('a'); break;
                case '5': sb.append('s'); break;
                case '7': sb.append('t'); break;
                case '@': sb.append('a'); break;
                case '$': sb.append('s'); break;
                default:
                    if (Character.isLetterOrDigit(c)) sb.append(c);
            }
        }
        return sb.toString();
    }

    /** Igual que compactar pero conservando espacios simples, para "palabra entera". */
    static String normalizarConEspacios(String texto) {
        if (texto == null) return "";
        String base = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return base.replaceAll("[^a-z0-9+]+", " ").trim();
    }

    /** ¿El texto visible contiene un término +18? `extra` = palabras del usuario. */
    static boolean esTextoAdulto(String texto, JSONArray extra) {
        String compacto = compactar(texto);
        for (String p : PALABRAS_ADULTO_BASE) if (compacto.contains(p)) return true;
        String conEspacios = " " + normalizarConEspacios(texto) + " ";
        for (String p : PALABRAS_ADULTO_ENTERAS) {
            if (conEspacios.contains(" " + p + " ")) return true;
        }
        if (extra != null) {
            for (int i = 0; i < extra.length(); i++) {
                String p = compactar(extra.optString(i));
                if (!p.isEmpty() && compacto.contains(p)) return true;
            }
        }
        return false;
    }

    /** ¿La app puso una marca de contenido sensible en pantalla? */
    static boolean tieneEtiquetaSensible(String texto) {
        String t = normalizarConEspacios(texto);
        for (String e : ETIQUETAS_SENSIBLES) {
            if (t.contains(normalizarConEspacios(e))) return true;
        }
        return false;
    }

    /* ── Dominios y URLs ──────────────────────────────────────────────── */

    /** Quita esquema, "www.", puerto y ruta; deja el host en minúsculas. */
    static String host(String url) {
        if (url == null) return "";
        String u = url.trim().toLowerCase(Locale.ROOT);
        int esquema = u.indexOf("://");
        if (esquema >= 0) u = u.substring(esquema + 3);
        int barra = u.indexOf('/');
        if (barra >= 0) u = u.substring(0, barra);
        int arroba = u.indexOf('@');
        if (arroba >= 0) u = u.substring(arroba + 1);
        int puerto = u.indexOf(':');
        if (puerto >= 0) u = u.substring(0, puerto);
        if (u.startsWith("www.")) u = u.substring(4);
        return u;
    }

    /** `host` es igual a `dominio` o un subdominio suyo. */
    static boolean coincideDominio(String host, String dominio) {
        if (host == null || dominio == null || dominio.isEmpty()) return false;
        return host.equals(dominio) || host.endsWith("." + dominio);
    }

    static boolean esDominioPuerta(String host) {
        for (String d : DOMINIOS_PUERTA) if (coincideDominio(host, d)) return true;
        return false;
    }

    /** ¿La URL es una invitación a un grupo de Telegram? (t.me/joinchat, t.me/+…) */
    static boolean esInvitacionTelegram(String url) {
        if (url == null) return false;
        String u = url.toLowerCase(Locale.ROOT);
        String h = host(u);
        if (!coincideDominio(h, "t.me") && !coincideDominio(h, "telegram.me")) return false;
        return u.contains("/joinchat") || u.contains("/+") || u.contains("t.me/+");
    }

    /** ¿La URL de Reddit apunta a un subreddit marcado como puerta NSFW? */
    static boolean esSubredditPuerta(String url) {
        if (url == null) return false;
        String u = url.toLowerCase(Locale.ROOT);
        int i = u.indexOf("/r/");
        if (i < 0) return false;
        String resto = u.substring(i + 3);
        int fin = resto.length();
        for (int k = 0; k < resto.length(); k++) {
            char c = resto.charAt(k);
            if (!(Character.isLetterOrDigit(c) || c == '_')) { fin = k; break; }
        }
        String sub = resto.substring(0, fin);
        for (String s : SUBREDDITS_PUERTA) if (s.equals(sub)) return true;
        return false;
    }

    /* ── SafeSearch ───────────────────────────────────────────────────── */

    /** ¿Es un buscador cuyo SafeSearch conviene forzar? */
    static boolean esBuscador(String host) {
        return host.contains("google.") || coincideDominio(host, "bing.com")
                || coincideDominio(host, "duckduckgo.com") || coincideDominio(host, "yandex.com")
                || coincideDominio(host, "youtube.com") || coincideDominio(host, "m.youtube.com");
    }

    /** ¿La URL del buscador ya trae SafeSearch activo? Si no, hay que redirigir. */
    static boolean tieneSafeSearch(String url) {
        if (url == null) return false;
        String u = url.toLowerCase(Locale.ROOT);
        String h = host(u);
        if (h.contains("google.")) return u.contains("safe=active");
        if (coincideDominio(h, "bing.com")) return u.contains("adlt=strict");
        if (coincideDominio(h, "duckduckgo.com")) return u.contains("kp=1");
        if (coincideDominio(h, "yandex.com")) return u.contains("family=yes") || u.contains("fyandex=1");
        return true; // navegadores/otros: no lo forzamos por URL
    }

    /** URL equivalente con SafeSearch forzado, o null si no aplica. */
    static String urlConSafeSearch(String url) {
        if (url == null) return null;
        String h = host(url);
        if (tieneSafeSearch(url)) return null;
        String sep = url.contains("?") ? "&" : "?";
        if (h.contains("google.")) return url + sep + "safe=active";
        if (coincideDominio(h, "bing.com")) return url + sep + "adlt=strict";
        if (coincideDominio(h, "duckduckgo.com")) return url + sep + "kp=1";
        if (coincideDominio(h, "yandex.com")) return url + sep + "family=yes";
        return null;
    }
}

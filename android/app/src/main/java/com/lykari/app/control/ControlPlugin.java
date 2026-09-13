package com.lykari.app.control;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.net.VpnService;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Puente entre la UI (JS, `src/control/plugin.ts`) y el motor nativo. JS solo
 * edita reglas y lee datos; quien bloquea es el servicio de accesibilidad, que
 * sigue vivo con la app cerrada. Por eso cada cambio se empuja entero con
 * `guardarReglas`, que lo persiste en {@link ReglasStore} y, si hace falta,
 * prende o apaga el filtro DNS.
 */
@CapacitorPlugin(name = "Control")
public class ControlPlugin extends Plugin {

    /* ── Apps y uso ───────────────────────────────────────────────────── */

    @PluginMethod
    public void listarApps(PluginCall call) {
        boolean incluirSistema = Boolean.TRUE.equals(call.getBoolean("incluirSistema", false));
        PackageManager pm = getContext().getPackageManager();
        JSONArray apps = new JSONArray();
        for (ApplicationInfo info : pm.getInstalledApplications(0)) {
            boolean sistema = (info.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            boolean lanzable = pm.getLaunchIntentForPackage(info.packageName) != null;
            if (!incluirSistema && sistema && !lanzable) continue;
            if (info.packageName.equals(getContext().getPackageName())) continue;
            try {
                JSObject o = new JSObject();
                o.put("paquete", info.packageName);
                o.put("nombre", pm.getApplicationLabel(info).toString());
                o.put("categoria", categoria(info));
                o.put("esSistema", sistema);
                String icono = iconoBase64(pm.getApplicationIcon(info));
                if (icono != null) o.put("iconoBase64", icono);
                apps.put(o);
            } catch (Exception ignorado) {
                // salta la app problemática
            }
        }
        JSObject r = new JSObject();
        r.put("apps", apps);
        call.resolve(r);
    }

    @PluginMethod
    public void usoHoy(PluginCall call) {
        JSObject r = new JSObject();
        r.put("apps", new ContadorUso(getContext()).usoHoy());
        call.resolve(r);
    }

    @PluginMethod
    public void usoRango(PluginCall call) {
        String desde = call.getString("desde");
        String hasta = call.getString("hasta");
        if (desde == null || hasta == null) { call.reject("Faltan desde/hasta"); return; }
        long ini = diaAMillis(desde);
        long fin = diaAMillis(hasta) + 24L * 60 * 60 * 1000 - 1;
        JSObject r = new JSObject();
        r.put("dias", new ContadorUso(getContext()).usoRango(ini, fin));
        call.resolve(r);
    }

    /* ── Reglas y contraseña ──────────────────────────────────────────── */

    @PluginMethod
    public void guardarReglas(PluginCall call) {
        JSObject reglas = call.getObject("reglas");
        if (reglas == null) { call.reject("Faltan reglas"); return; }
        ReglasStore store = ReglasStore.de(getContext());
        store.guardarReglas(reglas);
        sincronizarFiltroDns(store);
        call.resolve();
    }

    @PluginMethod
    public void guardarHashContrasena(PluginCall call) {
        String hash = call.getString("hash");
        ReglasStore.de(getContext()).guardarHash(hash);
        call.resolve();
    }

    @PluginMethod
    public void activarProteccion(PluginCall call) {
        boolean activa = Boolean.TRUE.equals(call.getBoolean("activa", false));
        DevicePolicyManager dpm = (DevicePolicyManager) getContext()
                .getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(getContext(), AdminReceptor.class);
        if (activa) {
            if (dpm != null && dpm.isAdminActive(admin)) { call.resolve(); return; }
            Intent i = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            i.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
            i.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "LyKari usa el administrador para que no puedas desinstalarla por impulso.");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } else {
            // JS ya verificó la contraseña. Damos unos minutos de gracia para que la
            // accesibilidad no tape la pantalla de desinstalar mientras tanto.
            ReglasStore.de(getContext()).darGraciaProteccion(System.currentTimeMillis() + 10L * 60 * 1000);
            if (dpm != null && dpm.isAdminActive(admin)) dpm.removeActiveAdmin(admin);
        }
        call.resolve();
    }

    /* ── Permisos ─────────────────────────────────────────────────────── */

    @PluginMethod
    public void estadoPermisos(PluginCall call) {
        JSObject r = new JSObject();
        r.put("uso", tieneAccesoUso());
        r.put("accesibilidad", accesibilidadActiva());
        r.put("admin", adminActivo());
        r.put("superposicion", Settings.canDrawOverlays(getContext()));
        r.put("vpn", VpnService.prepare(getContext()) == null);
        r.put("notificaciones", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(r);
    }

    @PluginMethod
    public void abrirAjustesPermiso(PluginCall call) {
        String tipo = call.getString("tipo", "");
        Intent i = null;
        switch (tipo) {
            case "uso":
                i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                break;
            case "accesibilidad":
                i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                break;
            case "superposicion":
                i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                break;
            case "notificaciones":
                i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                break;
            case "admin": {
                ComponentName admin = new ComponentName(getContext(), AdminReceptor.class);
                i = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                        .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
                break;
            }
            case "vpn": {
                Intent preparar = VpnService.prepare(getContext());
                if (preparar != null) {
                    i = preparar; // diálogo de permiso de VPN
                } else {
                    arrancarFiltro(); // ya autorizada: solo la levantamos
                    call.resolve();
                    return;
                }
                break;
            }
            default:
                call.reject("Permiso desconocido: " + tipo);
                return;
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    /* ── Extensiones e intentos ───────────────────────────────────────── */

    @PluginMethod
    public void extensiones(PluginCall call) {
        long desde = call.getLong("desde", 0L);
        JSObject r = new JSObject();
        r.put("extensiones", ReglasStore.de(getContext()).extensiones(desde));
        call.resolve(r);
    }

    @PluginMethod
    public void intentos(PluginCall call) {
        long desde = call.getLong("desde", 0L);
        JSObject r = new JSObject();
        r.put("intentos", ReglasStore.de(getContext()).intentos(desde));
        call.resolve(r);
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    private void sincronizarFiltroDns(ReglasStore store) {
        boolean vigente = store.filtroAdultoVigente(System.currentTimeMillis());
        if (vigente) {
            if (VpnService.prepare(getContext()) == null) arrancarFiltro();
            // Si aún no está autorizada, la UI muestra el permiso "vpn" pendiente.
        } else {
            Intent i = new Intent(getContext(), FiltroDns.class);
            i.setAction(FiltroDns.ACCION_DETENER);
            getContext().startService(i);
        }
    }

    private void arrancarFiltro() {
        Intent i = new Intent(getContext(), FiltroDns.class);
        i.setAction(FiltroDns.ACCION_INICIAR);
        getContext().startService(i);
    }

    private boolean tieneAccesoUso() {
        try {
            android.app.AppOpsManager ops = (android.app.AppOpsManager)
                    getContext().getSystemService(Context.APP_OPS_SERVICE);
            int modo = ops.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), getContext().getPackageName());
            return modo == android.app.AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean accesibilidadActiva() {
        String activados = Settings.Secure.getString(getContext().getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (activados == null) return false;
        String nuestro = getContext().getPackageName() + "/" + VigilanteAccesibilidad.class.getName();
        return activados.contains(nuestro) || activados.contains(VigilanteAccesibilidad.class.getName());
    }

    private boolean adminActivo() {
        DevicePolicyManager dpm = (DevicePolicyManager) getContext()
                .getSystemService(Context.DEVICE_POLICY_SERVICE);
        return dpm != null && dpm.isAdminActive(new ComponentName(getContext(), AdminReceptor.class));
    }

    private static String categoria(ApplicationInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && info.category >= 0) {
            switch (info.category) {
                case ApplicationInfo.CATEGORY_GAME: return "juego";
                case ApplicationInfo.CATEGORY_SOCIAL: return "social";
                case ApplicationInfo.CATEGORY_VIDEO: return "video";
                case ApplicationInfo.CATEGORY_AUDIO: return "audio";
                case ApplicationInfo.CATEGORY_PRODUCTIVITY: return "productividad";
                default: return "otra";
            }
        }
        return "otra";
    }

    private static String iconoBase64(Drawable d) {
        try {
            int lado = 96;
            Bitmap bmp = Bitmap.createBitmap(lado, lado, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(bmp);
            d.setBounds(0, 0, lado, lado);
            d.draw(c);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
            bmp.recycle();
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    private static long diaAMillis(String iso) {
        try {
            String[] p = iso.split("-");
            java.util.Calendar c = java.util.Calendar.getInstance();
            c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 0, 0, 0);
            c.set(java.util.Calendar.MILLISECOND, 0);
            return c.getTimeInMillis();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }
}

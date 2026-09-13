package com.lykari.app.control;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.Calendar;

/**
 * Enciende y apaga No molestar según los modos con silencio (Sueño, En clase,
 * Estudio). "Silencio" aquí es {@code INTERRUPTION_FILTER_ALARMS}: se callan
 * llamadas, mensajes y notificaciones, pero la alarma del despertador sí suena
 * (para no tapar el despertador durante el modo Sueño).
 *
 * Solo toca el estado si fuimos nosotros quienes silenciamos: si el usuario
 * puso No molestar a mano, no se lo quitamos.
 */
final class AplicadorDnd {

    private static final String PREFS = "lykari_control";
    private static final String CLAVE_NOSOTROS = "dndPuestoPorLykari";

    private AplicadorDnd() {}

    static boolean tieneAcceso(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.isNotificationPolicyAccessGranted();
    }

    /** Calcula el estado deseado desde las reglas y lo aplica. */
    static void aplicar(Context contexto) {
        Context c = contexto.getApplicationContext();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.isNotificationPolicyAccessGranted()) return;

        boolean debeSilenciar = Motor.algunModoSilenciaAhora(
                ReglasStore.de(c).reglas().optJSONArray("modos"), Calendar.getInstance());

        SharedPreferences prefs = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean loPusimosNosotros = prefs.getBoolean(CLAVE_NOSOTROS, false);

        try {
            if (debeSilenciar) {
                if (nm.getCurrentInterruptionFilter() != NotificationManager.INTERRUPTION_FILTER_ALARMS) {
                    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS);
                    prefs.edit().putBoolean(CLAVE_NOSOTROS, true).apply();
                    Log.i(ReglasStore.TAG, "No molestar activado por modo");
                }
            } else if (loPusimosNosotros) {
                // Solo restauramos si el silencio actual lo pusimos nosotros.
                if (nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALARMS) {
                    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
                }
                prefs.edit().putBoolean(CLAVE_NOSOTROS, false).apply();
                Log.i(ReglasStore.TAG, "No molestar restaurado");
            }
        } catch (Exception e) {
            Log.w(ReglasStore.TAG, "aplicar DND", e);
        }
    }
}

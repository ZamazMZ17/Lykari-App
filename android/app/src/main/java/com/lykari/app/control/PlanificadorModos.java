package com.lykari.app.control;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

/**
 * Programa una alarma exacta para el próximo momento en que un modo con
 * silencio empieza o termina. Al dispararse, {@link AlarmaModos} vuelve a
 * aplicar No molestar y reprograma la siguiente. Así el silencio del modo
 * Sueño entra a las 00:00 y sale a las 05:00 aunque nadie toque el teléfono.
 */
final class PlanificadorModos {

    private PlanificadorModos() {}

    private static final int CODIGO = 4801;

    static void reprogramar(Context contexto) {
        Context c = contexto.getApplicationContext();
        // Aplica el estado de ahora antes de dormir hasta el próximo cambio.
        AplicadorDnd.aplicar(c);

        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        int minutos = Motor.minutosAlProximoCambio(
                ReglasStore.de(c).reglas().optJSONArray("modos"), Calendar.getInstance());
        long cuando = System.currentTimeMillis() + (long) minutos * 60_000;

        PendingIntent pi = PendingIntent.getBroadcast(
                c, CODIGO, new Intent(c, AlarmaModos.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, cuando, pi);
            }
            Log.i(ReglasStore.TAG, "Próximo cambio de modo en " + minutos + " min");
        } catch (SecurityException e) {
            // Sin permiso de alarma exacta: al menos queda aplicado el estado actual.
            am.set(AlarmManager.RTC_WAKEUP, cuando, pi);
        }
    }
}

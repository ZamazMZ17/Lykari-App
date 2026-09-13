package com.lykari.app.control;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Al reiniciar el teléfono vuelve a levantar el filtro DNS si estaba vigente.
 * El servicio de accesibilidad lo reactiva Android solo; esto es para la VPN,
 * que no arranca por su cuenta.
 */
public class ArranqueReceptor extends BroadcastReceiver {

    @Override
    public void onReceive(Context contexto, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        try {
            if (ReglasStore.de(contexto).filtroAdultoVigente(System.currentTimeMillis())) {
                Intent vpn = new Intent(contexto, FiltroDns.class);
                vpn.setAction(FiltroDns.ACCION_INICIAR);
                contexto.startService(vpn);
            }
        } catch (Exception e) {
            Log.w(ReglasStore.TAG, "arranque", e);
        }
    }
}

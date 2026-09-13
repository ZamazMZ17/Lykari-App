package com.lykari.app.control;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Se dispara en cada frontera de horario de modo: reaplica No molestar y reprograma. */
public class AlarmaModos extends BroadcastReceiver {
    @Override
    public void onReceive(Context contexto, Intent intent) {
        PlanificadorModos.reprogramar(contexto);
    }
}

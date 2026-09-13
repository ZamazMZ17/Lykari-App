package com.lykari.app.control;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Admin de dispositivo. No pide poderes fuertes (ni borra, ni bloquea el
 * teléfono): estar activo como admin es lo que hace que, para desinstalar
 * LyKari, Android obligue primero a desactivar el admin — y esa pantalla la
 * tapa el vigilante de accesibilidad mientras la protección esté puesta.
 *
 * El texto que ve el usuario al desactivarlo sale de
 * `res/xml/admin_lykari.xml` (mensaje de advertencia).
 */
public class AdminReceptor extends DeviceAdminReceiver {

    @Override
    public CharSequence onDisableRequested(Context contexto, Intent intent) {
        return "Si quitas a LyKari como administrador podrás desinstalarla y se apagará el control. "
                + "Desactívalo desde Control → Protección con tu contraseña.";
    }
}

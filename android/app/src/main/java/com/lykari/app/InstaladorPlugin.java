package com.lykari.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Abre el instalador de paquetes de Android para un APK ya guardado en el
 * caché de la app (ver src/lib/instalador.ts, que lo descarga ahí). No
 * instala solo: Android exige la confirmación del usuario en la pantalla del
 * instalador, con o sin este plugin — es una protección del sistema.
 */
@CapacitorPlugin(name = "Instalador")
public class InstaladorPlugin extends Plugin {

    @PluginMethod
    public void abrir(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) {
            call.reject("Falta la ruta del archivo.");
            return;
        }

        Context contexto = getContext();
        Uri uri =
                FileProvider.getUriForFile(
                        contexto, contexto.getPackageName() + ".fileprovider", new File(ruta));

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        contexto.startActivity(intent);

        call.resolve();
    }
}

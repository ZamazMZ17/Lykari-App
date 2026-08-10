package com.lykari.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.ArrayList;
import java.util.List;

/**
 * Dos cosas que la WebView no resuelve sola y sin las cuales no se puede
 * grabar:
 *
 * 1. El permiso de Android. `getUserMedia` falla con NotAllowedError sin
 *    mostrar ningún diálogo si la app no tiene RECORD_AUDIO concedido.
 * 2. El permiso de la propia WebView, que va aparte del de Android y hay que
 *    contestarlo a mano.
 */
public class MainActivity extends BridgeActivity {

    private static final int PERMISOS = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        responderPermisosDeLaWebView();
        pedirPermisosQueFalten();
    }

    private void pedirPermisosQueFalten() {
        List<String> faltan = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            faltan.add(Manifest.permission.RECORD_AUDIO);
        }

        // Las notificaciones solo se piden desde Android 13; antes venían dadas.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            faltan.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        if (!faltan.isEmpty()) {
            ActivityCompat.requestPermissions(this, faltan.toArray(new String[0]), PERMISOS);
        }
    }

    /**
     * Se extiende el cliente de Capacitor en vez de reemplazarlo, para no
     * perder lo demás que hace (consola, diálogos, selector de archivos).
     * Solo se concede el micrófono, y solo si Android ya nos lo dio: nunca
     * se otorga a ciegas.
     */
    private void responderPermisosDeLaWebView() {
        getBridge()
                .getWebView()
                .setWebChromeClient(
                        new BridgeWebChromeClient(getBridge()) {
                            @Override
                            public void onPermissionRequest(PermissionRequest request) {
                                List<String> concedidos = new ArrayList<>();
                                for (String recurso : request.getResources()) {
                                    boolean esMicrofono =
                                            PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(recurso);
                                    boolean loTenemos =
                                            ContextCompat.checkSelfPermission(
                                                            MainActivity.this,
                                                            Manifest.permission.RECORD_AUDIO)
                                                    == PackageManager.PERMISSION_GRANTED;
                                    if (esMicrofono && loTenemos) concedidos.add(recurso);
                                }
                                if (concedidos.isEmpty()) {
                                    request.deny();
                                } else {
                                    request.grant(concedidos.toArray(new String[0]));
                                }
                            }
                        });
    }
}

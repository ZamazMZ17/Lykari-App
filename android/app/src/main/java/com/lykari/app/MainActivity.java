package com.lykari.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.ArrayList;
import java.util.Collections;
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

    private Runnable reinyectarInsets;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        inyectarInsetsEnCSS();
        responderPermisosDeLaWebView();
        pedirPermisosQueFalten();
        excluirGestoDeAtrasEnLosBordes();
    }

    /**
     * Android 15+ (API 35) fuerza edge-to-edge: la WebView se extiende detrás
     * de la barra de navegación del sistema, pero env(safe-area-inset-bottom)
     * puede devolver 0 en algunas WebView de Android. Sin el inset correcto,
     * la navegación de la app queda tapada por los botones del sistema.
     *
     * Se leen los insets reales del sistema y se inyectan como variables CSS
     * (--safe-t, --safe-b) directamente en el documento. Se reintenta una vez
     * con retardo para cubrir el caso de que la página aún no haya cargado.
     */
    private void inyectarInsetsEnCSS() {
        WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets barras = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            float d = getResources().getDisplayMetrics().density;
            String arriba = String.format(java.util.Locale.US, "%.1f", barras.top / d);
            String abajo = String.format(java.util.Locale.US, "%.1f", barras.bottom / d);
            String js = "document.documentElement.style.setProperty('--safe-t','" + arriba + "px');"
                      + "document.documentElement.style.setProperty('--safe-b','" + abajo + "px');";
            webView.evaluateJavascript(js, null);
            if (reinyectarInsets != null) webView.removeCallbacks(reinyectarInsets);
            reinyectarInsets = () -> webView.evaluateJavascript(js, null);
            webView.postDelayed(reinyectarInsets, 800);
            return windowInsets;
        });
    }

    /**
     * Desde Android 10, deslizar desde los primeros ~24dp del borde izquierdo
     * o derecho dispara el gesto de "atrás" del sistema, aunque debajo haya
     * contenido que se desplaza horizontalmente (el riel de Camino, el
     * selector de íconos al crear una actividad). El sistema decide esto
     * antes de que el toque llegue a la WebView, así que ningún CSS lo evita.
     *
     * La app ya resuelve su propio atrás con el botón físico/gesto —
     * useAtras en el JS escucha popstate y cierra la hoja de arriba—, así que
     * no hace falta que el gesto de borde también compita por ese toque:
     * se excluye toda la WebView.
     */
    private void excluirGestoDeAtrasEnLosBordes() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        WebView webView = getBridge().getWebView();
        Runnable actualizar =
                () -> {
                    int ancho = webView.getWidth();
                    int alto = webView.getHeight();
                    if (ancho == 0 || alto == 0) return;
                    webView.setSystemGestureExclusionRects(
                            Collections.singletonList(new Rect(0, 0, ancho, alto)));
                };
        webView.addOnLayoutChangeListener(
                (View v, int l, int t, int r, int b, int ol, int ot, int or_, int ob) ->
                        actualizar.run());
        webView.post(actualizar);
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

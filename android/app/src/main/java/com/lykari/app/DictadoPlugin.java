package com.lykari.app;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

/**
 * Dictado nativo con el reconocedor de voz de Android (el mismo servicio que
 * usa el teclado de Google), en paralelo a la grabación de audio. El audio
 * nunca sale del teléfono para esto y no depende de que haya cuota de la API
 * de la IA — ver src/lib/dictado.ts, que es quien decide si usarlo.
 *
 * `SpeechRecognizer` está pensado para tramos cortos: en una pausa larga
 * termina el tramo solo. Como una grabación real puede durar mucho más que
 * eso, acá se encadenan tramos automáticamente mientras `activo` siga en
 * true — cada `onResults` se suma a lo acumulado y, si el llamador no pidió
 * parar, se vuelve a escuchar sin avisar nada hacia afuera. Recién cuando se
 * llama a `detener()` se corta la cadena y se manda el texto completo.
 */
@CapacitorPlugin(name = "Dictado")
public class DictadoPlugin extends Plugin {

    private SpeechRecognizer reconocedor;
    private final StringBuilder acumulado = new StringBuilder();
    private volatile boolean activo = false;

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("valor", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void iniciar(PluginCall call) {
        acumulado.setLength(0);
        activo = true;
        getActivity().runOnUiThread(this::escuchar);
        call.resolve();
    }

    @PluginMethod
    public void detener(PluginCall call) {
        activo = false;
        getActivity()
                .runOnUiThread(
                        () -> {
                            if (reconocedor != null) reconocedor.stopListening();
                        });
        call.resolve();
    }

    @PluginMethod
    public void cancelar(PluginCall call) {
        activo = false;
        acumulado.setLength(0);
        getActivity().runOnUiThread(this::destruirReconocedor);
        call.resolve();
    }

    private void escuchar() {
        destruirReconocedor();
        reconocedor = SpeechRecognizer.createSpeechRecognizer(getContext());
        reconocedor.setRecognitionListener(
                new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {}

                    @Override
                    public void onBeginningOfSpeech() {}

                    @Override
                    public void onRmsChanged(float rmsdB) {}

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {}

                    @Override
                    public void onEvent(int eventType, Bundle params) {}

                    @Override
                    public void onPartialResults(Bundle bundle) {
                        String tramo = primerResultado(bundle);
                        if (tramo.isEmpty()) return;
                        emitir("parcial", conAcumulado(tramo));
                    }

                    @Override
                    public void onResults(Bundle bundle) {
                        String tramo = primerResultado(bundle);
                        if (!tramo.isEmpty()) {
                            if (acumulado.length() > 0) acumulado.append(" ");
                            acumulado.append(tramo);
                        }
                        if (activo) {
                            // Pausa natural, pero no pidieron parar: seguimos
                            // escuchando para no cortar un dictado largo a la mitad.
                            escuchar();
                        } else {
                            emitir("final", acumulado.toString());
                        }
                    }

                    @Override
                    public void onError(int error) {
                        boolean pausa =
                                error == SpeechRecognizer.ERROR_NO_MATCH
                                        || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT;
                        if (activo && pausa) {
                            escuchar();
                            return;
                        }
                        if (!activo) {
                            emitir("final", acumulado.toString());
                            return;
                        }
                        JSObject data = new JSObject();
                        data.put("codigo", error);
                        notifyListeners("error", data);
                    }
                });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-PE");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        reconocedor.startListening(intent);
    }

    private void destruirReconocedor() {
        if (reconocedor != null) {
            reconocedor.cancel();
            reconocedor.destroy();
            reconocedor = null;
        }
    }

    private String primerResultado(Bundle bundle) {
        ArrayList<String> lista = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return (lista != null && !lista.isEmpty()) ? lista.get(0) : "";
    }

    private String conAcumulado(String tramoEnCurso) {
        return acumulado.length() == 0 ? tramoEnCurso : acumulado + " " + tramoEnCurso;
    }

    private void emitir(String evento, String texto) {
        JSObject data = new JSObject();
        data.put("texto", texto);
        notifyListeners(evento, data);
    }
}

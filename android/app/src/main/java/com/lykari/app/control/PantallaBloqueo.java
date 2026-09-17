package com.lykari.app.control;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.net.Uri;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

/**
 * Se pone encima de la app bloqueada. Neutra, con los tokens de LyKari, sin
 * rojo ni culpa: dice qué se bloqueó y por qué, y ofrece volver al inicio.
 *
 * La única salida de un límite es una extensión de cinco minutos, una vez por
 * día, dibujando el patrón de Zamly girado 90°. El filtro +18 y la protección
 * tampoco tienen salida desde aquí.
 */
public class PantallaBloqueo extends Activity {

    public static final String EXTRA_MOTIVO = "motivo";
    public static final String EXTRA_ORIGEN = "origen";   // paquete o dominio
    public static final String EXTRA_TITULO = "titulo";   // ej. "TikTok"
    public static final String EXTRA_DETALLE = "detalle"; // ej. "1 h de 1 h hoy"
    public static final String EXTRA_EXTENSIBLE = "extensible";

    private static final int PAPER = Color.parseColor("#F3F5F0");
    private static final int INK = Color.parseColor("#151A12");
    private static final int INK2 = Color.parseColor("#5D6656");
    private static final int LINE = Color.parseColor("#C6CCC0");
    private static final int PINO = Color.parseColor("#1F4D3F");

    private String origen;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        setFinishOnTouchOutside(false);

        String motivo = getIntent().getStringExtra(EXTRA_MOTIVO);
        origen = getIntent().getStringExtra(EXTRA_ORIGEN);
        String titulo = getIntent().getStringExtra(EXTRA_TITULO);
        String detalle = getIntent().getStringExtra(EXTRA_DETALLE);
        boolean extensible = getIntent().getBooleanExtra(EXTRA_EXTENSIBLE, false);

        getWindow().setStatusBarColor(Color.parseColor("#0C1620"));
        getWindow().setNavigationBarColor(Color.parseColor("#0C1620"));

        int pad = dp(24);
        FrameLayout escena = new FrameLayout(this);

        // El dibujo vive en un ImageView con CENTER_CROP: Android no puede
        // fragmentarlo en los márgenes al aplicar los insets de la pantalla.
        ImageView ilustracion = new ImageView(this);
        ilustracion.setImageResource(com.lykari.app.R.drawable.guardian_focus_lock);
        ilustracion.setScaleType(ImageView.ScaleType.CENTER_CROP);
        ilustracion.setContentDescription(null);
        escena.addView(ilustracion, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        View velo = new View(this);
        velo.setBackgroundColor(Color.argb(92, 12, 22, 32));
        escena.addView(velo, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setGravity(Gravity.CENTER);
        raiz.setPadding(pad, pad, pad, pad);

        LinearLayout tarjeta = new LinearLayout(this);
        tarjeta.setOrientation(LinearLayout.VERTICAL);
        tarjeta.setBackground(fondoRedondeado(Color.argb(246, 243, 245, 240), LINE, dp(20)));
        tarjeta.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lpTarjeta = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tarjeta.setLayoutParams(lpTarjeta);

        TextView eyebrow = new TextView(this);
        eyebrow.setText(eyebrowSegunMotivo(motivo));
        eyebrow.setTextColor(INK2);
        eyebrow.setTextSize(12);
        eyebrow.setTypeface(Typeface.MONOSPACE);
        eyebrow.setLetterSpacing(0.08f);
        eyebrow.setAllCaps(true);
        tarjeta.addView(eyebrow);

        TextView tTitulo = new TextView(this);
        tTitulo.setText(titulo != null && !titulo.isEmpty() ? titulo : "Bloqueado");
        tTitulo.setTextColor(INK);
        tTitulo.setTextSize(26);
        tTitulo.setTypeface(Typeface.create("serif", Typeface.NORMAL));
        tTitulo.setPadding(0, dp(6), 0, 0);
        tarjeta.addView(tTitulo);

        TextView tDetalle = new TextView(this);
        tDetalle.setText(detalle != null && !detalle.isEmpty() ? detalle : mensajeSegunMotivo(motivo));
        tDetalle.setTextColor(INK2);
        tDetalle.setTextSize(15);
        tDetalle.setPadding(0, dp(10), 0, dp(20));
        tDetalle.setLineSpacing(dp(2), 1f);
        tarjeta.addView(tDetalle);

        Button inicio = new Button(this);
        inicio.setAllCaps(false);
        inicio.setText("Ir al inicio");
        inicio.setTextColor(Color.WHITE);
        inicio.setBackground(fondoRedondeado(PINO, PINO, dp(14)));
        inicio.setOnClickListener(v -> irAlInicio());
        tarjeta.addView(inicio, botonLp());

        if ("estudio".equals(motivo)) {
            Button estudiar = new Button(this);
            estudiar.setAllCaps(false);
            estudiar.setText("Estudiar para desbloquear");
            estudiar.setTextColor(Color.WHITE);
            estudiar.setBackground(fondoRedondeado(PINO, PINO, dp(14)));
            estudiar.setOnClickListener(v -> {
                Intent quiz = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("lykari://quiz?paquete=" + Uri.encode(origen == null ? "" : origen)));
                quiz.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(quiz);
                finish();
            });
            tarjeta.addView(estudiar, botonLp());
        }

        if (extensible && ReglasStore.de(this).usaPatron() && ReglasStore.de(this).puedeUsarExtensionHoy()) {
            Button extender = new Button(this);
            extender.setAllCaps(false);
            extender.setText("Usar 5 min de extensión");
            extender.setTextColor(INK);
            extender.setBackground(fondoRedondeado(PAPER, LINE, dp(14)));
            extender.setOnClickListener(v -> pedirPatronGirado());
            tarjeta.addView(extender, botonLp());
        }

        raiz.addView(tarjeta);
        escena.addView(raiz, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(escena);
    }

    /** No se puede salir con "atrás": eso saltaría el bloqueo. */
    @Override
    public void onBackPressed() {
        irAlInicio();
    }

    private void irAlInicio() {
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(home);
        finish();
    }

    private void pedirPatronGirado() {
        final android.app.AlertDialog dialogo;
        int pad = dp(16);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(pad, pad, pad, 0);
        TextView indicacion = new TextView(this);
        indicacion.setText("Gira mentalmente tu patrón 90° hacia la derecha y dibújalo. Solo hay una extensión de 5 min para todo el día.");
        indicacion.setTextColor(INK2);
        indicacion.setTextSize(14);
        indicacion.setLineSpacing(dp(2), 1f);
        caja.addView(indicacion);
        PatronGiradoView padPatron = new PatronGiradoView(this);
        caja.addView(padPatron, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(250)));

        dialogo = new android.app.AlertDialog.Builder(this)
                .setTitle("Extensión única")
                .setView(caja)
                .setNegativeButton("Cancelar", null)
                .create();
        padPatron.setOnCompletar(patron -> {
            ReglasStore store = ReglasStore.de(this);
            if (!store.verificarPatronGirado(patron)) {
                Toast.makeText(this, "Patrón girado incorrecto", Toast.LENGTH_SHORT).show();
                padPatron.limpiar();
                return;
            }
            if (!store.agregarExtensionUnica(origen)) {
                Toast.makeText(this, "La extensión única de hoy ya se usó", Toast.LENGTH_SHORT).show();
                dialogo.dismiss();
                return;
            }
            Toast.makeText(this, "5 minutos disponibles", Toast.LENGTH_SHORT).show();
            dialogo.dismiss();
            finish();
        });
        dialogo.show();
    }

    private static String eyebrowSegunMotivo(String motivo) {
        if (motivo == null) return "Control";
        switch (motivo) {
            case "adulto": return "Filtro de contenido";
            case "modo": return "Modo activo";
            case "web": return "Sitio con límite";
            case "aperturas": return "Aperturas de hoy";
            case "proteccion": return "Protegido";
            case "estudio": return "Puerta de estudio";
            default: return "Tiempo de hoy";
        }
    }

    private static String mensajeSegunMotivo(String motivo) {
        if (motivo == null) return "";
        switch (motivo) {
            case "adulto": return "Este contenido está fuera de lo permitido.";
            case "modo": return "Ahora mismo esta app está en pausa.";
            case "proteccion": return "Esta acción está protegida.";
            default: return "Alcanzaste el tiempo que te pusiste para hoy.";
        }
    }

    private LinearLayout.LayoutParams botonLp() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        lp.topMargin = dp(10);
        return lp;
    }

    private static GradientDrawable fondoRedondeado(int relleno, int borde, int radio) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(relleno);
        g.setCornerRadius(radio);
        g.setStroke(dpEstatico(1), borde);
        return g;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private static int dpEstatico(int v) {
        return Math.round(v * android.content.res.Resources.getSystem().getDisplayMetrics().density);
    }

    /** Patrón dibujable local: no guarda trazos; solo entrega la secuencia al soltar. */
    private static final class PatronGiradoView extends View {
        interface AlCompletar { void completar(String patron); }
        private final Paint linea = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint nodo = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final List<Integer> seleccion = new ArrayList<>();
        private AlCompletar alCompletar;
        private float lado;

        PatronGiradoView(android.content.Context contexto) {
            super(contexto);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            linea.setColor(Color.parseColor("#C98209"));
            linea.setStrokeWidth(dpEstatico(4));
            linea.setStrokeCap(Paint.Cap.ROUND);
            nodo.setStyle(Paint.Style.STROKE);
            nodo.setStrokeWidth(dpEstatico(2));
            nodo.setColor(LINE);
        }

        void setOnCompletar(AlCompletar listener) { alCompletar = listener; }
        void limpiar() { seleccion.clear(); invalidate(); }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            lado = Math.min(getWidth(), getHeight());
            float x0 = (getWidth() - lado) / 2f;
            float y0 = (getHeight() - lado) / 2f;
            for (int i = 1; i < seleccion.size(); i++) {
                float[] a = centro(seleccion.get(i - 1), x0, y0), b = centro(seleccion.get(i), x0, y0);
                canvas.drawLine(a[0], a[1], b[0], b[1], linea);
            }
            for (int i = 0; i < 9; i++) {
                float[] c = centro(i, x0, y0);
                nodo.setStyle(Paint.Style.STROKE); nodo.setColor(LINE);
                canvas.drawCircle(c[0], c[1], lado / 12f, nodo);
                if (seleccion.contains(i)) {
                    nodo.setStyle(Paint.Style.FILL); nodo.setColor(Color.parseColor("#C98209"));
                    canvas.drawCircle(c[0], c[1], lado / 28f, nodo);
                }
            }
        }

        @Override public boolean onTouchEvent(MotionEvent evento) {
            int punto = puntoEn(evento.getX(), evento.getY());
            if (evento.getAction() == MotionEvent.ACTION_DOWN) { limpiar(); agregar(punto); return true; }
            if (evento.getAction() == MotionEvent.ACTION_MOVE) { agregar(punto); return true; }
            if (evento.getAction() == MotionEvent.ACTION_UP || evento.getAction() == MotionEvent.ACTION_CANCEL) {
                agregar(punto);
                if (seleccion.size() >= 2 && alCompletar != null) {
                    StringBuilder patron = new StringBuilder();
                    for (int i = 0; i < seleccion.size(); i++) { if (i > 0) patron.append('-'); patron.append(seleccion.get(i)); }
                    alCompletar.completar(patron.toString());
                } else limpiar();
                return true;
            }
            return true;
        }

        private void agregar(int punto) { if (punto >= 0 && !seleccion.contains(punto)) { seleccion.add(punto); invalidate(); } }
        private int puntoEn(float x, float y) {
            float l = Math.min(getWidth(), getHeight()), x0 = (getWidth() - l) / 2f, y0 = (getHeight() - l) / 2f;
            for (int i = 0; i < 9; i++) { float[] c = centro(i, x0, y0); if (Math.hypot(x - c[0], y - c[1]) < l / 9f) return i; }
            return -1;
        }
        private float[] centro(int i, float x0, float y0) { return new float[]{x0 + (i % 3) * lado / 3f + lado / 6f, y0 + (i / 3) * lado / 3f + lado / 6f}; }
    }
}

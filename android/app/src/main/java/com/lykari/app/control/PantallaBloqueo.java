package com.lykari.app.control;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Se pone encima de la app bloqueada. Neutra, con los tokens de LyKari, sin
 * rojo ni culpa: dice qué se bloqueó y por qué, y ofrece volver al inicio.
 *
 * Para límite/modo/web hay "Extender con contraseña" (queda registrado). Para
 * el filtro +18 y para la protección no hay salida acá: eso solo se cambia
 * desde Control, con contraseña y la espera de 24 h.
 */
public class PantallaBloqueo extends Activity {

    public static final String EXTRA_MOTIVO = "motivo";
    public static final String EXTRA_ORIGEN = "origen";   // paquete o dominio
    public static final String EXTRA_TITULO = "titulo";   // ej. "TikTok"
    public static final String EXTRA_DETALLE = "detalle"; // ej. "1 h de 1 h hoy"
    public static final String EXTRA_EXTENSIBLE = "extensible";

    private static final int GROUND = Color.parseColor("#DCE0D9");
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

        int pad = dp(24);
        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setGravity(Gravity.CENTER);
        raiz.setBackgroundColor(GROUND);
        raiz.setPadding(pad, pad, pad, pad);

        LinearLayout tarjeta = new LinearLayout(this);
        tarjeta.setOrientation(LinearLayout.VERTICAL);
        tarjeta.setBackground(fondoRedondeado(PAPER, LINE, dp(20)));
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

        if (extensible) {
            Button extender = new Button(this);
            extender.setAllCaps(false);
            extender.setText("Extender con contraseña");
            extender.setTextColor(INK);
            extender.setBackground(fondoRedondeado(PAPER, LINE, dp(14)));
            extender.setOnClickListener(v -> pedirContrasena());
            tarjeta.addView(extender, botonLp());
        }

        raiz.addView(tarjeta);
        setContentView(raiz);
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

    private void pedirContrasena() {
        final EditText campo = new EditText(this);
        campo.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        campo.setHint("Contraseña");
        int pad = dp(16);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(pad, pad, pad, 0);
        caja.addView(campo);

        new android.app.AlertDialog.Builder(this)
                .setTitle("Extender 15 min")
                .setView(caja)
                .setPositiveButton("Extender", (d, w) -> {
                    String texto = campo.getText().toString();
                    if (ReglasStore.de(this).verificar(texto)) {
                        ReglasStore.de(this).agregarExtension(origen, 15);
                        Toast.makeText(this, "15 minutos más", Toast.LENGTH_SHORT).show();
                        finish(); // vuelve a la app; el servicio ya no bloqueará por 15 min
                    } else {
                        Toast.makeText(this, "Contraseña incorrecta", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private static String eyebrowSegunMotivo(String motivo) {
        if (motivo == null) return "Control";
        switch (motivo) {
            case "adulto": return "Filtro de contenido";
            case "modo": return "Modo activo";
            case "web": return "Sitio con límite";
            case "aperturas": return "Aperturas de hoy";
            case "proteccion": return "Protegido";
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
}

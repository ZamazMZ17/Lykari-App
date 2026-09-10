import { useCallback, useEffect, useRef, useState } from "react";
import { esNativo } from "../lib/plataforma";
import { esPluginAusente, ReconocedorNativo, type CorteNativo } from "./reconocedorNativo";

/**
 * Voz a texto **sin gastar cuota de la API**.
 *
 * En el APK manda el reconocedor del propio teléfono (`Reconocedor.java` y su
 * puente `reconocedorNativo.ts`): el mismo servicio de Google que usa el
 * teclado para dictar. Transcribir es exactamente lo que Android ya hace
 * gratis, así que la key de la IA queda libre para lo que sí necesita una IA.
 * En el navegador de desarrollo se usa la Web Speech API.
 *
 * **El problema que resuelve este archivo:** Android cierra la escucha al poco
 * silencio. Una orden dictada lleva pausas —«abre el proyecto… el de la
 * carpeta nueva… y corre las pruebas»— así que el reconocedor se cerraba a
 * mitad de frase. Aquí, cuando el servicio corta por su cuenta, **se vuelve a
 * abrir solo y se sigue acumulando**: la escucha termina cuando se suelta el
 * micrófono, no cuando el teléfono se cansa. Cada tramo cerrado entrega su
 * versión final repasada, que es mejor que el último parcial.
 */

export type EstadoEscucha = "inactivo" | "pidiendo" | "escuchando" | "error";

const IDIOMA = "es-PE";

/** Tope de seguridad: si se queda abierto, no escucha para siempre. */
const MAXIMO_MS = 120_000;
/** Cuánto silencio se le pide aguantar al reconocedor antes de cortar. */
const SILENCIO_MS = 4000;
/**
 * Con tramos de ~4 s, dos vacíos seguidos ya son ~8 s callado: suficiente
 * para dar la escucha por terminada sin que una pausa larga la mate.
 */
const SILENCIOS_SEGUIDOS = 2;
/** Errores duros seguidos (red, servicio caído) antes de rendirse. */
const ERRORES_SEGUIDOS = 3;

/** La Web Speech API no está tipada en TS y solo se usa en desarrollo. */
interface ReconocedorWeb {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

function crearWeb(): ReconocedorWeb | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => ReconocedorWeb;
    webkitSpeechRecognition?: new () => ReconocedorWeb;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * @param alTerminar recibe todo lo dictado al soltar el micrófono (o cuando
 *   salta el tope de seguridad). Cadena vacía = no se agarró nada.
 */
export function useReconocedor(
  alTerminar: (texto: string) => void,
  frasesFavorecidas: string[] = [],
  /**
   * Solo si el teléfono tiene descargado el paquete de voz en español. Sin
   * él, pedir reconocimiento en el dispositivo no da error claro: devuelve
   * «sin coincidencias», que es indistinguible de no haber hablado.
   */
  priorizarSinConexion = false,
) {
  const [estado, setEstado] = useState<EstadoEscucha>("inactivo");
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const web = useRef<ReconocedorWeb | null>(null);
  /** Lo de los tramos ya cerrados por las pausas. */
  const base = useRef("");
  /** El tramo que está diciendo ahora mismo. */
  const tramo = useRef("");
  const activo = useRef(false);
  const pidioParar = useRef(false);
  const inicio = useRef(0);
  const silencios = useRef(0);
  const erroresDuros = useRef(0);
  /** El cierre manual espera el resultado final, pero nunca se queda colgado. */
  const cierreManual = useRef<number | null>(null);
  /**
   * Reconocer en el teléfono es más rápido, pero solo si está el paquete de
   * idioma; por eso arranca apagado salvo que se pida. Si el servicio avisa
   * de que le falta el idioma, se baja y el siguiente tramo va a la red —
   * mejor lento que mudo.
   */
  const preferirOffline = useRef(false);
  const priorizarSinConexionRef = useRef(priorizarSinConexion);
  priorizarSinConexionRef.current = priorizarSinConexion;
  /** Cuántos tramos cerró el reconocedor. Cero = no contestó nunca. */
  const cortes = useRef(0);
  /** Sube en cada apertura y cierre; los reinicios viejos se descartan solos. */
  const generacion = useRef(0);
  const frasesRef = useRef<string[]>([]);
  frasesRef.current = [...new Set(frasesFavorecidas.map((f) => f.trim()).filter(Boolean))].slice(0, 120);

  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  const todo = () => `${base.current} ${tramo.current}`.replace(/\s+/g, " ").trim();

  const soltar = useCallback(() => {
    activo.current = false;
    if (cierreManual.current !== null) {
      clearTimeout(cierreManual.current);
      cierreManual.current = null;
    }
    // Cambiar de generación invalida cualquier reinicio que estuviera en cola:
    // si no, un temporizador pendiente podía resucitar la escucha ya cerrada.
    generacion.current += 1;
    if (esNativo) {
      // Primero los oyentes, para que el aviso de parada no reabra nada, y
      // después parar de verdad: sin este cierre el reconocedor de Android
      // se queda escuchando aunque la app ya no lo atienda.
      void ReconocedorNativo.removeAllListeners().catch(() => {});
      void ReconocedorNativo.cancelar().catch(() => {});
    }
    if (web.current) {
      web.current.onend = null;
      web.current.onresult = null;
      web.current.onerror = null;
      web.current.abort();
      web.current = null;
    }
  }, []);

  useEffect(() => soltar, [soltar]);

  /** Cierra la sesión y entrega el texto. El guardia evita entregarlo dos veces. */
  const finalizar = useCallback(() => {
    if (!activo.current) return;
    const texto = todo();
    const contesto = cortes.current > 0;
    base.current = "";
    tramo.current = "";
    soltar();
    setEstado("inactivo");
    setParcial("");
    // Terminar en blanco no puede parecer que no pasó nada: se dice si el
    // reconocedor no contestó (otra cosa) o si contestó y no oyó nada.
    if (!texto) {
      setError(
        contesto || !esNativo
          ? "No se oyó nada. Mantén el micrófono mientras hablas."
          : "El reconocedor de voz del teléfono no respondió. Comprueba que la app sea la 0.7.3 o más nueva.",
      );
    }
    alTerminarRef.current(texto);
  }, [soltar]);

  /** Termina mostrando por qué falló, en vez de parecer un dictado vacío. */
  const fallar = useCallback(
    (mensaje: string) => {
      if (!activo.current) return;
      // Si ya se recogieron frases completas, es preferible enseñarlas para
      // corregirlas antes que perder todo por un problema del último tramo.
      if (todo()) return finalizar();
      soltar();
      setEstado("error");
      setParcial("");
      setError(mensaje);
    },
    [finalizar, soltar],
  );

  /** Reabre la escucha para el siguiente tramo. */
  const reabrir = useCallback(
    (esperaMs: number) => {
      const mia = generacion.current;
      setTimeout(() => {
        if (!activo.current || pidioParar.current || generacion.current !== mia) return;
        void ReconocedorNativo.iniciar({
          idioma: IDIOMA,
          preferirOffline: preferirOffline.current,
          silencioMs: SILENCIO_MS,
          frasesFavorecidas: frasesRef.current,
        }).catch(() => finalizar());
      }, esperaMs);
    },
    [finalizar],
  );

  /** Se cerró un tramo. ¿Fue el usuario, un silencio o un fallo? */
  const alCorte = useCallback(
    (d: CorteNativo) => {
      if (!activo.current) return;
      cortes.current += 1;

      // El texto final del tramo viene repasado por el servicio: pisa al
      // último parcial, que es un borrador.
      if (d.texto.trim()) tramo.current = d.texto;

      if (pidioParar.current) return finalizar();
      if (Date.now() - inicio.current > MAXIMO_MS) return finalizar();

      if (d.motivo === "permiso") {
        return fallar("Se perdió el permiso del micrófono. Actívalo en Ajustes de Android → Lykari → Permisos.");
      }

      if (d.motivo === "idioma") {
        // No tiene el paquete de español en el teléfono: que el siguiente
        // tramo vaya a la red en vez de quedarse mudo.
        if (!preferirOffline.current) {
          return fallar("El teléfono no tiene disponible el reconocimiento en español de Perú.");
        }
        preferirOffline.current = false;
        return reabrir(0);
      }

      if (d.motivo === "red" || d.motivo === "error") {
        // Si se estaba usando el modelo por red y esta se cae, intenta el
        // paquete descargado antes de abandonar el dictado.
        if (d.motivo === "red" && !preferirOffline.current) {
          preferirOffline.current = true;
          return reabrir(0);
        }
        erroresDuros.current += 1;
        if (erroresDuros.current >= ERRORES_SEGUIDOS) {
          return fallar(
            d.motivo === "red"
              ? "No se pudo conectar al reconocimiento de voz. Descarga el español para usarlo sin señal."
              : "El reconocimiento de voz dejó de responder. Inténtalo otra vez o escríbelo.",
          );
        }
        return reabrir(300);
      }

      erroresDuros.current = 0;
      if (tramo.current.trim()) {
        silencios.current = 0;
        base.current = todo();
        tramo.current = "";
      } else {
        // Nunca se oyó nada y se estaba reconociendo en el teléfono: lo más
        // probable es que falte el paquete de idioma, que el servicio no
        // reporta como error sino como «sin coincidencias». Antes de darse
        // por vencido, se prueba por red.
        if (!base.current.trim() && preferirOffline.current) {
          preferirOffline.current = false;
          silencios.current = 0;
          return reabrir(0);
        }
        // Tramo vacío: va callado. A la segunda (~8 s) se cierra sola.
        silencios.current += 1;
        if (silencios.current >= SILENCIOS_SEGUIDOS) return finalizar();
      }
      reabrir(0);
    },
    [fallar, finalizar, reabrir],
  );

  const iniciarNativo = useCallback(async () => {
    const { disponible } = await ReconocedorNativo.disponible();
    if (!disponible) throw new Error("sin-reconocedor");

    await ReconocedorNativo.removeAllListeners();
    await ReconocedorNativo.addListener("parcial", (d) => {
      if (!d.texto) return;
      tramo.current = d.texto;
      setParcial(todo());
    });
    await ReconocedorNativo.addListener("corte", alCorte);

    preferirOffline.current = priorizarSinConexionRef.current;
    activo.current = true;
    try {
      // La primera llamada puede pedir el permiso del micrófono.
      await ReconocedorNativo.iniciar({
        idioma: IDIOMA,
        preferirOffline: preferirOffline.current,
        silencioMs: SILENCIO_MS,
        frasesFavorecidas: frasesRef.current,
      });
    } catch (e) {
      activo.current = false;
      if (e instanceof Error && /sin-permiso/.test(e.message)) throw new Error("sin-permiso");
      throw e;
    }
    setEstado("escuchando");
  }, [alCorte]);

  /** Cierra el tramo abierto y espera su resultado final, sin colgarse. */
  const pedirCierre = useCallback(() => {
    // Con un cierre ya pedido, repetirlo dejaría dos temporizadores sueltos.
    if (!activo.current || cierreManual.current !== null) return;
    if (esNativo) void ReconocedorNativo.detener().catch(() => {});
    else web.current?.stop();
    cierreManual.current = window.setTimeout(finalizar, 1300);
  }, [finalizar]);

  const iniciar = useCallback(async () => {
    if (activo.current) return;
    setError(null);
    setParcial("");
    base.current = "";
    tramo.current = "";
    pidioParar.current = false;
    silencios.current = 0;
    erroresDuros.current = 0;
    cortes.current = 0;
    inicio.current = Date.now();
    setEstado("pidiendo");

    try {
      if (esNativo) {
        try {
          await iniciarNativo();
        } catch (e) {
          if (esPluginAusente(e)) throw new Error("apk-viejo");
          throw e;
        }
        // Abrir el micrófono pasa por el puente y tarda: si soltó el botón
        // mientras tanto, el «detener» llegó cuando todavía no había nada que
        // detener y la escucha se habría quedado abierta.
        if (pidioParar.current) pedirCierre();
        return;
      }

      const r = crearWeb();
      if (!r) throw new Error("sin-reconocedor");
      r.lang = IDIOMA;
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
        let t = "";
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        tramo.current = t;
        setParcial(todo());
      };
      r.onerror = () => finalizar();
      r.onend = () => finalizar();
      web.current = r;
      activo.current = true;
      r.start();
      setEstado("escuchando");
    } catch (e) {
      soltar();
      setEstado("error");
      const causa = e instanceof Error ? e.message : "";
      setError(
        causa === "sin-permiso"
          ? "Falta el permiso del micrófono. Actívalo en Ajustes de Android → Lykari → Permisos."
          : causa === "apk-viejo"
            ? "Este APK todavía no trae el dictado del teléfono. Actualiza Lykari desde Ajustes."
            : causa === "sin-reconocedor"
              ? esNativo
                ? "Este teléfono no tiene reconocimiento de voz. Puedes escribir la indicación."
                : "Este navegador no reconoce voz. En el teléfono sí funciona."
              : "No se pudo abrir el micrófono. Puedes escribir la indicación.",
      );
    }
  }, [finalizar, iniciarNativo, pedirCierre, soltar]);

  /**
   * Se soltó el micrófono: se pide cerrar el tramo para recibir su resultado
   * final, que suele ser más correcto que el último parcial. No se espera su
   * promesa — si el servicio se cuelga, el temporizador conserva el texto
   * parcial y termina igual.
   */
  const detener = useCallback(() => {
    // Se marca siempre, incluso si la apertura sigue en curso: `iniciar` lo
    // comprueba al terminar de abrir.
    pidioParar.current = true;
    pedirCierre();
  }, [pedirCierre]);

  /** Salir sin usar lo dictado (cambió de pantalla, por ejemplo). */
  const cancelar = useCallback(() => {
    if (!activo.current) return;
    pidioParar.current = true;
    base.current = "";
    tramo.current = "";
    soltar();
    setEstado("inactivo");
    setParcial("");
  }, [soltar]);

  return { estado, parcial, error, iniciar, detener, cancelar };
}

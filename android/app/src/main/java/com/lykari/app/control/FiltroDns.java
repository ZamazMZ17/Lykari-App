package com.lykari.app.control;

import android.content.Intent;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.ByteBuffer;

/**
 * VPN local que solo intercepta DNS y lo reenvía a un resolver familiar
 * (CleanBrowsing Family: 185.228.168.168), que ya bloquea porno y fuerza
 * SafeSearch y YouTube restringido en TODAS las apps, incluido el incógnito.
 *
 * No enruta el resto del tráfico: solo se enruta la IP del DNS familiar hacia
 * el túnel, así que si algo falla acá, solo se cae la resolución de nombres,
 * nunca la conexión entera. No manda nada del usuario a ningún servidor propio:
 * la consulta va directo del teléfono al DNS familiar por un socket protegido.
 *
 * Ocupa el único slot de VPN de Android; si otra VPN lo desplaza, el vigilante
 * de accesibilidad lo nota (el estado `vpn` en permisos) y lo vuelve a pedir.
 */
public class FiltroDns extends VpnService {

    public static final String ACCION_INICIAR = "com.lykari.app.control.DNS_INICIAR";
    public static final String ACCION_DETENER = "com.lykari.app.control.DNS_DETENER";

    // CleanBrowsing Family Filter. Alternativa: 1.1.1.3 (Cloudflare for Families).
    private static final String DNS_FAMILIAR = "185.228.168.168";
    private static final String DNS_FAMILIAR_2 = "185.228.169.168";
    private static final String DIRECCION_TUN = "10.111.222.1";

    private ParcelFileDescriptor tun;
    private Thread hilo;
    private volatile boolean corriendo;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACCION_DETENER.equals(intent.getAction())) {
            detener();
            return START_NOT_STICKY;
        }
        iniciar();
        return START_STICKY;
    }

    private void iniciar() {
        if (corriendo) return;
        try {
            Builder b = new Builder();
            b.setSession("LyKari Filtro");
            b.addAddress(DIRECCION_TUN, 24);
            b.addDnsServer(DNS_FAMILIAR);
            b.addDnsServer(DNS_FAMILIAR_2);
            // Solo enrutamos las IP del DNS familiar: nada más pasa por el túnel.
            b.addRoute(DNS_FAMILIAR, 32);
            b.addRoute(DNS_FAMILIAR_2, 32);
            try { b.addDisallowedApplication(getPackageName()); } catch (Exception ignorado) {}
            tun = b.establish();
            if (tun == null) {
                Log.w(ReglasStore.TAG, "No se pudo establecer la VPN de filtro");
                return;
            }
            corriendo = true;
            hilo = new Thread(this::bucle, "lykari-dns");
            hilo.start();
            Log.i(ReglasStore.TAG, "Filtro DNS activo");
        } catch (Exception e) {
            Log.w(ReglasStore.TAG, "iniciar filtro", e);
        }
    }

    private void detener() {
        corriendo = false;
        if (hilo != null) hilo.interrupt();
        try { if (tun != null) tun.close(); } catch (Exception ignorado) {}
        tun = null;
        stopSelf();
    }

    /** Lee paquetes IPv4/UDP del túnel, reenvía la consulta DNS y devuelve la respuesta. */
    private void bucle() {
        try (FileInputStream entrada = new FileInputStream(tun.getFileDescriptor());
             FileOutputStream salida = new FileOutputStream(tun.getFileDescriptor())) {
            byte[] buffer = new byte[32767];
            while (corriendo) {
                int largo = entrada.read(buffer);
                if (largo <= 0) continue;
                ByteBuffer paquete = ByteBuffer.wrap(buffer, 0, largo);
                byte[] respuesta = procesar(paquete, largo);
                if (respuesta != null) salida.write(respuesta);
            }
        } catch (Exception e) {
            if (corriendo) Log.w(ReglasStore.TAG, "bucle dns", e);
        }
    }

    /** IPv4 + UDP hacia el puerto 53: reenvía el payload y arma el paquete de respuesta. */
    private byte[] procesar(ByteBuffer p, int largo) {
        try {
            int versionIhl = p.get(0) & 0xFF;
            if ((versionIhl >> 4) != 4) return null;          // solo IPv4
            int ihl = (versionIhl & 0x0F) * 4;
            int protocolo = p.get(9) & 0xFF;
            if (protocolo != 17) return null;                 // solo UDP

            byte[] ipOrigen = new byte[4];
            byte[] ipDestino = new byte[4];
            p.position(12); p.get(ipOrigen);
            p.position(16); p.get(ipDestino);

            int puertoOrigen = ((p.get(ihl) & 0xFF) << 8) | (p.get(ihl + 1) & 0xFF);
            int puertoDestino = ((p.get(ihl + 2) & 0xFF) << 8) | (p.get(ihl + 3) & 0xFF);
            if (puertoDestino != 53) return null;

            int inicioPayload = ihl + 8;
            int largoPayload = largo - inicioPayload;
            if (largoPayload <= 0) return null;
            byte[] consulta = new byte[largoPayload];
            System.arraycopy(p.array(), inicioPayload, consulta, 0, largoPayload);

            byte[] respuestaDns = consultar(InetAddress.getByAddress(ipDestino), consulta);
            if (respuestaDns == null) return null;

            return armarRespuesta(ipDestino, ipOrigen, puertoDestino, puertoOrigen, respuestaDns);
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] consultar(InetAddress destino, byte[] consulta) {
        try (DatagramSocket socket = new DatagramSocket()) {
            protect(socket); // que salga por la red real, no por el túnel
            socket.setSoTimeout(4000);
            socket.send(new DatagramPacket(consulta, consulta.length, destino, 53));
            byte[] buf = new byte[1500];
            DatagramPacket resp = new DatagramPacket(buf, buf.length);
            socket.receive(resp);
            byte[] datos = new byte[resp.getLength()];
            System.arraycopy(buf, 0, datos, 0, resp.getLength());
            return datos;
        } catch (Exception e) {
            return null;
        }
    }

    /** Arma un paquete IPv4/UDP de respuesta (origen y destino invertidos). */
    private byte[] armarRespuesta(byte[] ipOrigen, byte[] ipDestino, int puertoOrigen,
                                  int puertoDestino, byte[] payload) {
        int largoUdp = 8 + payload.length;
        int largoTotal = 20 + largoUdp;
        ByteBuffer b = ByteBuffer.allocate(largoTotal);
        // Cabecera IPv4
        b.put((byte) 0x45);              // versión 4, IHL 5
        b.put((byte) 0);                 // DSCP/ECN
        b.putShort((short) largoTotal);
        b.putShort((short) 0);           // id
        b.putShort((short) 0x4000);      // don't fragment
        b.put((byte) 64);                // TTL
        b.put((byte) 17);                // UDP
        b.putShort((short) 0);           // checksum (se calcula luego)
        b.put(ipOrigen);
        b.put(ipDestino);
        int posChecksumIp = 10;
        short checksumIp = checksum(b.array(), 0, 20);
        b.putShort(posChecksumIp, checksumIp);
        // Cabecera UDP
        b.putShort((short) puertoOrigen);
        b.putShort((short) puertoDestino);
        b.putShort((short) largoUdp);
        b.putShort((short) 0);           // checksum UDP 0 = sin verificar (válido en IPv4)
        b.put(payload);
        return b.array();
    }

    private static short checksum(byte[] datos, int inicio, int largo) {
        long suma = 0;
        int i = inicio;
        while (i < inicio + largo - 1) {
            suma += ((datos[i] & 0xFF) << 8) | (datos[i + 1] & 0xFF);
            i += 2;
        }
        if (i < inicio + largo) suma += (datos[i] & 0xFF) << 8;
        while ((suma >> 16) != 0) suma = (suma & 0xFFFF) + (suma >> 16);
        return (short) ~suma;
    }

    @Override
    public void onDestroy() {
        detener();
        super.onDestroy();
    }
}

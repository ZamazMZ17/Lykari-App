import type { PreguntaCurso, TarjetaEstudio } from "./tipos";

type PreguntaBase = Omit<PreguntaCurso, "id" | "cursoId" | "vecesVista" | "vecesCorrecta">;
type TarjetaBase = Omit<TarjetaEstudio, "id" | "cursoId" | "creada">;

export interface ConceptoCurso {
  tema: string;
  titulo: string;
  explicacion: string;
  fuente: string;
}

export interface ContenidoCurso {
  nombre: string;
  alias: RegExp;
  preguntas: PreguntaBase[];
  tarjetas: TarjetaBase[];
  conceptos: ConceptoCurso[];
}

function q(tema: string, pregunta: string, correcta: string, incorrectas: string[], explicacion: string, fuente: string): PreguntaBase {
  return { tema, pregunta, opciones: [correcta, ...incorrectas], respuestaCorrecta: 0, explicacion, fuente };
}
function t(tema: string, frente: string, reverso: string, fuente: string): TarjetaBase {
  return { tema, frente, reverso, fuente };
}

const ARQUITECTURA: ContenidoCurso = {
  nombre: "Arquitectura de Negocio",
  alias: /arquitectura.*negocio/i,
  preguntas: [
    q("Modelo de negocio", "¿Qué describe un modelo de negocio según la presentación?", "Cómo una organización crea, proporciona y capta valor", ["Solo la estructura del organigrama", "El código fuente de sus aplicaciones", "Únicamente su presupuesto anual"], "El material vincula el modelo con crear, proporcionar y captar valor.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Modelo Canvas", "¿Cuál de estos es un bloque del lienzo de modelo de negocio?", "Propuesta de valor", ["Lenguaje de programación", "Diagrama de clases", "Servidor de respaldo"], "La propuesta de valor es uno de los nueve elementos del Canvas.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Modelo Canvas", "¿Qué bloque del Canvas identifica a los grupos a los que se dirige una empresa?", "Segmentos de mercado", ["Estructura de costes", "Recursos clave", "Actividades clave"], "Los segmentos de mercado representan personas o entidades objetivo.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Misión", "¿Qué debe aclarar una misión empresarial?", "Quién es la organización, qué hace y a quién sirve", ["El precio de todas sus acciones", "Solo su posición futura", "La tecnología que usa hoy"], "La misión comunica identidad, actividad y público al que sirve.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Visión", "¿Qué caracteriza a la visión de una empresa?", "Una representación de éxito y madurez en un escenario futuro", ["Una lista diaria de tareas", "Una auditoría de sistemas actuales", "Un registro contable"], "La visión describe el futuro deseado de la organización.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Objetivos", "¿Cómo se entienden los objetivos organizacionales en el material?", "Metas traducidas a elementos evaluables por costo, tiempo y desempeño", ["Ideas sin medida ni plazo", "Sinónimos de la visión", "Reglas solo para TI"], "Los objetivos permiten controlar el avance mediante criterios observables.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Estrategia", "¿Qué busca la estrategia empresarial según Porter?", "Una posición rentable y sostenible frente a la competencia", ["Eliminar toda competencia legalmente", "Aumentar documentos internos", "Reemplazar la misión"], "La estrategia crea y apropia valor superior sin exceder su costo de creación.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Patrones", "¿Qué patrón conecta dos o más grupos de clientes interdependientes?", "Plataforma multilateral", ["Larga cola", "Desagregación", "Integración síncrona"], "Visa y Google aparecen como ejemplos de plataformas multilaterales.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Integración", "¿Qué significa integración empresarial?", "Optimizar procesos fragmentados en un entorno integrado y adaptable", ["Instalar una única base de datos", "Cambiar el logo corporativo", "Comprar servidores nuevos"], "La integración abarca procesos, información y tecnología; no es solo una solución técnica.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Interoperabilidad", "¿Qué tres dimensiones de integración menciona el material?", "Operativa o de negocio, de información y técnica", ["Financiera, legal y publicitaria", "Local, nacional y global", "Manual, automática y visual"], "La interoperabilidad requiere colaboración de procesos, datos compartidos y conexión técnica.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Datos maestros", "¿Para qué sirve un registro dorado en C-MDM?", "Establecer un punto único de verdad para datos de clientes", ["Duplicar datos en cada área", "Eliminar toda base de datos", "Registrar contraseñas de usuarios"], "C-MDM reduce silos y busca consistencia semántica de los datos maestros.", "Unidad 1 · Semana 1 · Sesión 1"),
    q("Tipos de integración", "¿Cuándo ocurre una integración asíncrona?", "Cuando el intercambio sucede a partir de un evento posterior al requerimiento", ["Siempre en el instante de la solicitud", "Solo sin conexión a internet", "Cuando se elimina un sistema"], "La síncrona responde al momento del requerimiento; la asíncrona se activa por eventos.", "Unidad 1 · Semana 1 · Sesión 1"),
  ],
  tarjetas: [
    t("Modelo Canvas", "¿Qué son los recursos clave?", "Activos físicos, intelectuales, humanos o económicos fundamentales para que funcione el modelo.", "Unidad 1 · Semana 1 · Sesión 1"),
    t("Modelo Canvas", "¿Qué son las asociaciones clave?", "La red de proveedores y socios externos que optimiza el modelo y reduce riesgos.", "Unidad 1 · Semana 1 · Sesión 1"),
    t("Patrones", "Patrón de larga cola", "Vende una gran variedad de productos especializados con ventas individuales bajas.", "Unidad 1 · Semana 1 · Sesión 1"),
    t("Patrones", "Modelo gratuito o freemium", "Al menos un segmento recibe una oferta gratuita de forma permanente; el ingreso llega por servicios premium u otro segmento.", "Unidad 1 · Semana 1 · Sesión 1"),
    t("Integración", "EAI", "La integración de aplicaciones empresariales evita duplicar funciones y conecta componentes mediante flujos de trabajo.", "Unidad 1 · Semana 1 · Sesión 1"),
    t("Integración", "Modelo operativo", "Define el nivel de integración y estandarización de procesos necesario para entregar bienes y servicios.", "Unidad 1 · Semana 1 · Sesión 1"),
  ],
  conceptos: [
    { tema: "Modelo de negocio", titulo: "Canvas", explicacion: "Relaciona clientes, propuesta de valor, canales, relaciones, ingresos, recursos, actividades, asociaciones y costes. Úsalo para explicar cómo opera una empresa antes de proponer cambios.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
    { tema: "Dirección empresarial", titulo: "Misión, visión, objetivos y estrategia", explicacion: "La misión explica identidad y servicio; la visión proyecta el futuro; los objetivos vuelven las metas medibles; la estrategia busca una posición sostenible.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
    { tema: "Integración", titulo: "Procesos, datos y tecnología", explicacion: "Una integración sólida coordina procesos, comparte información con significado común y conecta recursos técnicos. El objetivo es reducir silos y responder al cambio.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
  ],
};

const EXPERIMENTOS: ContenidoCurso = {
  nombre: "Diseño de Experimentos en SI",
  alias: /diseno.*experimento/i,
  preguntas: [
    q("Requerimientos", "¿Por qué la validación de requisitos es importante?", "Porque corregir un error de requisito después del desarrollo puede costar mucho más", ["Porque reemplaza las pruebas", "Porque elimina al cliente del proceso", "Porque evita planificar tareas"], "El material señala el alto costo de detectar tarde errores de requisitos.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Requerimientos", "¿Qué técnica ayuda a clarificar requisitos?", "El prototipado", ["La eliminación de usuarios", "El despliegue final", "La compresión de archivos"], "El prototipado permite contrastar el sistema esperado con lo que quiere el cliente.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Validación", "¿Qué criterio pregunta si las funciones solicitadas están incluidas?", "Completitud", ["Realismo", "Consistencia", "Disponibilidad"], "La completitud verifica que se incluyan todas las funciones requeridas.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Validación", "¿Qué criterio revisa conflictos entre requisitos?", "Consistencia", ["Completitud", "Usabilidad", "Portabilidad"], "La consistencia busca contradicciones entre requisitos.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Validación", "¿Qué criterio evalúa si los requisitos caben en la tecnología y presupuesto disponibles?", "Realismo", ["Trazabilidad", "Completitud", "Priorización"], "El realismo contrasta requisitos con restricciones técnicas y económicas.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Planificación", "¿Qué se debe identificar antes de iniciar una tarea dependiente?", "Las actividades predecesoras o dependencias", ["El color del diagrama", "El nombre del producto", "La versión del navegador"], "Las dependencias definen la secuencia lógica de ejecución.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Cronograma", "¿Qué permite visualizar un cronograma?", "Actividades, fechas, responsables, duración y dependencias en el tiempo", ["Solo costos del proyecto", "Únicamente código fuente", "La estructura de una base de datos"], "El cronograma muestra el plan temporal y sus relaciones.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Gantt", "¿Cómo representa un diagrama de Gantt cada actividad?", "Con una barra horizontal cuya longitud representa la duración", ["Con una tabla de direcciones IP", "Con un diagrama de clases", "Con una lista sin fechas"], "El Gantt permite ver duración y secuencia en un calendario.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    q("Scrum", "¿Qué es Scrum según la presentación?", "Un framework ágil para desarrollar proyectos", ["Un lenguaje de programación", "Un motor de base de datos", "Un formato de rúbrica"], "La sesión presenta Scrum como marco de trabajo ágil.", "Unidad 1 · S2 · Introducción a Scrum"),
    q("Scrum", "¿Qué artefacto reúne el trabajo seleccionado para un sprint?", "Sprint Backlog", ["Diagrama de Gantt", "Registro ARP", "Modelo Canvas"], "El Sprint Backlog contiene el trabajo asumido para el sprint.", "Unidad 1 · S2 · Introducción a Scrum"),
    q("Calidad", "¿Cuál es la secuencia correcta de los términos de calidad mostrada?", "Error humano, defecto en software y posible fallo en operación", ["Fallo, error y requisito", "Defecto, usuario y compilación", "Prueba, error y despliegue"], "Un error puede introducir un defecto que luego cause un fallo observable.", "Unidad 1 · S4 · Introducción a la Calidad"),
    q("Calidad", "¿Qué debe considerar un proceso de calidad?", "La satisfacción de los requisitos del cliente durante la generación del producto", ["Solo la velocidad de codificación", "Solo el costo del servidor", "La cantidad de reuniones"], "La conclusión relaciona procesos de calidad con producto y requisitos del cliente.", "Unidad 1 · S4 · Introducción a la Calidad"),
  ],
  tarjetas: [
    t("Requerimientos", "Validación", "Comprobar si el sistema provee funciones que soporten las necesidades del cliente.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    t("Requerimientos", "Revisión de requisitos", "Involucra cliente y contratista; puede ser formal o informal y busca resolver problemas temprano.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    t("Planificación", "Pasos de planificación", "Definir objetivo, identificar y ordenar tareas, asignar responsables, tiempos, recursos y dependencias; luego monitorear y ajustar.", "Unidad 1 · S1 · Modelos de Requerimientos"),
    t("Scrum", "Historia de usuario", "Forma breve de expresar una necesidad desde la perspectiva de quien obtiene valor; guía funcionalidades y prototipos.", "Unidad 1 · S2 · Introducción a Scrum"),
    t("Calidad", "Error, defecto y fallo", "Una persona comete un error; el error puede crear un defecto en el software; el defecto puede causar un fallo durante la operación.", "Unidad 1 · S4 · Introducción a la Calidad"),
    t("Calidad", "Factores de calidad", "Se usan para evaluar el grado en que un sistema satisface características esperadas; se debe sustentar cada valoración.", "Unidad 1 · S4 · Introducción a la Calidad"),
  ],
  conceptos: [
    { tema: "Requerimientos", titulo: "Validar antes de construir", explicacion: "Los requisitos cambian y distintos usuarios priorizan cosas distintas. Validar, revisar y prototipar permite detectar conflictos antes de que el costo de corrección aumente.", fuente: "Unidad 1 · S1 · Modelos de Requerimientos" },
    { tema: "Planificación", titulo: "Cronograma y dependencias", explicacion: "Un cronograma convierte las tareas en una secuencia con responsables, duración, fechas e hitos. El Gantt muestra la duración con barras, aunque simplifica relaciones complejas.", fuente: "Unidad 1 · S1 · Modelos de Requerimientos" },
    { tema: "Calidad", titulo: "Prevenir y detectar", explicacion: "La calidad se relaciona con los requisitos del cliente. Un error humano puede introducir un defecto, y el defecto puede manifestarse como fallo en la operación.", fuente: "Unidad 1 · S4 · Introducción a la Calidad" },
  ],
};

const FUNDAMENTOS: ContenidoCurso = {
  nombre: "Fundamentos de Sistemas de Información",
  alias: /fundamentos.*sistemas.*informacion/i,
  preguntas: [
    q("C#", "¿Qué caracteriza al tipado estático y fuerte de C#?", "La variable declara el tipo de dato que almacenará", ["Toda variable cambia de tipo sin reglas", "No existen tipos de datos", "Solo se pueden guardar textos"], "La presentación explica que el tipo se establece al crear la variable.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("C#", "¿Cuál es el rango de un byte en C#?", "De 0 a 255", ["De -128 a 127", "De 0 a 65 535", "De -32 768 a 32 767"], "byte es un entero sin signo de 8 bits.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("C#", "¿Qué palabra reservada declara una constante?", "const", ["static", "new", "using"], "Una constante se declara con const antes del tipo y recibe valor al declararse.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("POO", "¿Qué expresa el encapsulamiento?", "Agrupar datos y métodos dentro de una clase", ["Copiar una clase en otra aplicación", "Eliminar todos los atributos", "Crear solo variables globales"], "El encapsulamiento reúne estado y comportamiento.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("POO", "¿Qué es un objeto respecto de una clase?", "Una instancia creada a partir de la clase", ["Una lista de métodos estáticos", "Un comentario de código", "Una base de datos"], "La clase funciona como plantilla o molde; el objeto es una instancia.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("POO", "¿Qué permite la herencia?", "Que una clase adquiera propiedades de otra", ["Que un objeto no tenga estado", "Que una variable cambie de nombre", "Que un programa deje de compilar"], "La herencia reutiliza y especializa comportamiento entre clases.", "Semana 1 · Introducción a Estructuras de Datos"),
    q("Estructuras", "¿Qué principio sigue una cola?", "FIFO: primero en entrar, primero en salir", ["LIFO: último en entrar, primero en salir", "Orden aleatorio", "Orden alfabético"], "Las colas se usan, por ejemplo, en atención al cliente e impresión.", "Semana 5 · Pilas y Colas"),
    q("Estructuras", "¿Qué método agrega un elemento al final de una Queue?", "Enqueue", ["Dequeue", "Pop", "Peek"], "Enqueue encola un elemento; Dequeue retira el primero.", "Semana 5 · Pilas y Colas"),
    q("Estructuras", "¿Qué principio sigue una pila?", "LIFO: último en entrar, primero en salir", ["FIFO: primero en entrar, primero en salir", "Round robin", "Orden por prioridad"], "Una pila extrae elementos en orden inverso al que se apilaron.", "Semana 5 · Pilas y Colas"),
    q("Estructuras", "¿Qué hace Pop en una Stack?", "Remueve y devuelve el elemento superior", ["Agrega al final de una cola", "Muestra el primer elemento sin retirarlo", "Cuenta elementos"], "Pop desapila el elemento de la cima.", "Semana 5 · Pilas y Colas"),
    q("Estructuras", "¿Qué devuelve Peek en una cola?", "El primer elemento sin retirarlo", ["El último elemento y lo elimina", "La cantidad de nodos", "La dirección de memoria"], "Peek consulta el primer elemento; Count indica cuántos hay.", "Semana 5 · Pilas y Colas"),
    q("Control", "¿Cuál es una estructura repetitiva de C#?", "foreach", ["switch", "const", "class"], "for, foreach, while y do..while son estructuras repetitivas.", "Semana 1 · Introducción a Estructuras de Datos"),
  ],
  tarjetas: [
    t("C#", "int", "Entero con signo de 32 bits.", "Semana 1 · Introducción a Estructuras de Datos"),
    t("C#", "bool", "Tipo lógico cuyo valor es true o false.", "Semana 1 · Introducción a Estructuras de Datos"),
    t("POO", "Abstracción", "Oculta detalles complejos y muestra la funcionalidad necesaria.", "Semana 1 · Introducción a Estructuras de Datos"),
    t("POO", "Polimorfismo", "Permite que una misma acción tenga implementaciones diferentes.", "Semana 1 · Introducción a Estructuras de Datos"),
    t("Colas", "Dequeue", "Retira el primer elemento de una cola.", "Semana 5 · Pilas y Colas"),
    t("Pilas", "Peek", "Consulta el elemento superior de una pila sin retirarlo.", "Semana 5 · Pilas y Colas"),
  ],
  conceptos: [
    { tema: "C#", titulo: "Tipos y declaraciones", explicacion: "C# usa tipado estático y fuerte. Antes de usar una variable se declara su tipo; las constantes usan const y reciben valor desde el inicio.", fuente: "Semana 1 · Introducción a Estructuras de Datos" },
    { tema: "POO", titulo: "Clase y objeto", explicacion: "Una clase modela atributos y métodos. Un objeto es una instancia; encapsulamiento, herencia, polimorfismo y abstracción organizan el diseño.", fuente: "Semana 1 · Introducción a Estructuras de Datos" },
    { tema: "Estructuras", titulo: "Pilas y colas", explicacion: "La cola sigue FIFO y la pila LIFO. En Queue se usan Enqueue, Dequeue y Peek; en Stack se usan Push, Pop y Peek.", fuente: "Semana 5 · Pilas y Colas" },
  ],
};

const REDES: ContenidoCurso = {
  nombre: "Redes y Comunicaciones de Datos",
  alias: /redes.*(comunic|dato|conexion)/i,
  preguntas: [
    q("Ethernet", "¿En qué capas opera Ethernet según el material?", "Enlace de datos y física", ["Red y transporte", "Sesión y presentación", "Aplicación y transporte"], "Ethernet se apoya en capa 2 y capa 1.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("Ethernet", "¿Qué subcapa identifica el protocolo de capa 3 usado por una trama?", "LLC", ["MAC", "ARP", "VLAN"], "LLC coloca información para identificar el protocolo de capa 3.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("ARP", "¿Qué resuelve ARP en una red local?", "Una dirección IPv4 hacia la dirección MAC correspondiente", ["Un nombre DNS hacia IP", "Una MAC hacia contraseña", "Una VLAN hacia puerto físico"], "ARP mantiene asignaciones entre IPv4 y MAC.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("ARP", "Si la IP de destino está en una red remota, ¿qué MAC usa la trama?", "La MAC de la puerta de enlace predeterminada", ["La MAC del destino remoto directamente", "La MAC de cualquier switch", "No usa dirección MAC"], "Para una red remota, el host envía la trama a su gateway.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("Switching", "¿Qué registra un switch para construir su tabla MAC?", "La MAC de origen junto al puerto por el que recibió la trama", ["Solo la IP de destino", "Los nombres de usuario", "El FCS como dirección"], "El switch usa esa tabla para decidir la interfaz de salida.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("Switching", "¿Qué hace un switch con una difusión o una MAC unicast desconocida?", "Inunda todas las interfaces excepto el puerto de entrada", ["La envía solo al gateway", "La descarta siempre", "La convierte en multicast"], "El flooding permite localizar el destino cuando no hay entrada conocida.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    q("VLAN", "¿Qué es una VLAN?", "Una red conmutada segmentada lógicamente por organización, función o aplicación", ["Un cable físico exclusivo", "Una dirección MAC", "Un tipo de servidor DNS"], "La segmentación deja de depender solo de la ubicación física.", "Semana 5 · VLAN"),
    q("VLAN", "¿Qué tráfico queda aislado dentro de una VLAN?", "Difusión, multidifusión y unidifusión de esa VLAN", ["Todo tráfico de Internet mundial", "Solo tráfico HTTPS", "Solo tráfico de voz"], "Cada VLAN crea dominios de difusión más pequeños.", "Semana 5 · VLAN"),
    q("Trunking", "¿Qué permite un enlace troncal?", "Transportar más de una VLAN entre dispositivos de red", ["Crear una sola dirección IP", "Eliminar el etiquetado", "Evitar switches"], "El trunk punto a punto extiende VLANs y usa normalmente 802.1Q.", "Semana 5 · Trunking VLAN"),
    q("802.1Q", "¿Qué VLAN suele ir sin etiqueta en un troncal 802.1Q?", "La VLAN nativa", ["La VLAN de voz", "Toda VLAN de datos", "La VLAN de administración"], "Las tramas 802.1Q se etiquetan salvo las de la VLAN nativa.", "Semana 5 · Trunking VLAN"),
    q("Inter-VLAN", "¿Qué se requiere para que hosts de VLAN distintas se comuniquen?", "Un router o switch de capa 3 que enrute entre VLANs", ["Solo cambiar el nombre de la VLAN", "Un hub adicional", "Un cable de consola"], "Sin un dispositivo de capa 3 no hay comunicación entre VLANs.", "Semana 5 · Inter-VLAN Routing"),
    q("Inter-VLAN", "¿Cuál es la opción más escalable para inter-VLAN en organizaciones medianas y grandes?", "Switch de capa 3 con SVI", ["Router heredado con una interfaz física por VLAN", "Router-on-a-stick sin límites", "Un hub con VLAN nativa"], "El switch L3 enruta por hardware y reduce latencia.", "Semana 5 · Switch multicapa"),
  ],
  tarjetas: [
    t("Ethernet", "MAC", "Subcapa que encapsula datos, controla el acceso al medio y aporta direccionamiento de enlace.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    t("ARP", "Tabla ARP", "Caché temporal de asignaciones IPv4 a MAC; sus entradas caducan.", "Semana 5 · Ethernet, VLAN e Inter-VLAN"),
    t("VLAN", "VLAN 1", "VLAN predeterminada para puertos de acceso sin asignación; no se puede eliminar ni renombrar.", "Semana 5 · VLAN"),
    t("VLAN", "VLAN de administración", "Lleva tráfico de administración SSH/Telnet y se separa del tráfico de usuarios.", "Semana 5 · VLAN"),
    t("802.1Q", "VID", "Campo de 12 bits que identifica la VLAN y permite hasta 4096 VLAN.", "Semana 5 · Trunking VLAN"),
    t("Inter-VLAN", "SVI", "Interfaz virtual conmutada que aporta procesamiento de capa 3 y puede ser gateway de una VLAN.", "Semana 5 · Switch multicapa"),
  ],
  conceptos: [
    { tema: "Ethernet y ARP", titulo: "De IP a trama", explicacion: "Ethernet usa LLC y MAC. Si el destino está en la misma red, ARP busca su MAC; si está remoto, usa la MAC de la puerta de enlace predeterminada.", fuente: "Semana 5 · Ethernet, VLAN e Inter-VLAN" },
    { tema: "VLAN", titulo: "Segmentación lógica", explicacion: "Las VLAN agrupan dispositivos por función y limitan los dominios de difusión. Dispositivos de VLAN diferentes necesitan enrutamiento de capa 3 para comunicarse.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
    { tema: "Troncales", titulo: "802.1Q", explicacion: "Un trunk transporta múltiples VLAN. 802.1Q inserta una etiqueta en las tramas, excepto en la VLAN nativa, que debe coincidir en ambos extremos.", fuente: "Semana 5 · Trunking VLAN" },
  ],
};

const CALCULO: ContenidoCurso = {
  nombre: "Cálculo II",
  alias: /calculo.*ii/i,
  preguntas: [
    q("Derivadas parciales", "¿Qué representa fₓ(a,b) geométricamente?", "La pendiente de la tangente a la sección de la superficie con y=b", ["El área bajo la superficie", "La masa de una lámina", "La ecuación de una recta vertical"], "fₓ mide el cambio al variar x y mantener y fija.", "Semana 3 · Sesión 4.1"),
    q("Derivadas parciales", "¿Qué variable se mantiene fija al calcular fᵧ?", "x", ["y", "Las dos variables cambian", "Ninguna variable"], "fᵧ deriva respecto de y conservando x constante.", "Semana 3 · Sesión 4.1"),
    q("Derivadas parciales", "¿Qué afirma el teorema de Clairaut bajo continuidad de derivadas mixtas?", "fₓᵧ = fᵧₓ", ["fₓ = fᵧ siempre", "El gradiente es cero", "Toda función es lineal"], "Las derivadas mixtas coinciden si son continuas en la región.", "Semana 3 · Sesión 4.1"),
    q("Direccional", "¿Qué condición debe cumplir el vector de dirección u en la definición presentada?", "Ser unitario", ["Ser paralelo al eje x", "Tener coordenadas enteras", "Ser nulo"], "La derivada direccional se define en dirección de un vector unitario.", "Semana 3 · Sesión 4.1"),
    q("Direccional", "¿Cómo se calcula Dᵤf para f derivable?", "Como el producto escalar ∇f · u", ["Como fₓ + fᵧ sin dirección", "Como una integral doble", "Como el determinante de u"], "La fórmula combina las parciales con las componentes del vector unitario.", "Semana 3 · Sesión 4.1"),
    q("Gradiente", "¿Qué componentes forman ∇f(x,y)?", "fₓ(x,y) y fᵧ(x,y)", ["x e y únicamente", "La función y su integral", "El radio y el ángulo"], "El gradiente reúne las derivadas parciales.", "Semana 3 · Sesión 4.1"),
    q("Gradiente", "¿En qué dirección es máxima la derivada direccional?", "En la misma dirección del gradiente", ["En la dirección opuesta al gradiente", "Siempre hacia el eje y", "En cualquier dirección"], "El máximo ocurre cuando el coseno del ángulo es 1.", "Semana 3 · Sesión 4.1"),
    q("Gradiente", "¿En qué dirección es mínima la derivada direccional?", "En la dirección opuesta al gradiente", ["En la del gradiente", "En la dirección de i", "En la dirección de j"], "La dirección opuesta produce coseno -1.", "Semana 3 · Sesión 4.1"),
    q("Polares", "¿Cuál es la relación correcta entre coordenadas polares y cartesianas?", "x=r cos θ, y=r sen θ", ["x=r sen θ, y=r cos θ siempre", "x=θ cos r, y=θ sen r", "x=r+θ, y=r-θ"], "La transformación polar expresa la posición con radio y ángulo.", "Semana 6 · Sesión 6.1"),
    q("Polares", "¿Qué factor Jacobiano no se debe olvidar en una integral doble polar?", "r", ["θ", "x", "1/r"], "El diferencial de área es r dr dθ o r dθ dr.", "Semana 6 · Sesión 6.1"),
    q("Integrales dobles", "¿Cómo se calcula la masa de una lámina de densidad δ(x,y)?", "m=∬ᴰ δ(x,y)dA", ["m=∇δ", "m=δ/r", "m=∫ δ dx sin región"], "La masa integra la densidad sobre la región ocupada por la lámina.", "Semana 6 · Sesión 6.1"),
    q("Centro de masa", "¿Qué integra la coordenada x del centro de masa?", "x·δ(x,y) sobre D y se divide entre la masa", ["Solo x sobre un punto", "La derivada fₓ", "El radio sin densidad"], "El centro de masa usa momentos ponderados por la densidad.", "Semana 6 · Sesión 6.1"),
  ],
  tarjetas: [
    t("Derivadas", "fₓ", "Derivada parcial respecto de x: mantiene y constante.", "Semana 3 · Sesión 4.1"),
    t("Derivadas", "fᵧ", "Derivada parcial respecto de y: mantiene x constante.", "Semana 3 · Sesión 4.1"),
    t("Gradiente", "∇f", "Vector formado por las derivadas parciales; apunta hacia el ascenso máximo.", "Semana 3 · Sesión 4.1"),
    t("Direccional", "Dᵤf", "Razón de cambio de f en la dirección del vector unitario u; Dᵤf=∇f·u.", "Semana 3 · Sesión 4.1"),
    t("Polares", "Diferencial de área", "En polares: dA=r dr dθ. El factor r es el Jacobiano.", "Semana 6 · Sesión 6.1"),
    t("Integrales", "Centro de masa", "(x̄,ȳ)=(1/m ∬ᴰxδdA, 1/m ∬ᴰyδdA).", "Semana 6 · Sesión 6.1"),
  ],
  conceptos: [
    { tema: "Derivadas", titulo: "Cambio en varias variables", explicacion: "Las parciales observan el cambio sobre ejes concretos. La derivada direccional generaliza esa idea a cualquier vector unitario.", fuente: "Semana 3 · Sesión 4.1" },
    { tema: "Gradiente", titulo: "Máximo ascenso", explicacion: "El gradiente reúne las parciales. Su dirección indica el ascenso más pronunciado; la opuesta indica el descenso más pronunciado.", fuente: "Semana 3 · Sesión 4.1" },
    { tema: "Polares", titulo: "Integrales en regiones circulares", explicacion: "Convierte x e y mediante r y θ. Al cambiar de coordenadas, el área incorpora el Jacobiano r; omitirlo cambia el resultado.", fuente: "Semana 6 · Sesión 6.1" },
  ],
};

export type Memoria = { tema: string; frente: string; reverso: string; fuente: string };

function comoSituacion(definicion: string): string {
  return `Cuando se necesita ${definicion.charAt(0).toLowerCase()}${definicion.slice(1)}`;
}

/**
 * Cada idea comprobada en un archivo de clase crea tres preguntas: recuperar
 * la definición, reconocer el concepto y elegirlo en una situación de uso.
 * Así el cuestionario practica términos y aplicación, no solo memoria literal.
 */
function ampliar(contenido: ContenidoCurso, memorias: Memoria[]): ContenidoCurso {
  const preguntas = memorias.flatMap((memoria, indice) => {
    const alternativas = memorias.filter((_, otra) => otra !== indice).slice(0, 3);
    return [
      q(memoria.tema, `¿Qué describe ${memoria.frente}?`, memoria.reverso, alternativas.map((otra) => otra.reverso), `Repasa la definición de ${memoria.frente}.`, memoria.fuente),
      q(memoria.tema, `¿Qué concepto corresponde a esta descripción? ${memoria.reverso}`, memoria.frente, alternativas.map((otra) => otra.frente), `La descripción corresponde a ${memoria.frente}.`, memoria.fuente),
      q(memoria.tema, `¿En cuál situación corresponde usar ${memoria.frente}?`, comoSituacion(memoria.reverso), alternativas.map((otra) => comoSituacion(otra.reverso)), `La situación correcta aplica la definición de ${memoria.frente}.`, memoria.fuente),
    ];
  });
  return {
    ...contenido,
    preguntas: [...contenido.preguntas, ...preguntas],
    tarjetas: [...contenido.tarjetas, ...memorias.map((memoria) => t(memoria.tema, memoria.frente, memoria.reverso, memoria.fuente))],
  };
}

const ARQUITECTURA_AMPLIADA = ampliar(ARQUITECTURA, [
  { tema: "Modelo de negocio", frente: "Canales", reverso: "Medios por los que la empresa comunica, distribuye y vende su propuesta de valor.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
  { tema: "Modelo de negocio", frente: "Relaciones con clientes", reverso: "Vínculos que una empresa establece y mantiene con cada segmento de mercado.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
  { tema: "Modelo de negocio", frente: "Fuentes de ingresos", reverso: "Formas en que una empresa obtiene dinero de cada segmento de mercado.", fuente: "Unidad 1 · Semana 1 · Sesión 1" },
  { tema: "Patrones", frente: "Desagregación", reverso: "Separar negocios con lógicas económicas, competitivas y culturales diferentes para gestionarlos por separado.", fuente: "Unidad 1 · Semana 1 · Sesión 2" },
  { tema: "Patrones", frente: "Plataforma multilateral", reverso: "Modelo que crea valor al facilitar la interacción entre dos o más grupos de clientes interdependientes.", fuente: "Unidad 1 · Semana 1 · Sesión 2" },
  { tema: "Integración", frente: "EAI", reverso: "Integración de aplicaciones empresariales para conectar funciones y datos mediante flujos de trabajo.", fuente: "Unidad 1 · Semana 2 · Sesión 1" },
  { tema: "Integración", frente: "Gobierno de datos", reverso: "Conjunto de decisiones, responsabilidades y controles para que los datos sean consistentes y útiles.", fuente: "Unidad 1 · Semana 2 · Sesión 1" },
  { tema: "Problemas", frente: "5W2H", reverso: "Método que estructura un problema preguntando qué, por qué, dónde, quién, cuándo, cómo y cuánto.", fuente: "Unidad 1 · Semana 2 · Sesión 2" },
  { tema: "Problemas", frente: "Diagrama de Ishikawa", reverso: "Herramienta de causa y efecto que organiza causas posibles para encontrar la causa raíz de un problema.", fuente: "Unidad 1 · Semana 2 · Sesión 2" },
  { tema: "Problemas", frente: "Seis M", reverso: "Categorías de Ishikawa: mano de obra, métodos, máquinas, materiales, mediciones y medio ambiente.", fuente: "Unidad 1 · Semana 2 · Sesión 2" },
  { tema: "Métodos sistémicos", frente: "SSM", reverso: "Metodología de sistemas blandos que busca aprendizaje y consenso cuando el problema es ambiguo y hay perspectivas distintas.", fuente: "Unidad 1 · Semana 3 · Sesión 1" },
  { tema: "Métodos sistémicos", frente: "CATWOE", reverso: "Elementos de una definición raíz: clientes, actores, transformación, visión del mundo, dueños y entorno.", fuente: "Unidad 1 · Semana 3 · Sesión 1" },
  { tema: "Métodos sistémicos", frente: "CSP", reverso: "Práctica de sistemas críticos que elige métodos según complejidad, conflicto y relaciones de poder.", fuente: "Unidad 1 · Semana 3 · Sesión 1" },
]);

const EXPERIMENTOS_AMPLIADO = ampliar(EXPERIMENTOS, [
  { tema: "Requerimientos", frente: "Validez", reverso: "Criterio que verifica que las funciones requeridas soporten las necesidades reales del cliente.", fuente: "Unidad 1 · S1 · Modelos de Requerimientos" },
  { tema: "Requerimientos", frente: "Prototipo", reverso: "Representación temprana del sistema que ayuda a aclarar, comunicar y validar requisitos.", fuente: "Unidad 1 · S1 · Modelos de Requerimientos" },
  { tema: "Planificación", frente: "Hito", reverso: "Punto significativo del cronograma que marca un logro o evento importante sin duración propia.", fuente: "Unidad 1 · S1 · Modelos de Requerimientos" },
  { tema: "Scrum", frente: "Product Backlog", reverso: "Lista ordenada de necesidades, funcionalidades y trabajo pendiente del producto.", fuente: "Unidad 1 · S2 · Introducción a Scrum" },
  { tema: "Scrum", frente: "Sprint", reverso: "Periodo de duración fija en el que el equipo crea un incremento del producto.", fuente: "Unidad 1 · S2 · Introducción a Scrum" },
  { tema: "Scrum", frente: "Incremento", reverso: "Resultado utilizable que cumple la definición de terminado al final de un sprint.", fuente: "Unidad 1 · S2 · Introducción a Scrum" },
  { tema: "Scrum", frente: "Daily Scrum", reverso: "Evento breve diario para inspeccionar el avance hacia el objetivo del sprint y ajustar el plan.", fuente: "Unidad 1 · S2 · Introducción a Scrum" },
  { tema: "Mantis", frente: "Gestor de incidencias", reverso: "Herramienta para registrar, asignar, seguir y cerrar defectos o problemas de un producto.", fuente: "Unidad 1 · S3 · Mantis BT" },
  { tema: "Pruebas", frente: "Caso de prueba", reverso: "Conjunto de precondiciones, pasos, datos y resultado esperado para verificar un comportamiento.", fuente: "Unidad 1 · S3 · Mantis BT" },
  { tema: "Calidad", frente: "Aseguramiento de calidad", reverso: "Actividades planificadas que buscan dar confianza de que el proceso y producto cumplirán requisitos.", fuente: "Unidad 1 · S4 · Introducción a la Calidad" },
  { tema: "Experimentos", frente: "Variable independiente", reverso: "Factor que el investigador manipula o selecciona para observar su efecto.", fuente: "Unidad 2 · Lectura 1 · Diseño de Experimentos" },
  { tema: "Experimentos", frente: "Variable dependiente", reverso: "Resultado que se mide para observar el efecto de una variable independiente.", fuente: "Unidad 2 · Lectura 1 · Diseño de Experimentos" },
  { tema: "Experimentos", frente: "Hipótesis", reverso: "Proposición comprobable que plantea una relación esperada entre variables.", fuente: "Unidad 2 · Lectura 1 · Diseño de Experimentos" },
  { tema: "Experimentos", frente: "Grupo de control", reverso: "Grupo de comparación que no recibe el tratamiento experimental o recibe la condición base.", fuente: "Unidad 3 · Lectura 2 · Diseño de Experimentos" },
]);

const FUNDAMENTOS_AMPLIADO = ampliar(FUNDAMENTOS, [
  { tema: "Arreglos", frente: "Arreglo", reverso: "Estructura que almacena elementos del mismo tipo y se accede mediante un índice.", fuente: "Semana 2 · FUSIIN · Arreglos" },
  { tema: "Arreglos", frente: "Índice", reverso: "Posición numérica con la que se accede a un elemento de un arreglo.", fuente: "Semana 2 · FUSIIN · Arreglos" },
  { tema: "Listas", frente: "List<T>", reverso: "Colección genérica de tamaño dinámico que permite agregar, buscar y eliminar elementos.", fuente: "Semana 3 · Ejercicio de Listas en C#" },
  { tema: "Listas", frente: "Multilista", reverso: "Estructura que organiza elementos relacionados usando más de una lista o enlace de acceso.", fuente: "Semana 4 · Ejercicios de Multilistas" },
  { tema: "Estructuras", frente: "Push", reverso: "Operación que agrega un elemento en la parte superior de una pila.", fuente: "Semana 5 · Pilas y Colas" },
  { tema: "Estructuras", frente: "Count", reverso: "Propiedad que indica cuántos elementos contiene una colección.", fuente: "Semana 5 · Pilas y Colas" },
  { tema: "Arquitectura", frente: "Proyecto por capas", reverso: "Organización que separa presentación, lógica de negocio y acceso a datos para reducir acoplamiento.", fuente: "Semana 9 · Pasos para crear un proyecto por capas" },
  { tema: "Base de datos", frente: "Tabla", reverso: "Estructura que almacena registros de una entidad en filas y atributos en columnas.", fuente: "Semana 10 · Base de Datos" },
  { tema: "Base de datos", frente: "Clave primaria", reverso: "Campo o conjunto de campos que identifica de forma única cada registro de una tabla.", fuente: "Semana 10 · Base de Datos" },
  { tema: "SQL", frente: "SELECT", reverso: "Instrucción SQL que consulta datos de una o más tablas.", fuente: "Semana 10 · SQL Server" },
  { tema: "SQL", frente: "WHERE", reverso: "Cláusula SQL que filtra filas según una condición.", fuente: "Semana 10 · SQL Server" },
  { tema: "Entity Framework", frente: "ORM", reverso: "Mapeo objeto-relacional que conecta clases del programa con tablas de una base de datos.", fuente: "Semana 11 · Entity Framework, SQL y LINQ" },
  { tema: "LINQ", frente: "LINQ", reverso: "Conjunto de consultas integradas en C# para trabajar con colecciones y orígenes de datos.", fuente: "Semana 11 · Entity Framework, SQL y LINQ" },
  { tema: "LINQ", frente: "Consulta", reverso: "Expresión que selecciona, filtra, ordena o transforma datos sin modificar el origen por sí misma.", fuente: "Semana 11 · Entity Framework, SQL y LINQ" },
]);

/** Material explícito de las presentaciones de Redes, semanas 1 a 5.
 * Cada entrada produce recuperación, reconocimiento y aplicación para que un
 * término no se practique una sola vez ni se reduzca a una tarjeta literal. */
const REDES_SEMANAS_1_A_5: Memoria[] = [
  { tema: "S1 · Componentes", frente: "Host", reverso: "Dispositivo final donde se origina o recibe un mensaje y por el que los datos entran o salen de la red.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Componentes", frente: "Servidor", reverso: "Computadora que proporciona información o servicios de correo, web o archivos a dispositivos cliente.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Componentes", frente: "Cliente", reverso: "Equipo que solicita a un servidor información o un servicio, como una página web o correo electrónico.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Componentes", frente: "Dispositivo intermediario", reverso: "Equipo que interconecta dispositivos finales y administra el flujo de datos, como switch, router, punto de acceso o firewall.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Componentes", frente: "NIC", reverso: "Tarjeta de interfaz de red que permite conectar un dispositivo a una red mediante un puerto o interfaz.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Medios", frente: "Medio de cobre", reverso: "Medio de transmisión que lleva comunicación mediante impulsos eléctricos por alambres metálicos.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Medios", frente: "Fibra óptica", reverso: "Medio formado por fibras de vidrio o plástico que transporta datos mediante pulsos de luz.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Tipos de red", frente: "LAN", reverso: "Infraestructura que conecta dispositivos en un área limitada y suele ser administrada por una organización.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Tipos de red", frente: "WAN", reverso: "Infraestructura que interconecta LAN a través de áreas geográficas extensas y generalmente depende de proveedores de servicio.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Tipos de red", frente: "WLAN", reverso: "Red de área local que brinda conectividad inalámbrica, por ejemplo mediante Wi-Fi.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Internet", frente: "ISP", reverso: "Empresa que proporciona acceso a Internet a personas u organizaciones y puede ofrecer servicios complementarios.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Internet", frente: "FTTH", reverso: "Acceso de fibra óptica hasta el hogar que ofrece un ancho de banda muy alto.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Internet", frente: "HFC", reverso: "Acceso de alto ancho de banda de proveedores de televisión por cable mediante una red híbrida de fibra y coaxial.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Arquitectura", frente: "Red convergente", reverso: "Infraestructura única que transporta datos, voz y video usando el mismo conjunto de reglas y estándares.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Arquitectura", frente: "Tolerancia a fallas", reverso: "Capacidad de limitar el impacto de una falla mediante redundancia y rutas alternativas para los paquetes.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Arquitectura", frente: "Escalabilidad", reverso: "Capacidad de una red de crecer para admitir usuarios y aplicaciones sin afectar el servicio de los usuarios actuales.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Arquitectura", frente: "QoS", reverso: "Mecanismo que clasifica y administra tráfico para entregar de forma confiable voz y video sensibles al retardo.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Seguridad", frente: "Confidencialidad", reverso: "Objetivo de seguridad que asegura que solo los destinatarios autorizados puedan leer los datos.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Seguridad", frente: "Integridad", reverso: "Objetivo de seguridad que asegura que los datos no hayan sido alterados durante su transmisión.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S1 · Tecnologías", frente: "Hipervisor tipo 1", reverso: "Hipervisor instalado directamente sobre hardware físico, también llamado bare metal.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "S2 · Protocolos", frente: "Protocolo de red", reverso: "Conjunto de reglas que define cómo se codifican, formatean, temporizan y entregan mensajes entre dispositivos.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Protocolos", frente: "Secuenciación", reverso: "Función que identifica el orden de los datos para que el destino pueda reconstruir el mensaje correctamente.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Protocolos", frente: "Control de flujo", reverso: "Función que regula la velocidad de envío para que el receptor pueda procesar los datos.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Comunicación", frente: "Unicast", reverso: "Comunicación en la que un origen envía un mensaje a un único destino.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Comunicación", frente: "Multicast", reverso: "Comunicación en la que un origen envía un mensaje a un grupo específico de receptores.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Modelos", frente: "Encapsulación", reverso: "Proceso por el que cada capa agrega su información de control al preparar datos para transmitirlos.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Modelos", frente: "PDU de transporte", reverso: "Unidad de datos de la capa de transporte llamada segmento cuando se usa TCP.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Modelos", frente: "PDU de enlace", reverso: "Unidad de datos de la capa de enlace de datos llamada trama.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Transporte", frente: "Puerto 443", reverso: "Número de puerto asociado habitualmente al servicio HTTPS.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Transporte", frente: "Puerto 53", reverso: "Número de puerto asociado habitualmente al servicio DNS.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Rendimiento", frente: "Ancho de banda", reverso: "Capacidad de un medio para transportar datos durante una cantidad determinada de tiempo.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Rendimiento", frente: "Latencia", reverso: "Tiempo que tarda un dato en recorrer la red desde el origen hasta el destino.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Rendimiento", frente: "Goodput", reverso: "Tasa de datos útiles entregados a la aplicación, sin contar sobrecarga ni retransmisiones.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Medios", frente: "Diafonía", reverso: "Interferencia que se produce cuando la señal de un par de hilos de cobre afecta a otro par cercano.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Medios", frente: "Auto-MDIX", reverso: "Función Ethernet que detecta y ajusta automáticamente los pares de transmisión y recepción.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S2 · Medios", frente: "Fibra monomodo", reverso: "Fibra óptica diseñada para enlaces de larga distancia con un único modo de propagación de luz.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "S3 · IP", frente: "Mejor esfuerzo", reverso: "Característica de IP: intenta entregar paquetes sin garantizar entrega, orden ni recuperación ante pérdida.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IP", frente: "MTU", reverso: "Tamaño máximo de una unidad de datos que puede transportar un medio sin requerir fragmentación.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IP", frente: "TTL", reverso: "Campo IPv4 que se reduce en cada router y causa el descarte del paquete cuando llega a cero.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IP", frente: "NAT", reverso: "Proceso que traduce direcciones IP privadas a públicas o viceversa en el borde de una red.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IPv4", frente: "Rango privado 10.0.0.0/8", reverso: "Bloque RFC 1918 de direcciones privadas desde 10.0.0.0 hasta 10.255.255.255.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IPv4", frente: "Loopback IPv4", reverso: "Rango 127.0.0.0/8 reservado para comprobar la pila TCP/IP local del propio host.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · IPv4", frente: "APIPA", reverso: "Rango 169.254.0.0/16 que un host puede autoconfigurarse cuando no obtiene una dirección IPv4 de DHCP.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · Subredes", frente: "Operación AND", reverso: "Operación binaria entre una dirección IPv4 y su máscara para obtener la dirección de red.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S3 · Subredes", frente: "Prefijo /30", reverso: "Prefijo IPv4 con dos direcciones de host utilizables, habitual en enlaces punto a punto.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "S4 · VLSM", frente: "Asignación de mayor a menor", reverso: "Regla VLSM que asigna primero la subred con mayor necesidad de hosts y continúa hacia la menor.", fuente: "Semana 4 · VLSM" },
  { tema: "S4 · Diseño", frente: "Dirección estática", reverso: "Dirección IP predecible que se asigna a servidores y periféricos que deben ser localizables de forma estable.", fuente: "Semana 4 · VLSM" },
  { tema: "S4 · Diseño", frente: "DMZ", reverso: "Zona donde se ubican servidores accesibles desde Internet con direcciones públicas y separación del entorno interno.", fuente: "Semana 4 · VLSM" },
  { tema: "S5 · Ethernet", frente: "Almacenamiento y reenvío", reverso: "Método de switching que recibe la trama completa, verifica FCS y descarta la trama si detecta un error.", fuente: "Semana 5 · Ethernet, VLAN e Inter-VLAN" },
  { tema: "S5 · Ethernet", frente: "Conmutación de corte", reverso: "Método de switching que reenvía una trama antes de recibirla por completo para reducir latencia, sin comprobar FCS.", fuente: "Semana 5 · Ethernet, VLAN e Inter-VLAN" },
  { tema: "S5 · Ethernet", frente: "Dúplex completo", reverso: "Modo Ethernet que transmite y recibe simultáneamente, eliminando dominios de colisión.", fuente: "Semana 5 · Ethernet, VLAN e Inter-VLAN" },
  { tema: "S5 · VLAN", frente: "VLAN de voz", reverso: "VLAN separada para telefonía IP que requiere ancho de banda asegurado, prioridad QoS y baja latencia.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
  { tema: "S5 · Inter-VLAN", frente: "Router-on-a-stick", reverso: "Método entre VLAN que usa una interfaz física de router dividida en subinterfaces y un enlace troncal.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
  { tema: "S5 · Inter-VLAN", frente: "ip routing", reverso: "Comando de configuración global que habilita el enrutamiento IPv4 entre SVIs en un switch de capa 3.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
];

const REDES_AMPLIADO = ampliar(REDES, [
  ...REDES_SEMANAS_1_A_5,
  { tema: "Redes", frente: "Red de computadoras", reverso: "Conjunto de dispositivos interconectados que comparten datos y recursos mediante medios y protocolos.", fuente: "Semana 1 · Presentación de Redes" },
  { tema: "Modelos", frente: "Modelo OSI", reverso: "Marco de siete capas que organiza funciones de comunicación de red.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "Modelos", frente: "Capa de red", reverso: "Capa responsable del direccionamiento lógico y del encaminamiento de paquetes entre redes.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "Protocolos", frente: "TCP", reverso: "Protocolo orientado a conexión que ofrece entrega confiable, control de flujo y orden de datos.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "Protocolos", frente: "UDP", reverso: "Protocolo sin conexión que prioriza baja sobrecarga y no garantiza entrega ni orden.", fuente: "Semana 2 · Protocolos de Redes" },
  { tema: "IPv4", frente: "Dirección IPv4", reverso: "Identificador lógico de 32 bits usado para localizar una interfaz dentro de una red IP.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "IPv4", frente: "Máscara de subred", reverso: "Valor que separa la porción de red y la porción de host de una dirección IPv4.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "IPv4", frente: "Puerta de enlace predeterminada", reverso: "Router al que un host envía tráfico destinado a redes remotas.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "IPv4", frente: "Dirección de red", reverso: "Dirección que identifica una subred y no se asigna a un host individual.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "IPv4", frente: "Dirección de broadcast", reverso: "Dirección que envía un paquete a todos los hosts de una subred IPv4.", fuente: "Semana 3 · Direccionamiento IPv4" },
  { tema: "VLSM", frente: "VLSM", reverso: "Técnica que divide una red en subredes de tamaños diferentes según la cantidad de hosts requerida.", fuente: "Semana 4 · VLSM" },
  { tema: "VLSM", frente: "Prefijo CIDR", reverso: "Notación /n que indica cuántos bits pertenecen a la parte de red de una dirección IP.", fuente: "Semana 4 · VLSM" },
  { tema: "VLAN", frente: "VLAN", reverso: "Segmentación lógica de una red de capa 2 que crea dominios de broadcast separados.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
  { tema: "VLAN", frente: "Trunk", reverso: "Enlace que transporta tráfico de varias VLAN entre dispositivos de red.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
  { tema: "VLAN", frente: "802.1Q", reverso: "Estándar que etiqueta tramas Ethernet para identificar la VLAN a la que pertenecen.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
  { tema: "Inter-VLAN", frente: "SVI", reverso: "Interfaz virtual de un switch de capa 3 que permite enrutar entre VLAN.", fuente: "Semana 5 · VLAN e Inter-VLAN" },
]);

const CALCULO_AMPLIADO = ampliar(CALCULO, [
  { tema: "Geometría", frente: "Plano coordenado", reverso: "Plano determinado por dos ejes coordenados que mantiene una coordenada constante.", fuente: "Semana 1 · Planos y superficies cuádricas" },
  { tema: "Geometría", frente: "Superficie cuádrica", reverso: "Superficie definida por una ecuación de segundo grado en tres variables.", fuente: "Semana 1 · Planos y superficies cuádricas" },
  { tema: "Regiones", frente: "Región tipo I", reverso: "Región plana descrita con límites verticales, donde y varía entre dos funciones de x.", fuente: "Semana 2 · Construcción y descripción de regiones" },
  { tema: "Regiones", frente: "Región tipo II", reverso: "Región plana descrita con límites horizontales, donde x varía entre dos funciones de y.", fuente: "Semana 2 · Construcción y descripción de regiones" },
  { tema: "Derivadas", frente: "Derivada parcial", reverso: "Derivada de una función de varias variables respecto de una variable, manteniendo las demás constantes.", fuente: "Semana 3 · Derivadas parciales, direccionales y gradiente" },
  { tema: "Derivadas", frente: "Vector gradiente", reverso: "Vector formado por las derivadas parciales que apunta hacia el crecimiento máximo de una función.", fuente: "Semana 3 · Derivadas parciales, direccionales y gradiente" },
  { tema: "Derivadas", frente: "Derivada direccional", reverso: "Tasa de cambio de una función en la dirección de un vector unitario.", fuente: "Semana 3 · Derivadas parciales, direccionales y gradiente" },
  { tema: "Optimización", frente: "Extremo relativo", reverso: "Máximo o mínimo de una función comparado con valores de un entorno cercano.", fuente: "Semana 4 · Extremos relativos" },
  { tema: "Integrales dobles", frente: "Integral doble", reverso: "Límite de sumas que acumula una función sobre una región bidimensional.", fuente: "Semana 5 · Integrales dobles" },
  { tema: "Integrales dobles", frente: "Coordenadas polares", reverso: "Sistema que representa un punto plano por radio r y ángulo theta.", fuente: "Semana 6 · Integrales dobles en coordenadas polares" },
  { tema: "Integrales dobles", frente: "Jacobiano polar", reverso: "Factor r que aparece al transformar una integral doble de coordenadas cartesianas a polares.", fuente: "Semana 6 · Integrales dobles en coordenadas polares" },
  { tema: "Integrales triples", frente: "Coordenadas cilíndricas", reverso: "Sistema tridimensional que usa r, theta y z para describir puntos alrededor del eje z.", fuente: "Semana 7 · Integrales triples en coordenadas cilíndricas" },
  { tema: "Integrales triples", frente: "Coordenadas esféricas", reverso: "Sistema tridimensional que usa distancia al origen y dos ángulos para describir un punto.", fuente: "Semana 9 · Integrales triples en coordenadas esféricas" },
  { tema: "Campos", frente: "Campo escalar", reverso: "Función que asigna un número a cada punto de una región.", fuente: "Semana 11 · Campos escalares y vectoriales" },
  { tema: "Campos", frente: "Campo vectorial", reverso: "Función que asigna un vector a cada punto de una región.", fuente: "Semana 11 · Campos escalares y vectoriales" },
  { tema: "Curvas", frente: "Función vectorial", reverso: "Función que asigna a un parámetro un vector de posición y puede describir una curva.", fuente: "Semana 9 · Funciones vectoriales" },
  { tema: "Integrales de línea", frente: "Integral de línea escalar", reverso: "Acumulación de un campo escalar a lo largo de una curva, ponderada por longitud de arco.", fuente: "Semana 12 · Integral curvilínea de campo escalar" },
  { tema: "Integrales de línea", frente: "Integral de línea vectorial", reverso: "Acumulación de un campo vectorial a lo largo de una curva mediante el producto punto con el desplazamiento.", fuente: "Semana 12 · Integral curvilínea de campo vectorial" },
  { tema: "Teoremas", frente: "Teorema de Green", reverso: "Relaciona una integral de línea cerrada en el plano con una integral doble sobre la región interior.", fuente: "Semana 12 · Teorema de Green" },
  { tema: "Superficies", frente: "Integral de superficie", reverso: "Acumulación de un campo escalar o flujo de un campo vectorial sobre una superficie.", fuente: "Semana 13 · Integral de superficie" },
  { tema: "Teoremas", frente: "Teorema de la divergencia", reverso: "Relaciona el flujo saliente de un campo a través de una superficie cerrada con una integral triple de su divergencia.", fuente: "Semana 14 · Teoremas de divergencia y Stokes" },
  { tema: "Teoremas", frente: "Teorema de Stokes", reverso: "Relaciona una integral de línea sobre una curva cerrada con el flujo del rotacional sobre una superficie que la bordea.", fuente: "Semana 14 · Teoremas de divergencia y Stokes" },
]);

export const CONTENIDO_CICLO6: ContenidoCurso[] = [ARQUITECTURA_AMPLIADA, EXPERIMENTOS_AMPLIADO, FUNDAMENTOS_AMPLIADO, REDES_AMPLIADO, CALCULO_AMPLIADO];
export function contenidoParaCurso(nombre: string): ContenidoCurso | undefined {
  const normalizado = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CONTENIDO_CICLO6.find((c) => c.alias.test(normalizado));
}

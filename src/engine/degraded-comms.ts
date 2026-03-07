import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import {
  NivelComunicacion,
  VentanaEscucha,
  ProtocoloComunicacionesDegradadas,
} from '../types/dossier';

export function generarProtocoloComunicaciones(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloComunicacionesDegradadas {
  const niveles: NivelComunicacion[] = [];

  // Nivel 1 — Apps de mensajería (requires internet + battery)
  niveles.push({
    nivel: 1,
    nombre: 'Apps de mensajería',
    canal: nucleo.comunicaciones.apps.length > 0
      ? nucleo.comunicaciones.apps.join(', ')
      : 'WhatsApp, Telegram',
    disponible: nucleo.comunicaciones.apps.length > 0,
    instrucciones: [
      'Envía mensaje al grupo familiar con tu código de estado (VERDE/AMARILLO/ROJO/NEGRO)',
      'Usa mensajes de texto cortos, no notas de voz ni fotos (consumen más datos)',
      'Si solo hay datos intermitentes, usa Telegram (funciona mejor con conexión débil)',
    ],
  });

  // Nivel 2 — Llamadas de voz (requires cell coverage)
  niveles.push({
    nivel: 2,
    nombre: 'Llamadas de voz',
    canal: 'Llamada telefónica',
    disponible: nucleo.comunicaciones.moviles.length > 0,
    instrucciones: [
      'Sigue la cadena de contacto: llama primero al coordinador, luego al núcleo más cercano',
      'Si las llamadas no entran, envía SMS (necesitan menos red)',
      'Llamadas breves: di tu nombre, ubicación, estado, y cuelga',
    ],
  });

  // Nivel 3 — Teléfono fijo (works in blackouts if analog)
  niveles.push({
    nivel: 3,
    nombre: 'Teléfono fijo',
    canal: nucleo.comunicaciones.telefonoFijo || 'No disponible',
    disponible: !!nucleo.comunicaciones.telefonoFijo,
    instrucciones: [
      'Los teléfonos fijos analógicos funcionan sin electricidad',
      'Si tienes fijo, es tu mejor canal en un apagón',
    ],
  });

  // Nivel 4 — Walkie-talkies/PMR446 (no infrastructure needed)
  niveles.push({
    nivel: 4,
    nombre: 'Walkie-talkies/PMR446',
    canal: 'PMR446 Canal 8, Subtono 0',
    disponible: !!nucleo.comunicaciones.walkieTalkies,
    instrucciones: [
      'Alcance típico: 1-5 km según terreno y obstáculos',
      "Usa el protocolo: '[Tu ID], aquí [Tu ID], ¿me recibes? Cambio.'",
      "Responde: '[Tu ID] recibido. Estado [COLOR]. Cambio y corto.'",
      'Si no hay respuesta, intenta en 15 minutos',
    ],
  });

  // Nivel 5 — Radio de emergencia (receive only)
  niveles.push({
    nivel: 5,
    nombre: 'Radio de emergencia',
    canal: 'Radio Nacional / emisoras locales',
    disponible: !!nucleo.comunicaciones.radioEmergencia,
    instrucciones: [
      'Solo para RECIBIR información oficial',
      'Frecuencias: Radio Nacional de España (AM 585 kHz / FM según zona)',
      'Escucha los boletines de Protección Civil',
    ],
  });

  // Nivel 6 — Presencial / Señales físicas (always available)
  niveles.push({
    nivel: 6,
    nombre: 'Presencial / Señales físicas',
    canal: 'Desplazamiento físico',
    disponible: true,
    instrucciones: [
      'Si no hay ningún canal electrónico, desplázate al núcleo más cercano',
      'Deja señales físicas en tu puerta (ver señales físicas abajo)',
      'Acude al punto de encuentro a las horas establecidas',
    ],
  });

  // Ventanas de escucha (only if nucleo has walkieTalkies)
  let ventanasEscucha: VentanaEscucha[] | undefined;
  if (nucleo.comunicaciones.walkieTalkies) {
    ventanasEscucha = [
      {
        hora: 'Cada hora en punto (XX:00)',
        duracion: '5 minutos',
        canal: 'PMR446 Canal 8',
        protocolo: 'Enciende el walkie. Escucha 2 minutos. Si no hay tráfico, emite tu estado. Escucha 3 minutos más. Apaga para ahorrar batería.',
      },
      {
        hora: 'Ventana larga: 08:00, 14:00, 20:00',
        duracion: '15 minutos',
        canal: 'PMR446 Canal 8',
        protocolo: 'Ventanas principales para intercambio de información detallada entre núcleos.',
      },
    ];
  }

  const senalesFisicas: string[] = [
    'Toalla/tela VERDE en la ventana = Estamos bien, no necesitamos ayuda',
    'Toalla/tela ROJA en la ventana = Necesitamos ayuda (no urgente)',
    'Toalla/tela NEGRA en la ventana = Emergencia médica o situación grave',
    'X grande con cinta en la puerta = Casa evacuada, todos fuera',
    'Nota en la puerta con destino y hora = Indica dónde hemos ido',
    'Silbato: 3 pitidos cortos = Necesito ayuda. 1 pitido largo = Estoy aquí',
  ];

  const instruccionesGenerales: string[] = [
    'Desciende por los niveles a medida que fallen los canales. No te saltes niveles.',
    'Ahorra batería: apaga el móvil entre usos si la situación es prolongada.',
    'Los SMS consumen menos batería y red que las llamadas. Úsalos primero.',
    'Si tienes walkie-talkies, respeta las ventanas de escucha para no gastar pilas.',
    'Acuerda con los vecinos de confianza un sistema de señales similar.',
  ];

  const resultado: ProtocoloComunicacionesDegradadas = {
    niveles,
    senalesFisicas,
    instruccionesGenerales,
  };

  if (ventanasEscucha) {
    resultado.ventanasEscucha = ventanasEscucha;
  }

  return resultado;
}

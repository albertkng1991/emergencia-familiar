import { NucleoBase } from '../types/nucleo';
import { RedVecinos } from '../types/dossier';

export function generarRedVecinos(nucleo: NucleoBase): RedVecinos {
  const tieneVecinos = !!(nucleo.entorno?.vecinosConfianza && nucleo.entorno.vecinosConfianza !== '');

  let instrucciones: string[];

  if (tieneVecinos) {
    instrucciones = [
      `Tus vecinos de confianza: ${nucleo.entorno.vecinosConfianza}`,
      'En los primeros minutos de una emergencia, tus vecinos son tu ayuda más cercana — antes que cualquier familiar a kilómetros.',
      'Comparte con ellos: tu número de teléfono, si tienes necesidades especiales (bebé, mayor), y qué recursos puedes ofrecer.',
      'Acuerda un sistema de señales con ellos (toalla en ventana, golpes en pared).',
    ];
  } else {
    instrucciones = [
      'No has indicado vecinos de confianza. Considera identificar al menos 1-2 vecinos con los que puedas contar en emergencia.',
      'No necesitas compartir tu plan completo. Solo un teléfono de contacto y un acuerdo de ayuda mutua básica.',
    ];
  }

  const protocoloVecinal: string[] = [
    'En un apagón: comprueba que tus vecinos mayores o solos están bien.',
    'En una evacuación: avisa a tus vecinos antes de irte.',
    'Si oyes algo inusual en casa de un vecino de confianza, comprueba.',
    'No compartas información sensible de tu plan familiar (ubicaciones de reunión, recursos) con personas que no sean de máxima confianza.',
  ];

  return {
    tieneVecinos,
    instrucciones,
    protocoloVecinal,
  };
}

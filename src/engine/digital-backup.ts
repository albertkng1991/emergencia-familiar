import { NucleoBase } from '../types/nucleo';
import { InfoDigital } from '../types/dossier';

export function generarInfoDigital(nucleo: NucleoBase): InfoDigital {
  const codigoIdentificacion = `PEF-${nucleo.id}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const instrucciones: string[] = [
    `Código de identificación de tu plan: ${codigoIdentificacion}. Anótalo en un lugar seguro.`,
    'Guarda una copia digital del dossier en la nube (Google Drive, iCloud, etc.) protegida con contraseña.',
    'Comparte el enlace SOLO con los miembros de tu núcleo.',
    'Guarda una copia en un USB que lleves en la mochila de emergencia.',
    'Si pierdes la ficha física, pide al coordinador una reimpresión con el código de identificación.',
  ];

  return {
    codigoIdentificacion,
    instrucciones,
  };
}

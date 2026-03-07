import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { PlanEvacuacion, RutaEvacuacion } from '../types/dossier';

function encontrarDistancia(
  inter: Interconexiones,
  deNucleoId: string,
  aDestino: string
): { minutosCoche: number; minutosAPie?: number } | undefined {
  return inter.distancias.find(
    d =>
      (d.de === deNucleoId && d.a === aDestino) ||
      (d.a === deNucleoId && d.de === aDestino)
  );
}

function tieneVehiculo(nucleo: NucleoBase): boolean {
  return nucleo.transporte.vehiculos.length > 0;
}

function tieneBebe(nucleo: NucleoBase): boolean {
  return nucleo.modulosAdicionales.includes('bebe');
}

function tieneMayores(nucleo: NucleoBase): boolean {
  return nucleo.modulosAdicionales.includes('mayores');
}

function tieneProblemasMovilidad(nucleo: NucleoBase): boolean {
  if (!nucleo.moduloMayores) return false;
  const mov = nucleo.moduloMayores.movilidad?.toLowerCase() ?? '';
  return (
    mov.includes('reducida') ||
    mov.includes('limitada') ||
    mov.includes('dificultad') ||
    mov.includes('silla') ||
    mov.includes('andador') ||
    mov.includes('bastón') ||
    mov.includes('baston')
  );
}

function plantaAltaSinAscensor(nucleo: NucleoBase): boolean {
  const planta = nucleo.vivienda.planta;
  if (planta === undefined || planta <= 2) return false;
  return nucleo.vivienda.ascensor === false;
}

function obtenerMascotas(nucleo: NucleoBase): string[] {
  if (!nucleo.preferencias.mascotas || nucleo.preferencias.mascotas.length === 0) {
    return [];
  }
  return nucleo.preferencias.mascotas.map(m => m.nombre ?? m.tipo);
}

function generarRutaAPie(
  nucleo: NucleoBase,
  inter: Interconexiones
): RutaEvacuacion {
  const global = inter.puntosEncuentro.global;
  const distancia = encontrarDistancia(inter, nucleo.id, 'global');

  let tiempoEstimado: string;
  if (distancia?.minutosAPie !== undefined) {
    tiempoEstimado = `${distancia.minutosAPie} minutos a pie`;
  } else {
    tiempoEstimado = 'Estimar según distancia';
  }

  let descripcion: string;
  if (global.comoLlegar) {
    descripcion = global.comoLlegar;
  } else {
    descripcion = `Desde ${nucleo.vivienda.direccion} hasta ${global.ubicacion}`;
  }

  return {
    nombre: 'Ruta principal a pie',
    tipo: 'a_pie',
    destino: global.ubicacion,
    descripcion,
    tiempoEstimado,
  };
}

function generarRutaCoche(
  nucleo: NucleoBase,
  inter: Interconexiones
): RutaEvacuacion | undefined {
  if (!tieneVehiculo(nucleo)) return undefined;

  const global = inter.puntosEncuentro.global;
  const distancia = encontrarDistancia(inter, nucleo.id, 'global');
  const secuencia = inter.escenarios.evacuacion.secuenciaRecogida;

  let tiempoEstimado: string;
  if (distancia?.minutosCoche !== undefined) {
    tiempoEstimado = `${distancia.minutosCoche} minutos en coche`;
  } else {
    tiempoEstimado = 'Estimar según distancia';
  }

  let descripcion = `Desde ${nucleo.vivienda.direccion} en coche hasta ${global.ubicacion}`;
  if (secuencia && secuencia.length > 0) {
    descripcion += `. Secuencia de recogida: ${secuencia.join(' → ')}`;
  }

  let notas: string | undefined;
  if (secuencia && secuencia.length > 0) {
    notas = 'Sigue la secuencia de recogida antes de dirigirte al punto de encuentro';
  }

  return {
    nombre: 'Ruta en coche',
    tipo: 'coche',
    destino: global.ubicacion,
    descripcion,
    tiempoEstimado,
    notas,
  };
}

function generarRutaAlternativa(
  nucleo: NucleoBase,
  inter: Interconexiones
): RutaEvacuacion | undefined {
  const alternativo = inter.puntosEncuentro.alternativo;
  if (!alternativo) return undefined;

  let descripcion: string;
  if (alternativo.comoLlegar) {
    descripcion = alternativo.comoLlegar;
  } else {
    descripcion = `Desde ${nucleo.vivienda.direccion} hasta ${alternativo.ubicacion}`;
  }

  return {
    nombre: 'Ruta alternativa',
    tipo: 'alternativa',
    destino: alternativo.ubicacion,
    descripcion,
    tiempoEstimado: 'Estimar según distancia',
  };
}

function generarSecuenciaRecogida(
  nucleos: NucleoBase[],
  inter: Interconexiones
): { orden: number; nucleo: string; nombre: string; direccion: string; telefono: string }[] | undefined {
  const secuencia = inter.escenarios.evacuacion.secuenciaRecogida;
  if (!secuencia || secuencia.length === 0) return undefined;

  return secuencia.map((nucleoId, index) => {
    const nucleo = nucleos.find(n => n.id === nucleoId);
    const nombre = nucleo?.nombre ?? nucleoId;
    const direccion = nucleo?.vivienda.direccion ?? 'Dirección desconocida';
    const telefono =
      nucleo?.comunicaciones.moviles[0]?.numero ?? 'Sin teléfono';

    return {
      orden: index + 1,
      nucleo: nucleoId,
      nombre,
      direccion,
      telefono,
    };
  });
}

function generarQueLlevar(nucleo: NucleoBase): string[] {
  const items: string[] = [
    'Mochila de emergencia de CADA miembro',
    'Documentación original (DNI, pasaportes)',
    'Medicación de todos los miembros',
    'Móviles cargados y powerbanks',
    'Agua y comida para el desplazamiento',
    'Llaves del vehículo y documentación del coche',
    'Efectivo',
  ];

  const mascotas = obtenerMascotas(nucleo);
  for (const mascota of mascotas) {
    items.push(`Transportín y comida para ${mascota}`);
  }

  return items;
}

function generarAntesDeIrte(
  nucleo: NucleoBase,
  inter: Interconexiones
): string[] {
  const destino = inter.puntosEncuentro.global.ubicacion;
  return [
    'Corta las llaves de paso: agua, gas y electricidad',
    'Cierra ventanas y persianas',
    'Deja una nota visible en la puerta: destino, hora de salida, número de contacto',
    'Verifica que todos los miembros del núcleo están presentes',
    `Envía mensaje al grupo: 'Código NEGRO — ${nucleo.id} evacuando hacia ${destino}'`,
  ];
}

function generarInstruccionesEspeciales(nucleo: NucleoBase): string[] {
  const instrucciones: string[] = [];

  if (tieneBebe(nucleo)) {
    instrucciones.push(
      'Lleva al bebé en el portabebés, no en la silla del coche si vas a pie'
    );
  }

  if (tieneMayores(nucleo) && tieneProblemasMovilidad(nucleo)) {
    instrucciones.push(
      'Planifica tiempo extra para la evacuación. Si es necesario, solicita ayuda al núcleo más cercano'
    );
  }

  if (plantaAltaSinAscensor(nucleo)) {
    instrucciones.push(
      'Evacuación por escaleras. Lleva solo lo imprescindible en la primera bajada'
    );
  }

  const mascotas = obtenerMascotas(nucleo);
  if (mascotas.length > 0) {
    instrucciones.push(
      "Si no puedes llevar a la mascota, déjala con agua y comida y marca la puerta con 'ANIMAL DENTRO'"
    );
  }

  return instrucciones;
}

export function generarPlanEvacuacion(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): PlanEvacuacion {
  const rutasDesdeHogar: RutaEvacuacion[] = [];

  // 1. Ruta principal a pie
  rutasDesdeHogar.push(generarRutaAPie(nucleo, inter));

  // 2. Ruta en coche (if has vehicle)
  const rutaCoche = generarRutaCoche(nucleo, inter);
  if (rutaCoche) {
    rutasDesdeHogar.push(rutaCoche);
  }

  // 3. Ruta alternativa
  const rutaAlternativa = generarRutaAlternativa(nucleo, inter);
  if (rutaAlternativa) {
    rutasDesdeHogar.push(rutaAlternativa);
  }

  // 4. Secuencia de recogida
  const secuenciaRecogida = generarSecuenciaRecogida(nucleos, inter);

  // 5. Qué llevar
  const queLlevar = generarQueLlevar(nucleo);

  // 6. Antes de irte
  const antesDeIrte = generarAntesDeIrte(nucleo, inter);

  // 7. Instrucciones especiales
  const instruccionesEspeciales = generarInstruccionesEspeciales(nucleo);

  return {
    rutasDesdeHogar,
    secuenciaRecogida,
    queLlevar,
    antesDeIrte,
    instruccionesEspeciales,
  };
}

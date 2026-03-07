import { NucleoBase } from '../types/nucleo';
import { PlanAgua, FaseRacionamiento } from '../types/dossier';

export function generarPlanAgua(nucleo: NucleoBase): PlanAgua {
  const numPersonas = nucleo.miembros.length;

  const consumoDiario = `${numPersonas * 3} litros (${numPersonas} personas × 3L/día)`;

  const reservaActual = nucleo.suministros?.aguaAlmacenada || 'No declarada';

  const diasAutonomia = calcularDiasAutonomia(reservaActual, numPersonas);

  const fasesRacionamiento = generarFasesRacionamiento();

  const fuentesAlternativas = generarFuentesAlternativas(nucleo);

  const metodosPotabilizacion = generarMetodosPotabilizacion();

  const consejos = generarConsejos(nucleo);

  return {
    consumoDiario,
    reservaActual,
    diasAutonomia,
    fasesRacionamiento,
    fuentesAlternativas,
    metodosPotabilizacion,
    consejos,
  };
}

function calcularDiasAutonomia(reservaActual: string, numPersonas: number): string {
  const match = reservaActual.match(/(\d+)/);
  if (match) {
    const litros = parseInt(match[1], 10);
    const consumoDiario = numPersonas * 3;
    const dias = Math.floor(litros / consumoDiario);
    return `${dias} días aproximadamente (${litros}L ÷ ${consumoDiario}L/día)`;
  }
  return 'Desconocida — almacena agua cuanto antes';
}

function generarFasesRacionamiento(): FaseRacionamiento[] {
  return [
    {
      fase: 'Normal',
      litrosPorPersonaDia: '3L',
      uso: '2L bebida + 1L cocina/higiene básica',
      duracion: 'Mientras haya suministro o reserva suficiente',
    },
    {
      fase: 'Racionamiento moderado',
      litrosPorPersonaDia: '2L',
      uso: '1.5L bebida + 0.5L cocina. Sin higiene con agua potable',
      duracion: 'Cuando la reserva baje del 50%',
    },
    {
      fase: 'Racionamiento severo',
      litrosPorPersonaDia: '1.5L',
      uso: 'Solo bebida y cocina mínima. Priorizar niños y mayores',
      duracion: 'Cuando la reserva baje del 25%',
    },
    {
      fase: 'Emergencia',
      litrosPorPersonaDia: '1L',
      uso: 'Solo bebida. Prioridad absoluta a bebés, enfermos y mayores',
      duracion: 'Últimas reservas',
    },
  ];
}

function generarFuentesAlternativas(nucleo: NucleoBase): string[] {
  const fuentes: string[] = [
    'Agua del calentador/termo eléctrico (30-80L según modelo). Corta la entrada de agua antes y deja enfriar.',
    'Agua de las cisternas de los WC (NO potable, pero útil para limpieza e higiene)',
    'Agua de lluvia (recoger con lonas, cubos, sábanas extendidas hacia un recipiente)',
    'Hielo del congelador (potable al derretirse)',
  ];

  const espacioExterior = nucleo.vivienda.espacioExterior?.toLowerCase() || '';
  if (espacioExterior.includes('jardín') || espacioExterior.includes('jardin') || espacioExterior.includes('terraza')) {
    fuentes.push('Si tienes manguera de jardín, llena recipientes inmediatamente al inicio de la emergencia');
  }

  const zona = nucleo.entorno.zona?.toLowerCase() || '';
  if (zona.includes('rural')) {
    fuentes.push('Busca fuentes naturales, ríos o pozos cercanos. SIEMPRE potabilizar antes de beber.');
  }

  fuentes.push('Piscinas comunitarias (NO potable sin tratamiento, pero útil para higiene)');

  return fuentes;
}

function generarMetodosPotabilizacion(): string[] {
  return [
    'Hervir: el método más fiable. Hervir a borbotones durante 1 minuto (3 min en altitud). Dejar enfriar.',
    'Pastillas potabilizadoras: seguir instrucciones del envase. Esperar el tiempo indicado (normalmente 30 min).',
    'Lejía doméstica (sin perfume ni aditivos): 2 gotas por litro de agua clara. Esperar 30 minutos. Debe oler ligeramente a cloro.',
    'Filtros portátiles: tipo LifeStraw o Sawyer. Filtran bacterias y protozoos pero NO virus ni químicos.',
    'Destilación solar: en emergencia extrema, con un plástico transparente sobre un hoyo con vegetación.',
  ];
}

function generarConsejos(nucleo: NucleoBase): string[] {
  const consejos: string[] = [
    'Llena la bañera de agua al primer signo de emergencia. Son 150-200L extra.',
    'No esperes a tener sed para beber. La deshidratación reduce tu capacidad de pensar y actuar.',
    'El agua turbia se puede clarificar dejándola reposar y filtrando con un trapo limpio ANTES de potabilizar.',
    'Nunca bebas agua de mar, anticongelante, o agua con olor químico fuerte.',
    'Prioriza SIEMPRE: bebés > mayores > enfermos > adultos sanos.',
  ];

  // Check for babies
  const tieneBebe = nucleo.modulosAdicionales?.includes('bebe') && nucleo.moduloBebe;
  if (tieneBebe) {
    consejos.push('Los bebés necesitan agua hervida incluso para preparar biberones con agua embotellada.');
  }

  // Check for elderly with medications
  const tieneMayoresConMedicacion =
    nucleo.modulosAdicionales?.includes('mayores') &&
    nucleo.moduloMayores?.medicacionDetallada &&
    nucleo.moduloMayores.medicacionDetallada.length > 0;
  if (tieneMayoresConMedicacion) {
    consejos.push('Asegura agua suficiente para tomar la medicación. Sin agua, la medicación no se absorbe bien.');
  }

  return consejos;
}

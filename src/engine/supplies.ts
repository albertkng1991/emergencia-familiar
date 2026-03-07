import { NucleoBase } from '../types/nucleo';
import { ListaSuministros, ItemSuministro } from '../types/dossier';

export function calcularSuministros(nucleo: NucleoBase): ListaSuministros {
  const numPersonas = nucleo.miembros.length;
  const items = generarListaBase(nucleo, numPersonas);
  const itemsEspecificos = generarItemsEspecificos(nucleo);
  const resumenFaltantes = detectarFaltantes(nucleo, items, itemsEspecificos);

  return { items, itemsEspecificos, resumenFaltantes };
}

function generarListaBase(n: NucleoBase, personas: number): ItemSuministro[] {
  const items: ItemSuministro[] = [];

  // Agua
  const litros72h = personas * 3 * 3; // 3L/persona/día * 3 días
  const litros2sem = personas * 3 * 14;
  items.push({
    categoria: 'Agua',
    item: 'Agua potable embotellada',
    cantidad72h: `${litros72h} litros (${personas} personas × 3L/día × 3 días)`,
    cantidad2semanas: `${litros2sem} litros (${personas} personas × 3L/día × 14 días)`,
    tieneActualmente: !!(n.suministros?.aguaAlmacenada && n.suministros.aguaAlmacenada !== ''),
    notas: n.suministros?.aguaAlmacenada || undefined,
  });

  items.push({
    categoria: 'Agua',
    item: 'Pastillas potabilizadoras',
    cantidad72h: '1 paquete',
    cantidad2semanas: '3 paquetes',
    tieneActualmente: false,
  });

  // Alimentación
  items.push({
    categoria: 'Alimentación',
    item: 'Comida no perecedera (conservas, arroz, pasta)',
    cantidad72h: `${personas * 3} raciones (3 comidas/persona × 3 días)`,
    cantidad2semanas: `${personas * 14} raciones (1 comida/persona × 14 días + complementos)`,
    tieneActualmente: !!(n.suministros?.comidaNoPerecedera && n.suministros.comidaNoPerecedera !== ''),
    notas: n.suministros?.comidaNoPerecedera || undefined,
  });

  items.push({
    categoria: 'Alimentación',
    item: 'Frutos secos, barritas energéticas',
    cantidad72h: `${personas * 3} unidades`,
    cantidad2semanas: `${personas * 14} unidades`,
    tieneActualmente: false,
  });

  items.push({
    categoria: 'Alimentación',
    item: 'Leche en polvo o UHT',
    cantidad72h: `${personas} litros`,
    cantidad2semanas: `${personas * 4} litros`,
    tieneActualmente: false,
  });

  // Botiquín
  items.push({
    categoria: 'Botiquín',
    item: 'Botiquín de primeros auxilios completo',
    cantidad72h: '1 botiquín',
    cantidad2semanas: '1 botiquín ampliado',
    tieneActualmente: n.suministros?.botiquin === 'completo' || n.suministros?.botiquin === 'básico',
    notas: n.suministros?.botiquin ? `Estado actual: ${n.suministros.botiquin}` : undefined,
  });

  // Medicación de cada miembro
  for (const m of n.miembros) {
    if (m.medicacionFija && m.medicacionFija !== '') {
      items.push({
        categoria: 'Medicación',
        item: `Medicación de ${m.nombre}: ${m.medicacionFija}`,
        cantidad72h: 'Reserva para 3 días',
        cantidad2semanas: 'Reserva para 14 días',
        tieneActualmente: false,
        notas: 'Verificar stock con farmacia habitual',
      });
    }
  }

  // Iluminación
  items.push({
    categoria: 'Iluminación',
    item: 'Linternas + pilas de repuesto',
    cantidad72h: `${Math.max(2, Math.ceil(personas / 2))} linternas`,
    cantidad2semanas: `${Math.max(2, Math.ceil(personas / 2))} linternas + pilas extra`,
    tieneActualmente: !!(n.suministros?.iluminacion && n.suministros.iluminacion !== ''),
    notas: n.suministros?.iluminacion || undefined,
  });

  items.push({
    categoria: 'Iluminación',
    item: 'Velas + mechero',
    cantidad72h: '10 velas + 2 mecheros',
    cantidad2semanas: '30 velas + 3 mecheros',
    tieneActualmente: false,
  });

  // Cocina
  items.push({
    categoria: 'Cocina',
    item: 'Cocina alternativa (camping gas/barbacoa)',
    cantidad72h: '1 hornillo + 2 bombonas',
    cantidad2semanas: '1 hornillo + 6 bombonas',
    tieneActualmente: !!(n.suministros?.cocinaAlternativa && n.suministros.cocinaAlternativa !== ''),
    notas: n.suministros?.cocinaAlternativa || undefined,
  });

  // Energía
  items.push({
    categoria: 'Energía',
    item: 'Powerbanks para móviles',
    cantidad72h: `${Math.ceil(personas / 2)} powerbanks cargados`,
    cantidad2semanas: `${Math.ceil(personas / 2)} powerbanks + panel solar portátil`,
    tieneActualmente: !!(n.comunicaciones?.powerbanks && n.comunicaciones.powerbanks !== ''),
    notas: n.comunicaciones?.powerbanks || undefined,
  });

  // Documentos
  items.push({
    categoria: 'Documentos',
    item: 'Copias de documentos importantes (DNI, seguros, escrituras)',
    cantidad72h: '1 copia en USB/nube',
    cantidad2semanas: '1 copia en USB + 1 en nube + 1 física fuera de casa',
    tieneActualmente: !!(n.suministros?.copiasDocumentos && n.suministros.copiasDocumentos !== ''),
    notas: n.suministros?.copiasDocumentos || undefined,
  });

  // Higiene
  items.push({
    categoria: 'Higiene',
    item: 'Kit de higiene (jabón, papel higiénico, bolsas basura)',
    cantidad72h: '1 kit básico',
    cantidad2semanas: '3 kits',
    tieneActualmente: false,
  });

  // Herramientas
  items.push({
    categoria: 'Herramientas',
    item: 'Multiherramienta, cinta americana, cuerda',
    cantidad72h: '1 kit',
    cantidad2semanas: '1 kit ampliado',
    tieneActualmente: !!(n.recursos?.herramientas && n.recursos.herramientas.length > 0),
  });

  // Efectivo (consejo genérico, no se pregunta la cantidad)
  items.push({
    categoria: 'Finanzas',
    item: 'Efectivo en billetes pequeños',
    cantidad72h: '100-200€',
    cantidad2semanas: '500-1000€',
    tieneActualmente: false,
    notas: 'Es recomendable tener efectivo en casa por si fallan cajeros o datáfonos',
  });

  return items;
}

function generarItemsEspecificos(n: NucleoBase): ItemSuministro[] {
  const items: ItemSuministro[] = [];

  // Módulo bebé
  if (n.modulosAdicionales?.includes('bebe') && n.moduloBebe) {
    const bb = n.moduloBebe;

    if (bb.alimentacion?.toLowerCase().includes('fórmula') || bb.alimentacion?.toLowerCase().includes('formula')) {
      items.push({
        categoria: 'Bebé — Alimentación',
        item: `Fórmula infantil${bb.alimentosEspecificos ? `: ${bb.alimentosEspecificos}` : ''}`,
        cantidad72h: '6 biberones preparados + 1 bote fórmula',
        cantidad2semanas: '4 botes de fórmula',
        tieneActualmente: false,
      });
    }

    items.push({
      categoria: 'Bebé — Pañales',
      item: `Pañales${bb.panales ? ` (${bb.panales})` : ''}`,
      cantidad72h: '30 pañales + toallitas',
      cantidad2semanas: '150 pañales + toallitas',
      tieneActualmente: false,
      notas: bb.panales || undefined,
    });

    items.push({
      categoria: 'Bebé — Medicación',
      item: `Medicación infantil${bb.medicacionInfantil ? `: ${bb.medicacionInfantil}` : ' (Apiretal, suero oral)'}`,
      cantidad72h: '1 kit',
      cantidad2semanas: '2 kits',
      tieneActualmente: false,
    });

    items.push({
      categoria: 'Bebé — Transporte',
      item: `Portabebés${bb.portabebes ? `: ${bb.portabebes}` : ''}`,
      cantidad72h: '1 (accesible)',
      cantidad2semanas: '1',
      tieneActualmente: !!(bb.portabebes && bb.portabebes !== ''),
    });
  }

  // Módulo mayores
  if (n.modulosAdicionales?.includes('mayores') && n.moduloMayores) {
    const may = n.moduloMayores;

    if (may.medicacionDetallada) {
      for (const med of may.medicacionDetallada) {
        items.push({
          categoria: 'Mayor — Medicación',
          item: `${med.nombre} (${med.dosis}, ${med.frecuencia})`,
          cantidad72h: `Reserva 3 días${med.esencial ? ' ⚠ ESENCIAL' : ''}`,
          cantidad2semanas: `Reserva 14 días${med.esencial ? ' ⚠ ESENCIAL' : ''}`,
          tieneActualmente: false,
          notas: med.esencial ? 'Sin esta medicación hay riesgo vital' : undefined,
        });
      }
    }

    if (may.aparatosElectricosMedicos) {
      for (const ap of may.aparatosElectricosMedicos) {
        items.push({
          categoria: 'Mayor — Aparatos',
          item: `Baterías/alternativa para ${ap.aparato}`,
          cantidad72h: ap.autonomiaBateria || 'Verificar autonomía',
          cantidad2semanas: 'Acceso a generador necesario',
          tieneActualmente: !!(ap.alternativa),
          notas: ap.alternativa ? `Alternativa: ${ap.alternativa}` : undefined,
        });
      }
    }
  }

  // Módulo jóvenes
  if (n.modulosAdicionales?.includes('jovenes') && n.moduloJovenes) {
    items.push({
      categoria: 'Joven',
      item: 'Mochila de emergencia personal del adolescente',
      cantidad72h: '1 mochila preparada',
      cantidad2semanas: '1 mochila',
      tieneActualmente: false,
      notas: 'Incluir powerbank, silbato, copia de contactos, snacks',
    });
  }

  // Mascotas
  if (n.preferencias?.mascotas) {
    for (const mascota of n.preferencias.mascotas) {
      items.push({
        categoria: 'Mascotas',
        item: `Comida para ${mascota.nombre || mascota.tipo}`,
        cantidad72h: 'Reserva 3 días',
        cantidad2semanas: 'Reserva 14 días',
        tieneActualmente: false,
        notas: mascota.necesidades || undefined,
      });
    }
  }

  return items;
}

function detectarFaltantes(n: NucleoBase, items: ItemSuministro[], especificos: ItemSuministro[]): string[] {
  const faltantes: string[] = [];

  for (const item of [...items, ...especificos]) {
    if (!item.tieneActualmente) {
      faltantes.push(`${item.categoria}: ${item.item}`);
    }
  }

  return faltantes;
}

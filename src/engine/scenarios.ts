import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { ProtocoloEscenario, PasoProtocolo, ContactoDossier } from '../types/dossier';

export function generarProtocolos(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario[] {
  return [
    generarProtocoloApagon(nucleo, nucleos, inter),
    generarProtocoloCatastrofe(nucleo, nucleos, inter),
    generarProtocoloConflicto(nucleo, nucleos, inter),
    generarProtocoloPandemia(nucleo, nucleos, inter),
    generarProtocoloCrisisEconomica(nucleo, nucleos, inter),
  ];
}

function getNombreContacto(nucleos: NucleoBase[], id: string): string {
  const n = nucleos.find(nc => nc.id === id);
  return n ? `${n.miembros[0]?.nombre || n.nombre} (${n.id})` : id;
}

function getTelefono(nucleos: NucleoBase[], id: string): string {
  const n = nucleos.find(nc => nc.id === id);
  return n?.comunicaciones?.moviles?.[0]?.numero || 'sin teléfono';
}

function getContactosEscenario(nucleo: NucleoBase, nucleos: NucleoBase[], inter: Interconexiones): ContactoDossier[] {
  const contactos: ContactoDossier[] = [
    { nombre: 'Emergencias', telefono: '112', rol: 'Emergencias', prioridad: 0 },
  ];
  const coord = inter.cadenaContacto.coordinadorPrincipal;
  if (coord !== nucleo.id) {
    contactos.push({
      nombre: getNombreContacto(nucleos, coord),
      telefono: getTelefono(nucleos, coord),
      rol: 'Coordinador',
      nucleoId: coord,
      prioridad: 1,
    });
  }
  return contactos;
}

function generarProtocoloApagon(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario {
  const faseInmediata: PasoProtocolo[] = [];
  const faseCorta: PasoProtocolo[] = [];
  const faseLarga: PasoProtocolo[] = [];
  let paso = 1;

  // Fase inmediata (30 min)
  faseInmediata.push({ orden: paso++, accion: 'Mantén la calma. Localiza linternas y velas.' });
  faseInmediata.push({ orden: paso++, accion: `Corta las llaves de paso del gas${nucleo.vivienda.llavesPaso?.gas ? ` (ubicación: ${nucleo.vivienda.llavesPaso.gas})` : ''}.` });

  if (nucleo.comunicaciones?.moviles?.length > 0) {
    faseInmediata.push({
      orden: paso++,
      accion: `Pon los móviles en modo ahorro de energía. ${nucleo.comunicaciones.powerbanks ? `Usa el powerbank (${nucleo.comunicaciones.powerbanks}).` : 'Conserva la batería al máximo.'}`,
    });
  }

  faseInmediata.push({
    orden: paso++,
    accion: `Envía mensaje al grupo familiar: "Código AMARILLO — Apagón en ${nucleo.vivienda.direccion}. Estamos bien."`,
  });

  // Bebé: instrucciones específicas
  if (nucleo.modulosAdicionales?.includes('bebe') && nucleo.moduloBebe) {
    faseInmediata.push({
      orden: paso++,
      accion: `Prepara alimentación del bebé inmediatamente (puede necesitar calentar agua). ${nucleo.moduloBebe.alimentacion || ''}`,
    });
  }

  // CPAP u otros aparatos
  if (nucleo.moduloMayores?.aparatosElectricosMedicos?.length) {
    for (const ap of nucleo.moduloMayores.aparatosElectricosMedicos) {
      const nucleoGenerador = inter.recursosCompartidos?.generador;
      const contactoGen = nucleoGenerador ? getNombreContacto(nucleos, nucleoGenerador) : null;
      faseInmediata.push({
        orden: paso++,
        accion: `⚠ URGENTE: ${ap.aparato} sin corriente. ${ap.autonomiaBateria ? `Autonomía de batería: ${ap.autonomiaBateria}.` : ''} ${ap.alternativa ? `Alternativa: ${ap.alternativa}.` : ''} ${contactoGen ? `Si el apagón se prolonga, contactar con ${contactoGen} (tiene generador).` : 'Buscar acceso a generador.'}`,
      });
    }
  }

  // Fase corta (4h)
  paso = 1;
  faseCorta.push({ orden: paso++, accion: 'No abras la nevera innecesariamente. Los alimentos aguantan 4-6h sin abrir.' });

  if (nucleo.suministros?.cocinaAlternativa) {
    faseCorta.push({ orden: paso++, accion: `Prepara comida con ${nucleo.suministros.cocinaAlternativa} si es necesario.` });
  }

  faseCorta.push({ orden: paso++, accion: `Contacta con el coordinador (${getNombreContacto(nucleos, inter.cadenaContacto.coordinadorPrincipal)}) para confirmar estado y obtener información.` });

  if (nucleo.comunicaciones?.radioEmergencia) {
    faseCorta.push({ orden: paso++, accion: 'Sintoniza la radio de emergencia para obtener información oficial.' });
  }

  // Fase larga (72h)
  paso = 1;
  faseLarga.push({ orden: paso++, accion: 'Raciona el agua. Prioriza agua potable para beber, no para higiene.' });
  faseLarga.push({ orden: paso++, accion: 'Consume primero los alimentos perecederos del congelador (ya descongelados).' });

  const nucleoPreparado = inter.escenarios?.apagon?.nucleoMejorPreparado;
  if (nucleoPreparado && nucleoPreparado !== nucleo.id) {
    faseLarga.push({
      orden: paso++,
      accion: `Si la situación se prolonga, coordina con ${getNombreContacto(nucleos, nucleoPreparado)} (mejor preparado para apagón) para posible reagrupación.`,
    });
  }

  faseLarga.push({ orden: paso++, accion: 'Mantén un registro de consumo de agua y alimentos.' });

  return {
    escenario: 'apagon',
    titulo: '⚡ Apagón eléctrico prolongado',
    descripcion: 'Protocolo para cortes de electricidad de duración indeterminada.',
    faseInmediata,
    faseCorta,
    faseLarga,
    contactosRelevantes: getContactosEscenario(nucleo, nucleos, inter),
  };
}

function generarProtocoloCatastrofe(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario {
  const faseInmediata: PasoProtocolo[] = [];
  const faseCorta: PasoProtocolo[] = [];
  const faseLarga: PasoProtocolo[] = [];
  let paso = 1;

  // Fase inmediata
  faseInmediata.push({ orden: paso++, accion: 'Protégete. Aléjate de ventanas y objetos que puedan caer.' });

  if (nucleo.vivienda.habitacionSegura) {
    faseInmediata.push({ orden: paso++, accion: `Dirígete a la habitación segura: ${nucleo.vivienda.habitacionSegura}.` });
  } else {
    faseInmediata.push({ orden: paso++, accion: 'Busca una habitación interior sin ventanas o colócate bajo una mesa resistente.' });
  }

  faseInmediata.push({
    orden: paso++,
    accion: `Corta llaves de paso: gas${nucleo.vivienda.llavesPaso?.gas ? ` (${nucleo.vivienda.llavesPaso.gas})` : ''}, electricidad${nucleo.vivienda.llavesPaso?.electricidad ? ` (${nucleo.vivienda.llavesPaso.electricidad})` : ''}.`,
  });

  // Bebé
  if (nucleo.modulosAdicionales?.includes('bebe')) {
    faseInmediata.push({
      orden: paso++,
      accion: `Coge al bebé y colócalo en el portabebés${nucleo.moduloBebe?.portabebes ? ` (${nucleo.moduloBebe.portabebes})` : ''}. Mantén las manos libres.`,
    });
  }

  // Mayor con movilidad reducida
  if (nucleo.moduloMayores?.movilidad && !['autónomo', 'autonomo'].includes(nucleo.moduloMayores.movilidad.toLowerCase())) {
    faseInmediata.push({
      orden: paso++,
      accion: `Asiste a la persona mayor (movilidad: ${nucleo.moduloMayores.movilidad}). No intentes bajar escaleras hasta que sea seguro.`,
    });
  }

  faseInmediata.push({ orden: paso++, accion: 'Verifica que todos los miembros del núcleo están bien. Haz recuento.' });

  faseInmediata.push({
    orden: paso++,
    accion: `Envía mensaje al grupo: "Código ROJO — ${nucleo.id} en ${nucleo.vivienda.direccion}. Estado: [bien/heridos/atrapados]."`,
  });

  // Fase corta (4h)
  paso = 1;
  faseCorta.push({ orden: paso++, accion: 'Evalúa daños en la vivienda. Si la estructura está comprometida, prepara evacuación.' });
  faseCorta.push({ orden: paso++, accion: 'Llena bañera y recipientes con agua (puede cortarse el suministro).' });
  faseCorta.push({ orden: paso++, accion: 'Coge la mochila de emergencia. Tenla preparada por si hay que evacuar.' });

  const puntoEncuentro = inter.puntosEncuentro?.global;
  if (puntoEncuentro) {
    faseCorta.push({
      orden: paso++,
      accion: `Si evacúas, dirígete al punto de encuentro: ${puntoEncuentro.ubicacion}${puntoEncuentro.comoLlegar ? `. ${puntoEncuentro.comoLlegar}` : ''}.`,
    });
  }

  if (nucleo.transporte?.vehiculos?.length) {
    faseCorta.push({
      orden: paso++,
      accion: `Verifica el estado del vehículo${nucleo.vivienda.garaje ? ` en ${nucleo.vivienda.garaje}` : ''}. Llena el depósito si es posible.`,
    });
  }

  // Fase larga (72h)
  paso = 1;
  faseLarga.push({ orden: paso++, accion: 'Sigue instrucciones oficiales (radio, protección civil).' });
  faseLarga.push({ orden: paso++, accion: 'Raciona suministros. Coordina con otros núcleos para compartir recursos.' });

  const destEvac = inter.escenarios?.evacuacion?.destino;
  if (destEvac) {
    faseLarga.push({
      orden: paso++,
      accion: `Si se ordena evacuación de la zona, el destino del grupo es: ${destEvac}.`,
    });
  }

  if (nucleo.entorno?.hospitalCercano) {
    faseLarga.push({
      orden: paso++,
      accion: `Hospital más cercano: ${nucleo.entorno.hospitalCercano.nombre} (${nucleo.entorno.hospitalCercano.distancia}).`,
    });
  }

  return {
    escenario: 'catastrofe',
    titulo: '🌊 Catástrofe natural',
    descripcion: 'Protocolo para terremotos, inundaciones, tormentas severas u otros desastres naturales.',
    faseInmediata,
    faseCorta,
    faseLarga,
    contactosRelevantes: getContactosEscenario(nucleo, nucleos, inter),
  };
}

function generarProtocoloConflicto(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario {
  const faseInmediata: PasoProtocolo[] = [];
  const faseCorta: PasoProtocolo[] = [];
  const faseLarga: PasoProtocolo[] = [];
  let paso = 1;

  // Fase inmediata
  faseInmediata.push({ orden: paso++, accion: 'No salgas de casa. Aléjate de ventanas.' });

  if (nucleo.vivienda.habitacionSegura) {
    faseInmediata.push({ orden: paso++, accion: `Reúne a todos en la habitación segura: ${nucleo.vivienda.habitacionSegura}.` });
  }

  faseInmediata.push({ orden: paso++, accion: 'Llena bañera, cubos y botellas con agua.' });
  faseInmediata.push({ orden: paso++, accion: 'Reúne documentos, efectivo, medicación y mochila de emergencia.' });
  faseInmediata.push({
    orden: paso++,
    accion: `Contacta con el coordinador (${getNombreContacto(nucleos, inter.cadenaContacto.coordinadorPrincipal)}) para evaluar la situación.`,
  });

  // Fase corta
  paso = 1;
  const nucleoSeguro = inter.escenarios?.conflicto?.nucleoMasSeguro;
  if (nucleoSeguro && nucleoSeguro !== nucleo.id) {
    faseCorta.push({
      orden: paso++,
      accion: `El núcleo más seguro es ${getNombreContacto(nucleos, nucleoSeguro)}. Evalúa desplazarte allí si la situación empeora.`,
    });
  }

  faseCorta.push({ orden: paso++, accion: 'Mantén la radio encendida. Sigue instrucciones oficiales.' });
  faseCorta.push({ orden: paso++, accion: 'Raciona estrictamente agua y alimentos desde el primer momento.' });
  faseCorta.push({ orden: paso++, accion: 'Carga todos los dispositivos electrónicos. Minimiza uso de batería.' });

  if (nucleo.recursos?.propiedadSecundaria) {
    faseCorta.push({
      orden: paso++,
      accion: `Evalúa traslado a tu propiedad: ${nucleo.recursos.propiedadSecundaria.tipo} en ${nucleo.recursos.propiedadSecundaria.ubicacion}.`,
    });
  }

  // Fase larga
  paso = 1;
  faseLarga.push({ orden: paso++, accion: 'Establece rutinas. La normalidad ayuda especialmente a niños y mayores.' });
  faseLarga.push({ orden: paso++, accion: 'Coordina con otros núcleos para compartir información y recursos.' });
  faseLarga.push({ orden: paso++, accion: 'Si hay que evacuar la ciudad, sigue la secuencia de recogida del plan.' });

  if (inter.escenarios?.evacuacion?.secuenciaRecogida) {
    const seq = inter.escenarios.evacuacion.secuenciaRecogida;
    const miPosicion = seq.indexOf(nucleo.id);
    if (miPosicion !== -1) {
      faseLarga.push({
        orden: paso++,
        accion: `En la secuencia de evacuación, tu posición es la ${miPosicion + 1} de ${seq.length}. ${miPosicion > 0 ? `Te recoge ${getNombreContacto(nucleos, seq[miPosicion - 1])}.` : 'Tú inicias la secuencia.'}`,
      });
    }
  }

  return {
    escenario: 'conflicto',
    titulo: '⚔ Conflicto armado / Guerra',
    descripcion: 'Protocolo para situaciones de conflicto, disturbios graves o guerra.',
    faseInmediata,
    faseCorta,
    faseLarga,
    contactosRelevantes: getContactosEscenario(nucleo, nucleos, inter),
  };
}

function generarProtocoloPandemia(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario {
  const faseInmediata: PasoProtocolo[] = [];
  const faseCorta: PasoProtocolo[] = [];
  const faseLarga: PasoProtocolo[] = [];
  let paso = 1;

  // Fase inmediata
  faseInmediata.push({ orden: paso++, accion: 'Limita salidas al mínimo imprescindible.' });
  faseInmediata.push({ orden: paso++, accion: 'Haz acopio de medicación esencial para al menos 1 mes.' });
  faseInmediata.push({ orden: paso++, accion: 'Compra suministros básicos sin acaparar: comida, higiene, mascarillas.' });

  if (nucleo.moduloMayores) {
    faseInmediata.push({
      orden: paso++,
      accion: 'Las personas mayores del núcleo son grupo de riesgo. Extremar precauciones de aislamiento.',
    });
  }

  // Fase corta
  paso = 1;
  faseCorta.push({ orden: paso++, accion: 'Establece zona de descontaminación en la entrada (zapatos, ropa exterior).' });
  faseCorta.push({ orden: paso++, accion: 'Designa a una sola persona para hacer compras y salidas necesarias.' });

  const nucleoCuidaNinos = inter.escenarios?.pandemia?.nucleoCuidaNinos;
  if (nucleoCuidaNinos) {
    if (nucleo.id === nucleoCuidaNinos) {
      faseCorta.push({
        orden: paso++,
        accion: 'Tu núcleo está designado para cuidar niños si los padres de otros núcleos enferman.',
      });
    } else if (nucleo.modulosAdicionales?.includes('bebe')) {
      faseCorta.push({
        orden: paso++,
        accion: `Si ambos padres enfermáis, los niños irán con ${getNombreContacto(nucleos, nucleoCuidaNinos)}.`,
      });
    }
  }

  faseCorta.push({ orden: paso++, accion: 'Coordina compras con otros núcleos para reducir salidas.' });

  // Fase larga
  paso = 1;
  faseLarga.push({ orden: paso++, accion: 'Mantén rutinas diarias, especialmente para niños y adolescentes.' });
  faseLarga.push({ orden: paso++, accion: 'Haz videollamadas regulares con los otros núcleos para apoyo emocional.' });
  faseLarga.push({ orden: paso++, accion: 'Si un miembro enferma, aísla en una habitación y designa un solo cuidador.' });

  if (nucleo.entorno?.hospitalCercano) {
    faseLarga.push({
      orden: paso++,
      accion: `En caso de síntomas graves, hospital más cercano: ${nucleo.entorno.hospitalCercano.nombre} (${nucleo.entorno.hospitalCercano.distancia}). Llama antes de ir.`,
    });
  }

  return {
    escenario: 'pandemia',
    titulo: '🦠 Pandemia',
    descripcion: 'Protocolo para pandemias, epidemias o brotes sanitarios graves.',
    faseInmediata,
    faseCorta,
    faseLarga,
    contactosRelevantes: getContactosEscenario(nucleo, nucleos, inter),
  };
}

function generarProtocoloCrisisEconomica(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): ProtocoloEscenario {
  const faseInmediata: PasoProtocolo[] = [];
  const faseCorta: PasoProtocolo[] = [];
  const faseLarga: PasoProtocolo[] = [];
  let paso = 1;

  // Fase inmediata
  faseInmediata.push({ orden: paso++, accion: 'Retira efectivo del banco (cantidad razonable). Los cajeros pueden dejar de funcionar.' });

  if (nucleo.finanzas?.fondoEmergencia) {
    faseInmediata.push({
      orden: paso++,
      accion: `Tu fondo de emergencia actual: ${nucleo.finanzas.fondoEmergencia}. No lo toques excepto para necesidades básicas.`,
    });
  }

  faseInmediata.push({ orden: paso++, accion: 'Haz compra grande de productos no perecederos antes de posibles subidas de precio.' });

  // Fase corta
  paso = 1;
  faseCorta.push({ orden: paso++, accion: 'Revisa y reduce gastos no esenciales inmediatamente.' });
  faseCorta.push({ orden: paso++, accion: 'Contacta con seguros para confirmar coberturas vigentes.' });
  faseCorta.push({ orden: paso++, accion: 'Coordina con otros núcleos para compras conjuntas y compartir recursos.' });

  if (nucleo.recursos?.huertoAnimales) {
    faseCorta.push({
      orden: paso++,
      accion: `Intensifica la producción de tu huerto/animales: ${nucleo.recursos.huertoAnimales}.`,
    });
  }

  // Fase larga
  paso = 1;
  faseLarga.push({ orden: paso++, accion: 'Explora formas de generar ingresos adicionales con tus habilidades.' });

  if (nucleo.recursos?.conocimientosUtiles?.length) {
    faseLarga.push({
      orden: paso++,
      accion: `Tus conocimientos pueden ser valiosos: ${nucleo.recursos.conocimientosUtiles.join(', ')}. Considera intercambios con otros núcleos.`,
    });
  }

  faseLarga.push({ orden: paso++, accion: 'Prioriza siempre: vivienda > alimentación > medicación > transporte.' });
  faseLarga.push({ orden: paso++, accion: 'Mantén la red familiar unida. El apoyo mutuo es el recurso más valioso en crisis económica.' });

  return {
    escenario: 'crisis_economica',
    titulo: '💰 Crisis económica severa',
    descripcion: 'Protocolo para situaciones de crisis económica grave, corralito bancario o hiperinflación.',
    faseInmediata,
    faseCorta,
    faseLarga,
    contactosRelevantes: getContactosEscenario(nucleo, nucleos, inter),
  };
}

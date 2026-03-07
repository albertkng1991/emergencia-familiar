import { NucleoBase } from '../types/nucleo';
import { AnalisisNucleo, Vulnerabilidad, Fortaleza } from '../types/dossier';

export function analizarNucleo(nucleo: NucleoBase): AnalisisNucleo {
  const vulnerabilidades = detectarVulnerabilidades(nucleo);
  const fortalezas = detectarFortalezas(nucleo);
  const score = calcularScore(nucleo, vulnerabilidades, fortalezas);

  return {
    nucleoId: nucleo.id,
    vulnerabilidades,
    fortalezas,
    scorePreparacion: score,
    resumen: generarResumen(nucleo, score, vulnerabilidades, fortalezas),
  };
}

function detectarVulnerabilidades(n: NucleoBase): Vulnerabilidad[] {
  const v: Vulnerabilidad[] = [];

  // Sin vehículo
  if (!n.transporte?.vehiculos || n.transporte.vehiculos.length === 0) {
    v.push({
      tipo: 'transporte',
      descripcion: 'El núcleo no dispone de vehículo propio',
      severidad: 'alta',
      recomendacion: 'Coordinar con núcleos cercanos que tengan vehículo para evacuación',
    });
  }

  // Bebé lactante
  if (n.modulosAdicionales?.includes('bebe')) {
    v.push({
      tipo: 'dependiente',
      descripcion: 'Hay un bebé o niño pequeño en el núcleo',
      severidad: 'alta',
      recomendacion: 'Preparar mochila de emergencia específica para bebé con fórmula, pañales y medicación',
    });
    if (n.moduloBebe?.alimentacion?.toLowerCase().includes('lactancia')) {
      v.push({
        tipo: 'alimentacion',
        descripcion: 'Bebé con lactancia materna — la madre es imprescindible',
        severidad: 'alta',
        recomendacion: 'Tener fórmula de emergencia por si la madre no está disponible temporalmente',
      });
    }
  }

  // Persona mayor con aparatos eléctricos
  if (n.moduloMayores?.aparatosElectricosMedicos && n.moduloMayores.aparatosElectricosMedicos.length > 0) {
    for (const aparato of n.moduloMayores.aparatosElectricosMedicos) {
      v.push({
        tipo: 'medico',
        descripcion: `Persona mayor depende de ${aparato.aparato}`,
        severidad: 'alta',
        recomendacion: aparato.alternativa
          ? `Alternativa disponible: ${aparato.alternativa}`
          : 'Necesita acceso a generador o trasladar a núcleo con electricidad alternativa',
      });
    }
  }

  // Persona mayor con movilidad reducida
  if (n.moduloMayores?.movilidad && !['autónomo', 'autonomo'].includes(n.moduloMayores.movilidad.toLowerCase())) {
    v.push({
      tipo: 'movilidad',
      descripcion: `Persona mayor con movilidad: ${n.moduloMayores.movilidad}`,
      severidad: 'media',
      recomendacion: 'Planificar evacuación con ayuda adicional y más tiempo',
    });
  }

  // Planta alta sin ascensor
  if (n.vivienda.planta && n.vivienda.planta > 2 && n.vivienda.ascensor === false) {
    v.push({
      tipo: 'vivienda',
      descripcion: `Vivienda en planta ${n.vivienda.planta} sin ascensor`,
      severidad: 'media',
      recomendacion: 'Tener plan de evacuación que considere bajar escaleras con cargas',
    });
  }

  // Sin botiquín
  if (!n.suministros?.botiquin || n.suministros.botiquin === 'no' || n.suministros.botiquin === '') {
    v.push({
      tipo: 'suministros',
      descripcion: 'No dispone de botiquín de emergencia',
      severidad: 'media',
      recomendacion: 'Adquirir un botiquín básico de emergencia',
    });
  }

  // Sin agua almacenada
  if (!n.suministros?.aguaAlmacenada || n.suministros.aguaAlmacenada === '') {
    v.push({
      tipo: 'suministros',
      descripcion: 'No tiene agua almacenada para emergencias',
      severidad: 'alta',
      recomendacion: 'Almacenar mínimo 3L por persona por día para al menos 3 días',
    });
  }

  // Sin comida no perecedera
  if (!n.suministros?.comidaNoPerecedera || n.suministros.comidaNoPerecedera === '') {
    v.push({
      tipo: 'suministros',
      descripcion: 'No tiene reserva de comida no perecedera',
      severidad: 'media',
      recomendacion: 'Almacenar comida no perecedera para al menos 3 días',
    });
  }

  // Miembros con alergias graves
  for (const m of n.miembros) {
    if (m.alergias && m.alergias.toLowerCase().includes('anafilax')) {
      v.push({
        tipo: 'medico',
        descripcion: `${m.nombre} tiene riesgo de anafilaxia`,
        severidad: 'alta',
        recomendacion: 'Incluir autoinyector de adrenalina en el kit de emergencia',
      });
    }
    if (m.medicacionFija && m.medicacionFija !== '') {
      v.push({
        tipo: 'medico',
        descripcion: `${m.nombre} requiere medicación fija: ${m.medicacionFija}`,
        severidad: 'media',
        recomendacion: 'Mantener reserva de al menos 2 semanas de medicación',
      });
    }
  }

  // Mascotas
  if (n.preferencias?.mascotas && n.preferencias.mascotas.length > 0) {
    v.push({
      tipo: 'mascotas',
      descripcion: `Tiene ${n.preferencias.mascotas.length} mascota(s) que considerar en evacuación`,
      severidad: 'baja',
      recomendacion: 'Preparar kit de emergencia para mascotas (comida, transportín, documentación)',
    });
  }

  return v;
}

function detectarFortalezas(n: NucleoBase): Fortaleza[] {
  const f: Fortaleza[] = [];

  // Conocimientos útiles
  if (n.recursos?.conocimientosUtiles && n.recursos.conocimientosUtiles.length > 0) {
    for (const c of n.recursos.conocimientosUtiles) {
      f.push({ tipo: 'conocimiento', descripcion: `Conocimiento en: ${c}` });
    }
  }

  // Vehículo grande o todoterreno
  if (n.transporte?.vehiculos) {
    for (const v of n.transporte.vehiculos) {
      if (v.plazas >= 7) f.push({ tipo: 'transporte', descripcion: `Vehículo grande: ${v.modelo || v.tipo} (${v.plazas} plazas)` });
      if (v.todoterreno) f.push({ tipo: 'transporte', descripcion: `Vehículo todoterreno: ${v.modelo || v.tipo}` });
    }
  }

  // Herramientas
  if (n.recursos?.herramientas && n.recursos.herramientas.length > 0) {
    f.push({ tipo: 'herramientas', descripcion: `Dispone de herramientas: ${n.recursos.herramientas.join(', ')}` });
  }

  // Propiedad secundaria
  if (n.recursos?.propiedadSecundaria) {
    f.push({
      tipo: 'refugio',
      descripcion: `Propiedad secundaria: ${n.recursos.propiedadSecundaria.tipo} en ${n.recursos.propiedadSecundaria.ubicacion}`,
    });
  }

  // Huerto/animales
  if (n.recursos?.huertoAnimales && n.recursos.huertoAnimales !== '') {
    f.push({ tipo: 'autosuficiencia', descripcion: `Huerto/animales: ${n.recursos.huertoAnimales}` });
  }

  // Espacio exterior
  if (n.vivienda?.espacioExterior && n.vivienda.espacioExterior !== '') {
    f.push({ tipo: 'vivienda', descripcion: `Espacio exterior: ${n.vivienda.espacioExterior}` });
  }

  // Habitación segura
  if (n.vivienda?.habitacionSegura && n.vivienda.habitacionSegura !== '') {
    f.push({ tipo: 'vivienda', descripcion: `Habitación segura: ${n.vivienda.habitacionSegura}` });
  }

  // Walkie-talkies o radio
  if (n.comunicaciones?.walkieTalkies) {
    f.push({ tipo: 'comunicaciones', descripcion: 'Dispone de walkie-talkies' });
  }
  if (n.comunicaciones?.radioEmergencia) {
    f.push({ tipo: 'comunicaciones', descripcion: 'Dispone de radio de emergencia' });
  }

  // Fondo de emergencia
  if (n.finanzas?.fondoEmergencia && ['3 meses', '6+ meses', '6 meses'].includes(n.finanzas.fondoEmergencia)) {
    f.push({ tipo: 'finanzas', descripcion: `Fondo de emergencia para ${n.finanzas.fondoEmergencia}` });
  }

  // Cocina alternativa
  if (n.suministros?.cocinaAlternativa && n.suministros.cocinaAlternativa !== '') {
    f.push({ tipo: 'suministros', descripcion: `Cocina alternativa: ${n.suministros.cocinaAlternativa}` });
  }

  return f;
}

function calcularScore(n: NucleoBase, vulns: Vulnerabilidad[], forts: Fortaleza[]): number {
  let score = 50; // Base

  // Suministros
  if (n.suministros?.aguaAlmacenada && n.suministros.aguaAlmacenada !== '') score += 5;
  if (n.suministros?.comidaNoPerecedera && n.suministros.comidaNoPerecedera !== '') score += 5;
  if (n.suministros?.botiquin === 'completo') score += 5;
  else if (n.suministros?.botiquin === 'básico') score += 2;
  if (n.suministros?.iluminacion && n.suministros.iluminacion !== '') score += 3;
  if (n.suministros?.cocinaAlternativa && n.suministros.cocinaAlternativa !== '') score += 3;
  if (n.suministros?.copiasDocumentos && n.suministros.copiasDocumentos !== '') score += 2;

  // Transporte
  if (n.transporte?.vehiculos && n.transporte.vehiculos.length > 0) score += 5;

  // Comunicaciones
  if (n.comunicaciones?.walkieTalkies) score += 3;
  if (n.comunicaciones?.radioEmergencia) score += 3;
  if (n.comunicaciones?.powerbanks && n.comunicaciones.powerbanks !== '') score += 2;

  // Fortalezas adicionales
  score += Math.min(forts.length * 2, 10);

  // Penalizar vulnerabilidades
  for (const v of vulns) {
    if (v.severidad === 'alta') score -= 5;
    else if (v.severidad === 'media') score -= 3;
    else score -= 1;
  }

  return Math.max(0, Math.min(100, score));
}

function generarResumen(n: NucleoBase, score: number, vulns: Vulnerabilidad[], forts: Fortaleza[]): string {
  const nivel = score >= 75 ? 'bueno' : score >= 50 ? 'moderado' : 'bajo';
  const vulnsAltas = vulns.filter(v => v.severidad === 'alta').length;
  const numPersonas = n.miembros.length;

  let resumen = `Núcleo ${n.id} (${n.nombre}): ${numPersonas} miembros. Nivel de preparación: ${nivel} (${score}/100).`;

  if (vulnsAltas > 0) {
    resumen += ` Tiene ${vulnsAltas} vulnerabilidad(es) de alta severidad que requieren atención.`;
  }

  if (forts.length > 0) {
    resumen += ` Aporta ${forts.length} fortaleza(s) al sistema familiar.`;
  }

  return resumen;
}

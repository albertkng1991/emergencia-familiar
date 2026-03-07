import { Packer } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { DossierNucleo } from '../types/dossier';
import { analizarNucleo } from '../engine/analyzer';
import { asignarRoles } from '../engine/roles';
import { generarProtocolos } from '../engine/scenarios';
import { generarCadenaContacto } from '../engine/contacts';
import { calcularSuministros } from '../engine/supplies';
import { generarMochilasEmergencia } from '../engine/bugout-bag';
import { generarProtocoloReunificacion } from '../engine/reunification';
import { generarCalendarioRotacion } from '../engine/rotation';
import { generarPlanEvacuacion } from '../engine/evacuation-routes';
import { generarProtocoloComunicaciones } from '../engine/degraded-comms';
import { generarPlanAgua } from '../engine/water-plan';
import { generarRedVecinos } from '../engine/neighbors';
import { generarPautasEmocionales } from '../engine/emotional';
import { generarInfoDigital } from '../engine/digital-backup';
import {
  crearDocumento,
  crearPortada,
  crearTitulo,
  crearParrafo,
  crearAlerta,
  crearTabla,
  crearListaNumerada,
  crearChecklist,
  crearSeparador,
  DocChild,
} from './docx-helpers';

export function construirDossier(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones
): DossierNucleo {
  const analisis = analizarNucleo(nucleo);
  const roles = asignarRoles(nucleos, inter);
  const protocolos = generarProtocolos(nucleo, nucleos, inter);
  const cadenaContacto = generarCadenaContacto(nucleo.id, nucleos, inter);
  const suministros = calcularSuministros(nucleo);

  const todosLosNucleos = nucleos.map(n => {
    const rol = roles.find(r => r.nucleoId === n.id);
    return {
      id: n.id,
      nombre: n.nombre,
      contacto: n.comunicaciones?.moviles?.[0]?.numero || 'sin teléfono',
      rol: rol?.rolPrincipal || 'Apoyo general',
    };
  });

  return {
    nucleoId: nucleo.id,
    nombreNucleo: nucleo.nombre,
    fechaGeneracion: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    analisis,
    roles,
    todosLosNucleos,
    cadenaContacto,
    protocolos,
    suministros,
    puntosEncuentro: {
      global: inter.puntosEncuentro.global,
      alternativo: inter.puntosEncuentro.alternativo,
      subfamiliar: inter.puntosEncuentro.subfamiliar?.map(s => ({
        nucleos: s.nucleosImplicados,
        ubicacion: s.ubicacion,
      })),
    },
    checklistDocumentos: [
      'DNI/Pasaporte de todos los miembros',
      'Libro de familia',
      'Tarjetas sanitarias',
      'Escritura de la vivienda / contrato de alquiler',
      'Documentación del vehículo',
      'Recetas médicas actualizadas',
      'Contactos de emergencia impresos',
      'Documentación de mascotas (cartilla veterinaria)',
    ],
    mochilas: generarMochilasEmergencia(nucleo),
    reunificacion: generarProtocoloReunificacion(nucleo, inter),
    planEvacuacion: generarPlanEvacuacion(nucleo, nucleos, inter),
    comunicacionesDegradadas: generarProtocoloComunicaciones(nucleo, nucleos, inter),
    calendarioRotacion: generarCalendarioRotacion(nucleo),
    planAgua: generarPlanAgua(nucleo),
    redVecinos: generarRedVecinos(nucleo),
    pautasEmocionales: generarPautasEmocionales(nucleo),
    infoDigital: generarInfoDigital(nucleo),
  };
}

export async function generarDossierDocx(
  dossier: DossierNucleo,
  nucleo: NucleoBase,
  outputDir: string
): Promise<string> {
  const secciones: DocChild[] = [];

  // 1. PORTADA
  secciones.push(
    ...crearPortada(
      'Plan de Emergencia Familiar',
      `Núcleo ${dossier.nucleoId}: ${dossier.nombreNucleo}`,
      dossier.fechaGeneracion,
      'DOCUMENTO CONFIDENCIAL — Contiene datos personales sensibles. No distribuir fuera del sistema familiar.'
    )
  );

  secciones.push(crearSeparador());

  // 2. DATOS DEL NÚCLEO
  secciones.push(crearTitulo('1. Datos del Núcleo', 1));
  secciones.push(crearParrafo(`Dirección: ${nucleo.vivienda.direccion}`));
  secciones.push(crearParrafo(`Tipo de vivienda: ${nucleo.vivienda.tipo}`));

  if (nucleo.vivienda.planta) {
    secciones.push(crearParrafo(`Planta: ${nucleo.vivienda.planta}${nucleo.vivienda.ascensor ? ' (con ascensor)' : ' (sin ascensor)'}`));
  }

  secciones.push(crearTitulo('Miembros', 2));
  const miembrosFilas = nucleo.miembros.map(m => [
    m.nombre,
    `${m.edad} años`,
    m.parentesco,
    m.telefono || '—',
    m.grupoSanguineo || '—',
    m.alergias || 'Ninguna',
    m.medicacionFija || 'Ninguna',
  ]);
  secciones.push(
    crearTabla(
      ['Nombre', 'Edad', 'Parentesco', 'Teléfono', 'Grupo', 'Alergias', 'Medicación'],
      miembrosFilas
    )
  );

  // 3. RED FAMILIAR
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('2. Red Familiar', 1));
  secciones.push(crearParrafo('Estos son todos los núcleos del sistema familiar y su rol asignado:'));

  const redFilas = dossier.todosLosNucleos.map(n => [
    n.id,
    n.nombre,
    n.contacto,
    n.rol,
    n.id === dossier.nucleoId ? '← TÚ' : '',
  ]);
  secciones.push(crearTabla(['ID', 'Núcleo', 'Contacto', 'Rol', ''], redFilas));

  // Mi rol
  const miRol = dossier.roles.find(r => r.nucleoId === dossier.nucleoId);
  if (miRol) {
    secciones.push(crearAlerta(`Tu rol principal: ${miRol.rolPrincipal}`, 'info'));
    secciones.push(crearParrafo(miRol.descripcionRol));
    if (miRol.rolesSecundarios.length > 0) {
      secciones.push(crearParrafo(`Roles secundarios: ${miRol.rolesSecundarios.join(', ')}`, { italic: true }));
    }
  }

  // 4. PUNTOS DE ENCUENTRO
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('3. Puntos de Encuentro', 1));

  secciones.push(crearAlerta(`Punto PRINCIPAL: ${dossier.puntosEncuentro.global.ubicacion}`, 'aviso'));
  if (dossier.puntosEncuentro.global.comoLlegar) {
    secciones.push(crearParrafo(`Cómo llegar: ${dossier.puntosEncuentro.global.comoLlegar}`));
  }

  if (dossier.puntosEncuentro.alternativo) {
    secciones.push(crearParrafo(`Punto ALTERNATIVO: ${dossier.puntosEncuentro.alternativo.ubicacion}`, { bold: true }));
  }

  if (dossier.puntosEncuentro.subfamiliar) {
    secciones.push(crearTitulo('Puntos subfamiliares', 3));
    for (const sub of dossier.puntosEncuentro.subfamiliar) {
      if (sub.nucleos.includes(dossier.nucleoId)) {
        secciones.push(crearParrafo(`Núcleos ${sub.nucleos.join(', ')}: ${sub.ubicacion}`, { bold: true }));
      }
    }
  }

  // 5. PLAN DE COMUNICACIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('4. Plan de Comunicación', 1));

  secciones.push(crearTitulo('Cadena de contacto', 2));
  const contactoFilas = dossier.cadenaContacto.contactosPriorizados.map(c => [
    `${c.prioridad}`,
    c.nombre,
    c.telefono,
    c.rol || '',
  ]);
  secciones.push(crearTabla(['Prioridad', 'Contacto', 'Teléfono', 'Rol'], contactoFilas));

  if (dossier.cadenaContacto.contactoEnlaceExterno) {
    const ext = dossier.cadenaContacto.contactoEnlaceExterno;
    secciones.push(crearAlerta(`Contacto enlace externo: ${ext.nombre} — ☎ ${ext.telefono}`, 'info'));
  }

  secciones.push(crearTitulo('Códigos y señales', 2));
  secciones.push(crearAlerta(`Código de activación: "${dossier.cadenaContacto.codigoActivacion}"`, 'peligro'));
  secciones.push(...crearListaNumerada(dossier.cadenaContacto.senales));

  // 6. KIT DE EMERGENCIA
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('5. Kit de Emergencia', 1));
  secciones.push(crearParrafo('Lista personalizada de suministros para tu núcleo. Los items marcados ☑ los tienes actualmente.'));

  // Agrupar por categoría
  const categorias = new Map<string, typeof dossier.suministros.items>();
  for (const item of [...dossier.suministros.items, ...dossier.suministros.itemsEspecificos]) {
    const cat = item.categoria;
    if (!categorias.has(cat)) categorias.set(cat, []);
    categorias.get(cat)!.push(item);
  }

  for (const [cat, items] of categorias) {
    secciones.push(crearTitulo(cat, 3));
    const filas = items.map(item => [
      item.tieneActualmente ? '☑' : '☐',
      item.item,
      item.cantidad72h,
      item.cantidad2semanas,
      item.notas || '',
    ]);
    secciones.push(crearTabla(['', 'Item', '72 horas', '2 semanas', 'Notas'], filas));
  }

  if (dossier.suministros.resumenFaltantes.length > 0) {
    secciones.push(crearAlerta(`Te faltan ${dossier.suministros.resumenFaltantes.length} items. Revisa la lista y adquiérelos progresivamente.`, 'aviso'));
  }

  // 6b. MOCHILAS DE EMERGENCIA
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('6. Mochilas de Emergencia', 1));
  secciones.push(crearParrafo('Cada miembro tiene su mochila personalizada. Prepáralas y tenlas siempre listas junto a la puerta.'));

  for (const mochila of dossier.mochilas) {
    secciones.push(crearTitulo(`${mochila.persona} (${mochila.perfil})`, 2));
    const mochilaFilas = mochila.items.map(item => [
      item.esencial ? '⚠' : '○',
      item.item,
      item.cantidad,
      item.notas || '',
    ]);
    secciones.push(crearTabla(['', 'Item', 'Cantidad', 'Notas'], mochilaFilas));
  }

  // 7. PROTOCOLOS POR ESCENARIO
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('7. Protocolos por Escenario', 1));

  for (const protocolo of dossier.protocolos) {
    secciones.push(crearTitulo(protocolo.titulo, 2));
    secciones.push(crearParrafo(protocolo.descripcion, { italic: true }));

    secciones.push(crearTitulo('Fase inmediata (primeros 30 minutos)', 3));
    secciones.push(...crearListaNumerada(protocolo.faseInmediata.map(p => p.accion), { color: 'CC0000' }));

    secciones.push(crearTitulo('Fase corta (primeras 4 horas)', 3));
    secciones.push(...crearListaNumerada(protocolo.faseCorta.map(p => p.accion), { color: '996600' }));

    secciones.push(crearTitulo('Fase larga (primeras 72 horas)', 3));
    secciones.push(...crearListaNumerada(protocolo.faseLarga.map(p => p.accion)));
  }

  // 8. TU ROL EN EL PLAN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('8. Tu Rol en el Plan', 1));

  if (miRol) {
    secciones.push(crearAlerta(`Rol principal: ${miRol.rolPrincipal}`, 'info'));
    secciones.push(crearParrafo(miRol.descripcionRol));
    secciones.push(crearParrafo(`Recurso que aportas: ${miRol.recursoQueAporta}`, { bold: true }));
  }

  // Score de preparación
  const analisis = dossier.analisis;
  const scoreColor = analisis.scorePreparacion >= 75 ? '006633' : analisis.scorePreparacion >= 50 ? '996600' : 'CC0000';
  secciones.push(crearParrafo(`Nivel de preparación: ${analisis.scorePreparacion}/100`, { bold: true, color: scoreColor, size: 24 }));

  if (analisis.vulnerabilidades.length > 0) {
    secciones.push(crearTitulo('Vulnerabilidades detectadas', 3));
    for (const v of analisis.vulnerabilidades) {
      const tipo = v.severidad === 'alta' ? 'peligro' : v.severidad === 'media' ? 'aviso' : 'info';
      secciones.push(crearAlerta(`${v.descripcion} — ${v.recomendacion}`, tipo));
    }
  }

  if (analisis.fortalezas.length > 0) {
    secciones.push(crearTitulo('Fortalezas', 3));
    for (const f of analisis.fortalezas) {
      secciones.push(crearAlerta(f.descripcion, 'exito'));
    }
  }

  // 9. PLAN DE EVACUACIÓN DETALLADO
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('9. Plan de Evacuación', 1));

  secciones.push(crearParrafo(`Destino de evacuación: ${dossier.puntosEncuentro.global.ubicacion}`, { bold: true }));

  if (dossier.planEvacuacion.rutasDesdeHogar.length > 0) {
    secciones.push(crearTitulo('Rutas desde tu hogar', 2));
    for (const ruta of dossier.planEvacuacion.rutasDesdeHogar) {
      secciones.push(crearTitulo(`${ruta.nombre} → ${ruta.destino}`, 3));
      secciones.push(crearParrafo(ruta.descripcion));
      secciones.push(crearParrafo(`Tiempo estimado: ${ruta.tiempoEstimado}`, { italic: true }));
      if (ruta.notas) secciones.push(crearParrafo(ruta.notas, { italic: true }));
    }
  }

  if (dossier.planEvacuacion.secuenciaRecogida) {
    secciones.push(crearTitulo('Secuencia de recogida', 2));
    const seqFilas = dossier.planEvacuacion.secuenciaRecogida.map(s => [
      `${s.orden}`,
      s.nucleo,
      s.nombre,
      s.direccion,
      s.telefono,
    ]);
    secciones.push(crearTabla(['Orden', 'ID', 'Núcleo', 'Dirección', 'Teléfono'], seqFilas));
  }

  secciones.push(crearTitulo('Antes de irte', 2));
  secciones.push(...crearListaNumerada(dossier.planEvacuacion.antesDeIrte));

  secciones.push(crearTitulo('Qué llevar', 2));
  secciones.push(...crearListaNumerada(dossier.planEvacuacion.queLlevar));

  if (dossier.planEvacuacion.instruccionesEspeciales.length > 0) {
    secciones.push(crearTitulo('Instrucciones especiales', 2));
    for (const instr of dossier.planEvacuacion.instruccionesEspeciales) {
      secciones.push(crearAlerta(instr, 'aviso'));
    }
  }

  if (nucleo.transporte?.vehiculos?.length) {
    secciones.push(crearTitulo('Vehículos disponibles', 3));
    const vFilas = nucleo.transporte.vehiculos.map(v => [
      v.tipo,
      v.modelo || '—',
      `${v.plazas}`,
      v.ubicacion || '—',
      v.todoterreno ? 'Sí' : 'No',
    ]);
    secciones.push(crearTabla(['Tipo', 'Modelo', 'Plazas', 'Ubicación', '4x4'], vFilas));
  }

  if (nucleo.transporte?.conductores?.length) {
    secciones.push(crearParrafo(`Conductores: ${nucleo.transporte.conductores.join(', ')}`));
  }

  // 10. PROTOCOLO DE REUNIFICACIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('10. Protocolo de Reunificación', 1));
  secciones.push(crearParrafo('Si la emergencia os pilla separados (trabajo, colegio, etc.), seguid este protocolo:'));

  secciones.push(crearTitulo('¿Dónde está cada miembro habitualmente?', 2));
  const ubicFilas = dossier.reunificacion.ubicacionesMiembros.map(u => [
    u.miembro,
    u.lugarTrabajo || u.lugarEstudios || 'En casa',
    u.horarioHabitual || '—',
    u.instruccion,
  ]);
  secciones.push(crearTabla(['Miembro', 'Ubicación habitual', 'Horario', 'Instrucción'], ubicFilas));

  if (dossier.reunificacion.instruccionesNinos.length > 0) {
    secciones.push(crearTitulo('Recogida de menores', 2));
    for (const instr of dossier.reunificacion.instruccionesNinos) {
      secciones.push(crearAlerta(instr, 'aviso'));
    }
  }

  secciones.push(crearTitulo('Instrucciones generales', 2));
  secciones.push(...crearListaNumerada(dossier.reunificacion.instruccionesGenerales));

  secciones.push(crearTitulo('Plan B: si no puedes llegar a casa', 2));
  secciones.push(...crearListaNumerada(dossier.reunificacion.planBSiNoPuedesLlegarACasa));

  // 11. COMUNICACIONES DEGRADADAS
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('11. Comunicaciones cuando falla todo', 1));
  secciones.push(crearParrafo('Si un canal falla, baja al siguiente nivel. No te saltes niveles.'));

  const commsFilas = dossier.comunicacionesDegradadas.niveles.map(n => [
    `${n.nivel}`,
    n.nombre,
    n.canal,
    n.disponible ? '✓ SÍ' : '✗ NO',
  ]);
  secciones.push(crearTabla(['Nivel', 'Canal', 'Detalle', '¿Lo tienes?'], commsFilas));

  for (const nivel of dossier.comunicacionesDegradadas.niveles) {
    if (nivel.instrucciones.length > 0) {
      secciones.push(crearTitulo(`Nivel ${nivel.nivel}: ${nivel.nombre}`, 3));
      secciones.push(...crearListaNumerada(nivel.instrucciones));
    }
  }

  if (dossier.comunicacionesDegradadas.ventanasEscucha) {
    secciones.push(crearTitulo('Ventanas de escucha (walkie-talkies)', 2));
    const ventFilas = dossier.comunicacionesDegradadas.ventanasEscucha.map(v => [
      v.hora,
      v.duracion,
      v.canal,
      v.protocolo,
    ]);
    secciones.push(crearTabla(['Hora', 'Duración', 'Canal', 'Protocolo'], ventFilas));
  }

  secciones.push(crearTitulo('Señales físicas', 2));
  secciones.push(...crearListaNumerada(dossier.comunicacionesDegradadas.senalesFisicas));

  // 12. PLAN DE AGUA
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('12. Plan de Agua', 1));
  secciones.push(crearParrafo(`Consumo diario necesario: ${dossier.planAgua.consumoDiario}`));
  secciones.push(crearParrafo(`Reserva actual: ${dossier.planAgua.reservaActual}`));
  secciones.push(crearAlerta(`Autonomía estimada: ${dossier.planAgua.diasAutonomia}`, 'info'));

  secciones.push(crearTitulo('Fases de racionamiento', 2));
  const racionFilas = dossier.planAgua.fasesRacionamiento.map(f => [
    f.fase,
    f.litrosPorPersonaDia,
    f.uso,
    f.duracion,
  ]);
  secciones.push(crearTabla(['Fase', 'L/persona/día', 'Uso', 'Cuándo'], racionFilas));

  secciones.push(crearTitulo('Fuentes alternativas de agua', 2));
  secciones.push(...crearListaNumerada(dossier.planAgua.fuentesAlternativas));

  secciones.push(crearTitulo('Métodos de potabilización', 2));
  secciones.push(...crearListaNumerada(dossier.planAgua.metodosPotabilizacion));

  secciones.push(crearTitulo('Consejos', 2));
  secciones.push(...crearListaNumerada(dossier.planAgua.consejos));

  // 13. RED DE VECINOS
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('13. Red de Vecinos', 1));
  for (const instr of dossier.redVecinos.instrucciones) {
    secciones.push(crearParrafo(instr));
  }
  secciones.push(crearTitulo('Protocolo vecinal', 2));
  secciones.push(...crearListaNumerada(dossier.redVecinos.protocoloVecinal));

  // 14. PAUTAS EMOCIONALES
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('14. Gestión Emocional en Emergencias', 1));

  secciones.push(crearTitulo('Pautas generales', 2));
  secciones.push(...crearListaNumerada(dossier.pautasEmocionales.pautasGenerales));

  if (dossier.pautasEmocionales.pautasNinos) {
    secciones.push(crearTitulo('Con niños pequeños', 2));
    secciones.push(...crearListaNumerada(dossier.pautasEmocionales.pautasNinos));
  }
  if (dossier.pautasEmocionales.pautasMayores) {
    secciones.push(crearTitulo('Con personas mayores', 2));
    secciones.push(...crearListaNumerada(dossier.pautasEmocionales.pautasMayores));
  }
  if (dossier.pautasEmocionales.pautasAdolescentes) {
    secciones.push(crearTitulo('Con adolescentes', 2));
    secciones.push(...crearListaNumerada(dossier.pautasEmocionales.pautasAdolescentes));
  }

  secciones.push(crearTitulo('Señales de alerta psicológica', 2));
  for (const senal of dossier.pautasEmocionales.senalesAlerta) {
    secciones.push(crearAlerta(senal, 'peligro'));
  }

  // 15. DOCUMENTACIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('15. Documentación a Preparar', 1));
  secciones.push(crearParrafo('Asegúrate de tener copias (física + digital) de los siguientes documentos:'));
  secciones.push(
    ...crearChecklist(
      dossier.checklistDocumentos.map(doc => ({ texto: doc, marcado: false }))
    )
  );

  // 16. ROTACIÓN DE SUMINISTROS
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('16. Rotación y Caducidad de Suministros', 1));
  secciones.push(crearParrafo('Calendario de revisión de tus suministros de emergencia:'));

  const rotFilas = dossier.calendarioRotacion.items.map(item => [
    item.item,
    item.categoria,
    item.vidaUtil,
    item.frecuenciaRevision,
    item.consejo,
  ]);
  secciones.push(crearTabla(['Item', 'Categoría', 'Vida útil', 'Revisión', 'Consejo'], rotFilas));

  secciones.push(crearTitulo('Recordatorios semestrales', 2));
  secciones.push(...crearChecklist(dossier.calendarioRotacion.recordatoriosSemestrales.map(r => ({ texto: r, marcado: false }))));

  secciones.push(crearTitulo('Instrucciones de rotación', 2));
  secciones.push(...crearListaNumerada(dossier.calendarioRotacion.instrucciones));

  // 17. COPIA DIGITAL
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('17. Copia Digital del Plan', 1));
  secciones.push(crearAlerta(`Código de identificación: ${dossier.infoDigital.codigoIdentificacion}`, 'info'));
  for (const instr of dossier.infoDigital.instrucciones) {
    secciones.push(crearParrafo(instr));
  }

  // 18. CALENDARIO DE REVISIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('18. Calendario de Revisión', 1));
  secciones.push(crearParrafo('Este plan debe revisarse cada 6 meses o cuando haya cambios significativos en el núcleo.'));
  secciones.push(
    crearTabla(
      ['Fecha', 'Revisado por', 'Cambios realizados', 'Firma'],
      [
        ['___/___/______', '', '', ''],
        ['___/___/______', '', '', ''],
        ['___/___/______', '', '', ''],
        ['___/___/______', '', '', ''],
      ]
    )
  );

  // Generar documento
  const doc = crearDocumento(`${dossier.nucleoId} — ${dossier.nombreNucleo}`, secciones);

  // Guardar
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${dossier.nucleoId}_dossier.docx`);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

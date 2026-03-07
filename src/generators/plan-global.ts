import { Packer } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { PlanGlobal } from '../types/dossier';
import { analizarNucleo } from '../engine/analyzer';
import { asignarRoles } from '../engine/roles';
import {
  crearDocumento,
  crearPortada,
  crearTitulo,
  crearParrafo,
  crearAlerta,
  crearTabla,
  crearListaNumerada,
  crearSeparador,
  DocChild,
} from './docx-helpers';

export function construirPlanGlobal(nucleos: NucleoBase[], inter: Interconexiones): PlanGlobal {
  const roles = asignarRoles(nucleos, inter);
  const analisis = nucleos.map(n => analizarNucleo(n));

  const vulnerabilidadesGlobales = analisis.map(a => ({
    nucleo: a.nucleoId,
    vulnerabilidades: a.vulnerabilidades,
  }));

  const recursosDisponibles = nucleos.map(n => {
    const recursos: string[] = [];
    if (n.recursos?.conocimientosUtiles) recursos.push(...n.recursos.conocimientosUtiles);
    if (n.transporte?.vehiculos) {
      for (const v of n.transporte.vehiculos) {
        recursos.push(`${v.tipo}${v.modelo ? ` (${v.modelo})` : ''} — ${v.plazas} plazas`);
      }
    }
    if (n.recursos?.propiedadSecundaria) {
      recursos.push(`Propiedad: ${n.recursos.propiedadSecundaria.tipo} en ${n.recursos.propiedadSecundaria.ubicacion}`);
    }
    if (n.recursos?.huertoAnimales) recursos.push(`Huerto/animales: ${n.recursos.huertoAnimales}`);
    if (n.comunicaciones?.walkieTalkies) recursos.push('Walkie-talkies');
    if (n.comunicaciones?.radioEmergencia) recursos.push('Radio emergencia');
    return { nucleo: n.id, recursos };
  });

  const protocoloActivacion = [
    '1. Detectar la emergencia y evaluar su severidad.',
    '2. El coordinador principal envía el código correspondiente al grupo.',
    '3. Cada núcleo confirma recepción con: "[ID] recibido, estado [VERDE/AMARILLO/ROJO]".',
    '4. Si no hay respuesta en 15 minutos, el coordinador llama directamente.',
    '5. Si el coordinador principal no responde, el suplente asume el mando.',
    '6. Activar el protocolo del escenario correspondiente.',
    '7. Mantener comunicación cada 2 horas hasta resolución.',
  ];

  return {
    fechaGeneracion: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    totalNucleos: nucleos.length,
    totalPersonas: nucleos.reduce((sum, n) => sum + n.miembros.length, 0),
    mapaRoles: roles,
    vulnerabilidadesGlobales,
    recursosDisponibles,
    protocoloActivacion,
    resumenScores: analisis.map(a => ({
      nucleo: a.nucleoId,
      nombre: nucleos.find(n => n.id === a.nucleoId)?.nombre || '',
      score: a.scorePreparacion,
    })),
  };
}

export async function generarPlanGlobalDocx(
  plan: PlanGlobal,
  nucleos: NucleoBase[],
  inter: Interconexiones,
  outputDir: string
): Promise<string> {
  const secciones: DocChild[] = [];

  // Portada
  secciones.push(
    ...crearPortada(
      'Plan Global de Emergencia Familiar',
      'Documento del Coordinador',
      plan.fechaGeneracion,
      'SOLO PARA EL COORDINADOR — Contiene la vista completa del sistema.'
    )
  );

  secciones.push(crearSeparador());

  // Vista de pájaro
  secciones.push(crearTitulo('1. Vista General del Sistema', 1));
  secciones.push(crearParrafo(`Total de núcleos familiares: ${plan.totalNucleos}`));
  secciones.push(crearParrafo(`Total de personas cubiertas: ${plan.totalPersonas}`));
  secciones.push(crearParrafo(`Coordinador principal: ${inter.cadenaContacto.coordinadorPrincipal}`));
  secciones.push(crearParrafo(`Coordinador suplente: ${inter.cadenaContacto.coordinadorSuplente}`));

  // Scores
  secciones.push(crearTitulo('Nivel de preparación por núcleo', 2));
  const scoreFilas = plan.resumenScores
    .sort((a, b) => b.score - a.score)
    .map(s => {
      const nivel = s.score >= 75 ? '🟢 Bueno' : s.score >= 50 ? '🟡 Moderado' : '🔴 Bajo';
      return [s.nucleo, s.nombre, `${s.score}/100`, nivel];
    });
  secciones.push(crearTabla(['ID', 'Núcleo', 'Score', 'Nivel'], scoreFilas));

  // Mapa de roles
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('2. Mapa de Roles', 1));
  const rolesFilas = plan.mapaRoles.map(r => [
    r.nucleoId,
    r.nombreNucleo,
    r.rolPrincipal,
    r.recursoQueAporta,
    r.rolesSecundarios.join(', ') || '—',
  ]);
  secciones.push(crearTabla(['ID', 'Núcleo', 'Rol Principal', 'Recurso', 'Roles Secundarios'], rolesFilas));

  // Vulnerabilidades
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('3. Vulnerabilidades Detectadas', 1));

  for (const vuln of plan.vulnerabilidadesGlobales) {
    if (vuln.vulnerabilidades.length === 0) continue;
    const n = nucleos.find(nc => nc.id === vuln.nucleo);
    secciones.push(crearTitulo(`${vuln.nucleo} — ${n?.nombre || ''}`, 2));
    for (const v of vuln.vulnerabilidades) {
      const tipo = v.severidad === 'alta' ? 'peligro' : v.severidad === 'media' ? 'aviso' : 'info';
      secciones.push(crearAlerta(`[${v.severidad.toUpperCase()}] ${v.descripcion}: ${v.recomendacion}`, tipo));
    }
  }

  // Recursos disponibles
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('4. Recursos Disponibles en la Red', 1));

  for (const rec of plan.recursosDisponibles) {
    if (rec.recursos.length === 0) continue;
    const n = nucleos.find(nc => nc.id === rec.nucleo);
    secciones.push(crearTitulo(`${rec.nucleo} — ${n?.nombre || ''}`, 3));
    secciones.push(...crearListaNumerada(rec.recursos));
  }

  // Distancias
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('5. Matriz de Distancias', 1));
  const distFilas = inter.distancias.map(d => [
    d.de,
    d.a,
    `${d.km} km`,
    `${d.minutosCoche} min`,
    d.minutosAPie ? `${d.minutosAPie} min` : '—',
  ]);
  secciones.push(crearTabla(['De', 'A', 'Distancia', 'En coche', 'A pie'], distFilas));

  // Protocolo de activación
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('6. Protocolo de Activación', 1));
  secciones.push(crearAlerta('Código de activación: "ACTIVO PLAN FAMILIAR"', 'peligro'));
  secciones.push(...crearListaNumerada(plan.protocoloActivacion));

  // Puntos de encuentro
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('7. Puntos de Encuentro', 1));
  secciones.push(crearAlerta(`PRINCIPAL: ${inter.puntosEncuentro.global.ubicacion}`, 'aviso'));
  if (inter.puntosEncuentro.alternativo) {
    secciones.push(crearParrafo(`Alternativo: ${inter.puntosEncuentro.alternativo.ubicacion}`));
  }

  // Escenarios rápidos
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('8. Resumen de Escenarios', 1));
  const escFilas: string[][] = [];
  if (inter.escenarios.apagon?.nucleoMejorPreparado) {
    escFilas.push(['Apagón', `Núcleo mejor preparado: ${inter.escenarios.apagon.nucleoMejorPreparado}`, inter.escenarios.apagon.notas || '']);
  }
  if (inter.escenarios.evacuacion?.destino) {
    escFilas.push(['Evacuación', `Destino: ${inter.escenarios.evacuacion.destino}`, `Secuencia: ${inter.escenarios.evacuacion.secuenciaRecogida?.join(' → ') || '—'}`]);
  }
  if (inter.escenarios.conflicto?.nucleoMasSeguro) {
    escFilas.push(['Conflicto', `Núcleo más seguro: ${inter.escenarios.conflicto.nucleoMasSeguro}`, inter.escenarios.conflicto.notas || '']);
  }
  if (inter.escenarios.pandemia?.nucleoCuidaNinos) {
    escFilas.push(['Pandemia', `Cuida niños: ${inter.escenarios.pandemia.nucleoCuidaNinos}`, inter.escenarios.pandemia.notas || '']);
  }
  secciones.push(crearTabla(['Escenario', 'Asignación clave', 'Notas'], escFilas));

  // Generar
  const doc = crearDocumento('Plan Global — Coordinador', secciones);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'plan_global_coordinador.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

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

  // 7. PROTOCOLOS POR ESCENARIO
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('6. Protocolos por Escenario', 1));

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
  secciones.push(crearTitulo('7. Tu Rol en el Plan', 1));

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

  // 9. MAPA DE EVACUACIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('8. Plan de Evacuación', 1));

  const escEvac = dossier.protocolos.find(p => p.escenario === 'catastrofe');
  if (escEvac) {
    secciones.push(crearParrafo(`Destino de evacuación: ${dossier.puntosEncuentro.global.ubicacion}`, { bold: true }));
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

  // 10. DOCUMENTACIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('9. Documentación a Preparar', 1));
  secciones.push(crearParrafo('Asegúrate de tener copias (física + digital) de los siguientes documentos:'));
  secciones.push(
    ...crearChecklist(
      dossier.checklistDocumentos.map(doc => ({ texto: doc, marcado: false }))
    )
  );

  // 11. CALENDARIO DE REVISIÓN
  secciones.push(crearSeparador());
  secciones.push(crearTitulo('10. Calendario de Revisión', 1));
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

import { Packer, Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { COLORES, crearTabla, DocChild } from './docx-helpers';

export async function generarFichaResumen(
  nucleo: NucleoBase,
  nucleos: NucleoBase[],
  inter: Interconexiones,
  outputDir: string
): Promise<string> {
  const fecha = new Date().toLocaleDateString('es-ES');

  const secciones: DocChild[] = [];

  // Encabezado compacto
  secciones.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      shading: { type: ShadingType.SOLID, color: COLORES.azul },
      children: [
        new TextRun({ text: `FICHA DE EMERGENCIA — ${nucleo.id}: ${nucleo.nombre}`, bold: true, color: COLORES.blanco, size: 24 }),
      ],
    })
  );

  secciones.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `📍 ${nucleo.vivienda.direccion} | Generada: ${fecha}`, size: 16, color: COLORES.gris }),
      ],
    })
  );

  // EMERGENCIAS
  secciones.push(seccionTitulo('☎ EMERGENCIAS'));
  secciones.push(crearTabla(
    ['Servicio', 'Teléfono'],
    [
      ['Emergencias generales', '112'],
      ['Policía Nacional', '091'],
      ['Guardia Civil', '062'],
      ['Bomberos', '080'],
      ['Emergencias sanitarias', '061'],
      ...(nucleo.entorno?.hospitalCercano
        ? [[`Hospital: ${nucleo.entorno.hospitalCercano.nombre}`, nucleo.entorno.hospitalCercano.distancia]]
        : []),
    ],
    { colorEncabezado: COLORES.rojo }
  ));

  // CADENA DE CONTACTO FAMILIAR
  secciones.push(seccionTitulo('👥 CONTACTOS FAMILIARES'));

  const contactosFamiliares: string[][] = [];
  // Coordinador
  const coord = nucleos.find(n => n.id === inter.cadenaContacto.coordinadorPrincipal);
  if (coord && coord.id !== nucleo.id) {
    contactosFamiliares.push([
      `${coord.miembros[0]?.nombre || coord.nombre} (${coord.id})`,
      coord.comunicaciones.moviles[0]?.numero || '—',
      'COORDINADOR',
    ]);
  }
  // Los 3 núcleos más cercanos
  const cercanos = inter.distancias
    .filter(d => d.de === nucleo.id || d.a === nucleo.id)
    .map(d => ({ id: d.de === nucleo.id ? d.a : d.de, km: d.km }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  for (const c of cercanos) {
    const n = nucleos.find(nc => nc.id === c.id);
    if (!n || contactosFamiliares.some(f => f[0].includes(n.id))) continue;
    contactosFamiliares.push([
      `${n.miembros[0]?.nombre || n.nombre} (${n.id})`,
      n.comunicaciones.moviles[0]?.numero || '—',
      `${c.km}km`,
    ]);
  }

  if (inter.cadenaContacto.contactoEnlaceExterno) {
    const ext = inter.cadenaContacto.contactoEnlaceExterno;
    contactosFamiliares.push([`${ext.nombre} (${ext.ciudad})`, ext.telefono, 'ENLACE EXT.']);
  }

  secciones.push(crearTabla(['Contacto', 'Teléfono', 'Info'], contactosFamiliares, { colorEncabezado: COLORES.azul }));

  // PUNTOS DE ENCUENTRO
  secciones.push(seccionTitulo('📍 PUNTOS DE ENCUENTRO'));
  const puntosFilas: string[][] = [
    ['PRINCIPAL', inter.puntosEncuentro.global.ubicacion],
  ];
  if (inter.puntosEncuentro.alternativo) {
    puntosFilas.push(['ALTERNATIVO', inter.puntosEncuentro.alternativo.ubicacion]);
  }
  const subfam = inter.puntosEncuentro.subfamiliar?.find(s => s.nucleosImplicados.includes(nucleo.id));
  if (subfam) {
    puntosFilas.push(['SUBFAMILIAR', subfam.ubicacion]);
  }
  secciones.push(crearTabla(['Nivel', 'Ubicación'], puntosFilas, { colorEncabezado: COLORES.verde }));

  // CÓDIGOS
  secciones.push(seccionTitulo('🔔 CÓDIGOS'));
  secciones.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '🟢 VERDE', bold: true, color: '006633', size: 18 }),
        new TextRun({ text: ' = Todo bien  ', size: 18 }),
        new TextRun({ text: '🟡 AMARILLO', bold: true, color: '996600', size: 18 }),
        new TextRun({ text: ' = Vigilar  ', size: 18 }),
        new TextRun({ text: '🔴 ROJO', bold: true, color: 'CC0000', size: 18 }),
        new TextRun({ text: ' = Emergencia  ', size: 18 }),
        new TextRun({ text: '⚫ NEGRO', bold: true, size: 18 }),
        new TextRun({ text: ' = Evacuación', size: 18 }),
      ],
    })
  );

  secciones.push(
    new Paragraph({
      spacing: { after: 40 },
      shading: { type: ShadingType.SOLID, color: COLORES.rojoFondo },
      children: [
        new TextRun({ text: 'Código activación: "ACTIVO PLAN FAMILIAR"', bold: true, color: COLORES.rojo, size: 18 }),
      ],
    })
  );

  // DATOS MÉDICOS CRÍTICOS
  const datosMedicos: string[][] = [];
  for (const m of nucleo.miembros) {
    const alertas: string[] = [];
    if (m.alergias && m.alergias !== '') alertas.push(`Alergias: ${m.alergias}`);
    if (m.medicacionFija && m.medicacionFija !== '') alertas.push(`Medicación: ${m.medicacionFija}`);
    if (m.grupoSanguineo) alertas.push(`Sangre: ${m.grupoSanguineo}`);
    if (alertas.length > 0 || m.condicionesMedicas) {
      datosMedicos.push([
        m.nombre,
        m.grupoSanguineo || '—',
        alertas.join(' | ') + (m.condicionesMedicas ? ` | ${m.condicionesMedicas}` : ''),
      ]);
    }
  }

  if (datosMedicos.length > 0) {
    secciones.push(seccionTitulo('🏥 DATOS MÉDICOS CRÍTICOS'));
    secciones.push(crearTabla(['Nombre', 'Sangre', 'Alertas médicas'], datosMedicos, { colorEncabezado: COLORES.rojo }));
  }

  // Pie
  secciones.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({ text: '— PLASTIFICAR Y GUARDAR EN LUGAR ACCESIBLE —', bold: true, color: COLORES.rojo, size: 16 }),
      ],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 400, bottom: 400, left: 500, right: 500 },
        },
      },
      children: secciones,
    }],
  });

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${nucleo.id}_ficha_resumen.docx`);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function seccionTitulo(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORES.azul } },
    children: [new TextRun({ text: texto, bold: true, color: COLORES.azul, size: 20 })],
  });
}

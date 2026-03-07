import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
} from 'docx';

export type DocChild = Paragraph | Table;

// Colores del sistema
export const COLORES = {
  rojo: 'CC0000',
  rojoFondo: 'FFE5E5',
  azul: '003366',
  azulFondo: 'E5F0FF',
  verde: '006633',
  verdeFondo: 'E5FFE5',
  amarillo: '996600',
  amarilloFondo: 'FFF8E5',
  gris: '666666',
  grisFondo: 'F5F5F5',
  negro: '000000',
  blanco: 'FFFFFF',
};

export function crearTitulo(texto: string, nivel: 1 | 2 | 3 = 1): Paragraph {
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };

  return new Paragraph({
    heading: headingMap[nivel],
    spacing: { before: nivel === 1 ? 400 : 200, after: 200 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        color: COLORES.azul,
        size: nivel === 1 ? 32 : nivel === 2 ? 26 : 22,
      }),
    ],
  });
}

export function crearParrafo(texto: string, opciones?: { bold?: boolean; color?: string; size?: number; italic?: boolean }): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: texto,
        bold: opciones?.bold,
        color: opciones?.color,
        size: opciones?.size || 20,
        italics: opciones?.italic,
      }),
    ],
  });
}

export function crearAlerta(texto: string, tipo: 'peligro' | 'info' | 'exito' | 'aviso'): Paragraph {
  const iconos = { peligro: '⚠', info: 'ℹ', exito: '✓', aviso: '⚡' };
  const colores = {
    peligro: { texto: COLORES.rojo, fondo: COLORES.rojoFondo },
    info: { texto: COLORES.azul, fondo: COLORES.azulFondo },
    exito: { texto: COLORES.verde, fondo: COLORES.verdeFondo },
    aviso: { texto: COLORES.amarillo, fondo: COLORES.amarilloFondo },
  };

  return new Paragraph({
    spacing: { before: 100, after: 100 },
    shading: { type: ShadingType.SOLID, color: colores[tipo].fondo },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: colores[tipo].texto },
    },
    indent: { left: 200, right: 200 },
    children: [
      new TextRun({
        text: ` ${iconos[tipo]} ${texto}`,
        bold: true,
        color: colores[tipo].texto,
        size: 20,
      }),
    ],
  });
}

export function crearTabla(
  encabezados: string[],
  filas: string[][],
  opciones?: { anchoTotal?: number; colorEncabezado?: string }
): Table {
  const colorEnc = opciones?.colorEncabezado || COLORES.azul;

  const headerRow = new TableRow({
    tableHeader: true,
    children: encabezados.map(
      (enc) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, color: colorEnc },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: enc, bold: true, color: COLORES.blanco, size: 18 })],
            }),
          ],
        })
    ),
  });

  const dataRows = filas.map(
    (fila, i) =>
      new TableRow({
        children: fila.map(
          (celda) =>
            new TableCell({
              shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: COLORES.grisFondo } : undefined,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: celda, size: 18 })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

export function crearListaNumerada(items: string[], opciones?: { color?: string }): Paragraph[] {
  return items.map(
    (item, i) =>
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 400 },
        children: [
          new TextRun({
            text: `${i + 1}. `,
            bold: true,
            color: opciones?.color || COLORES.azul,
            size: 20,
          }),
          new TextRun({ text: item, size: 20 }),
        ],
      })
  );
}

export function crearChecklist(items: { texto: string; marcado: boolean }[]): Paragraph[] {
  return items.map(
    (item) =>
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 400 },
        children: [
          new TextRun({
            text: item.marcado ? '☑ ' : '☐ ',
            bold: true,
            color: item.marcado ? COLORES.verde : COLORES.gris,
            size: 22,
          }),
          new TextRun({
            text: item.texto,
            size: 20,
            strike: item.marcado,
            color: item.marcado ? COLORES.gris : COLORES.negro,
          }),
        ],
      })
  );
}

export function crearSeparador(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORES.gris } },
    children: [],
  });
}

export function crearPortada(titulo: string, subtitulo: string, fecha: string, aviso: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 2000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: titulo,
          bold: true,
          color: COLORES.azul,
          size: 48,
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: subtitulo,
          color: COLORES.gris,
          size: 28,
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generado: ${fecha}`,
          color: COLORES.gris,
          size: 20,
          italics: true,
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: COLORES.rojoFondo },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: COLORES.rojo },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORES.rojo },
        left: { style: BorderStyle.SINGLE, size: 2, color: COLORES.rojo },
        right: { style: BorderStyle.SINGLE, size: 2, color: COLORES.rojo },
      },
      children: [
        new TextRun({
          text: `⚠ ${aviso}`,
          bold: true,
          color: COLORES.rojo,
          size: 18,
        }),
      ],
    }),
  ];
}

export function crearHeaderFooter(nombreNucleo: string): { headers: any; footers: any } {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Plan de Emergencia — ${nombreNucleo}`,
                color: COLORES.gris,
                size: 16,
                italics: true,
              }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CONFIDENCIAL — Solo para uso interno del sistema familiar',
                color: COLORES.rojo,
                size: 14,
              }),
            ],
          }),
        ],
      }),
    },
  };
}

export function crearDocumento(nombreNucleo: string, secciones: DocChild[]): Document {
  const { headers, footers } = crearHeaderFooter(nombreNucleo);

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
        heading1: {
          run: { font: 'Calibri', size: 32, bold: true, color: COLORES.azul },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        heading2: {
          run: { font: 'Calibri', size: 26, bold: true, color: COLORES.azul },
          paragraph: { spacing: { before: 300, after: 150 } },
        },
        heading3: {
          run: { font: 'Calibri', size: 22, bold: true, color: COLORES.azul },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      },
    },
    sections: [
      {
        headers,
        footers,
        children: secciones,
      },
    ],
  });
}

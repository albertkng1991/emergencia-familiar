import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { validateNucleo, validateInterconexiones, validateAllNucleos } from './validators/validate';
import { construirDossier, generarDossierDocx } from './generators/dossier-generator';
import { generarFichaResumen } from './generators/ficha-resumen';
import { construirPlanGlobal, generarPlanGlobalDocx } from './generators/plan-global';
import { NucleoBase } from './types/nucleo';
import { Interconexiones } from './types/interconexiones';

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve(__dirname, '../output');
const NUCLEOS_DIR = path.join(DATA_DIR, 'nucleos');
const PLANTILLA_PATH = path.join(NUCLEOS_DIR, '_plantilla.json');
const INTERCONEXIONES_PATH = path.join(DATA_DIR, 'interconexiones.json');

const program = new Command();

program
  .name('plan-emergencia')
  .description('Sistema de generación de planes de emergencia familiar coordinados')
  .version('1.0.0');

// === COMANDO: nuevo ===
program
  .command('nuevo')
  .description('Crear un nuevo núcleo a partir de la plantilla')
  .requiredOption('--id <id>', 'ID del núcleo (ej: N1, N2)')
  .requiredOption('--nombre <nombre>', 'Nombre descriptivo del núcleo')
  .action((opts) => {
    const { id, nombre } = opts;

    if (!/^N\d+$/.test(id)) {
      console.error('❌ El ID debe tener formato N1, N2, N3, etc.');
      process.exit(1);
    }

    const outputPath = path.join(NUCLEOS_DIR, `${id}.json`);
    if (fs.existsSync(outputPath)) {
      console.error(`❌ Ya existe un archivo para ${id} en ${outputPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(PLANTILLA_PATH)) {
      console.error('❌ No se encuentra la plantilla en', PLANTILLA_PATH);
      process.exit(1);
    }

    const plantilla = JSON.parse(fs.readFileSync(PLANTILLA_PATH, 'utf-8'));
    plantilla.id = id;
    plantilla.nombre = nombre;

    fs.writeFileSync(outputPath, JSON.stringify(plantilla, null, 2), 'utf-8');
    console.log(`✓ Núcleo ${id} creado en ${outputPath}`);
    console.log(`  Nombre: ${nombre}`);
    console.log(`  Ahora edita el archivo JSON con los datos reales del núcleo.`);
  });

// === COMANDO: validar ===
program
  .command('validar')
  .description('Validar datos de núcleos')
  .option('--nucleo <id>', 'Validar un núcleo específico')
  .option('--todos', 'Validar todos los núcleos')
  .action((opts) => {
    if (opts.nucleo) {
      const filePath = path.join(NUCLEOS_DIR, `${opts.nucleo}.json`);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ No existe ${filePath}`);
        process.exit(1);
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const result = validateNucleo(data);
      printValidationResult(opts.nucleo, result);
    } else if (opts.todos) {
      const results = validateAllNucleos(DATA_DIR);
      if (results.size === 0) {
        console.log('⚠ No se encontraron archivos de núcleos en', NUCLEOS_DIR);
        return;
      }
      for (const [id, result] of results) {
        printValidationResult(id, result);
        console.log('');
      }

      // Validar interconexiones si existe
      if (fs.existsSync(INTERCONEXIONES_PATH)) {
        const interData = JSON.parse(fs.readFileSync(INTERCONEXIONES_PATH, 'utf-8'));
        const interResult = validateInterconexiones(interData);
        printValidationResult('interconexiones', interResult);
      } else {
        console.log('⚠ No se encontró archivo de interconexiones');
      }
    } else {
      console.error('❌ Especifica --nucleo <id> o --todos');
      process.exit(1);
    }
  });

// === COMANDO: generar ===
program
  .command('generar')
  .description('Generar documentos')
  .option('--nucleo <id>', 'Generar dossier de un núcleo específico')
  .option('--todos', 'Generar dossiers de todos los núcleos')
  .option('--fichas', 'Generar solo fichas resumen')
  .option('--global', 'Generar plan global del coordinador')
  .action(async (opts) => {
    const { nucleos, inter } = cargarDatos();

    if (opts.global) {
      console.log('📋 Generando plan global del coordinador...');
      const plan = construirPlanGlobal(nucleos, inter);
      const outputPath = await generarPlanGlobalDocx(plan, nucleos, inter, OUTPUT_DIR);
      console.log(`✓ Plan global generado: ${outputPath}`);
      return;
    }

    const nucleosAGenerar = opts.nucleo
      ? nucleos.filter(n => n.id === opts.nucleo)
      : opts.todos || opts.fichas
      ? nucleos
      : [];

    if (nucleosAGenerar.length === 0) {
      if (opts.nucleo) {
        console.error(`❌ No se encontró el núcleo ${opts.nucleo}`);
      } else {
        console.error('❌ Especifica --nucleo <id>, --todos, --fichas o --global');
      }
      process.exit(1);
    }

    for (const nucleo of nucleosAGenerar) {
      if (opts.fichas) {
        console.log(`📄 Generando ficha resumen de ${nucleo.id}...`);
        const fichaPath = await generarFichaResumen(nucleo, nucleos, inter, OUTPUT_DIR);
        console.log(`  ✓ Ficha: ${fichaPath}`);
      } else {
        console.log(`📖 Generando dossier de ${nucleo.id}...`);
        const dossier = construirDossier(nucleo, nucleos, inter);
        const dossierPath = await generarDossierDocx(dossier, nucleo, OUTPUT_DIR);
        console.log(`  ✓ Dossier: ${dossierPath}`);

        const fichaPath = await generarFichaResumen(nucleo, nucleos, inter, OUTPUT_DIR);
        console.log(`  ✓ Ficha resumen: ${fichaPath}`);
      }
    }

    console.log(`\n✓ Documentos generados en ${OUTPUT_DIR}`);
  });

// === COMANDO: estado ===
program
  .command('estado')
  .description('Ver el estado actual del sistema')
  .action(() => {
    console.log('═══════════════════════════════════════════');
    console.log('  ESTADO DEL SISTEMA DE EMERGENCIA FAMILIAR');
    console.log('═══════════════════════════════════════════\n');

    // Nucleos
    if (!fs.existsSync(NUCLEOS_DIR)) {
      console.log('❌ No existe el directorio de núcleos');
      return;
    }

    const archivos = fs.readdirSync(NUCLEOS_DIR)
      .filter(f => f.endsWith('.json') && f !== '_plantilla.json');

    console.log(`📁 Núcleos encontrados: ${archivos.length}`);
    console.log('');

    for (const archivo of archivos) {
      const filePath = path.join(NUCLEOS_DIR, archivo);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const result = validateNucleo(data);
        const miembros = data.miembros?.length || 0;
        const icono = result.valid ? '✓' : '⚠';
        const errores = result.errors.length;
        const warnings = result.warnings.length;
        const faltantes = result.camposFaltantes.length;

        console.log(`  ${icono} ${data.id || archivo} — ${data.nombre || '(sin nombre)'}`);
        console.log(`    Miembros: ${miembros} | Errores: ${errores} | Avisos: ${warnings} | Campos vacíos: ${faltantes}`);

        if (data.modulosAdicionales?.length > 0) {
          console.log(`    Módulos: ${data.modulosAdicionales.join(', ')}`);
        }
      } catch {
        console.log(`  ❌ ${archivo} — Error al leer/parsear`);
      }
    }

    // Interconexiones
    console.log('');
    if (fs.existsSync(INTERCONEXIONES_PATH)) {
      try {
        const inter = JSON.parse(fs.readFileSync(INTERCONEXIONES_PATH, 'utf-8'));
        const result = validateInterconexiones(inter);
        console.log(`📋 Interconexiones: ${result.valid ? '✓ válido' : '⚠ con errores'}`);
        console.log(`   Núcleos referenciados: ${inter.nucleos?.length || 0}`);
        console.log(`   Distancias registradas: ${inter.distancias?.length || 0}`);
        console.log(`   Roles definidos: ${inter.roles?.length || 0}`);
      } catch {
        console.log('❌ Error al leer interconexiones.json');
      }
    } else {
      console.log('⚠ No se encontró interconexiones.json');
    }

    // Output
    console.log('');
    if (fs.existsSync(OUTPUT_DIR)) {
      const docs = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.docx'));
      console.log(`📄 Documentos generados: ${docs.length}`);
      for (const doc of docs) {
        console.log(`   — ${doc}`);
      }
    } else {
      console.log('📄 No hay documentos generados aún');
    }

    console.log('');
  });

// === Helpers ===

function cargarDatos(): { nucleos: NucleoBase[]; inter: Interconexiones } {
  if (!fs.existsSync(INTERCONEXIONES_PATH)) {
    console.error('❌ No se encontró interconexiones.json en', INTERCONEXIONES_PATH);
    console.error('   Crea el archivo con los datos de interconexiones antes de generar.');
    process.exit(1);
  }

  const inter = JSON.parse(fs.readFileSync(INTERCONEXIONES_PATH, 'utf-8')) as Interconexiones;

  const archivos = fs.readdirSync(NUCLEOS_DIR)
    .filter(f => f.endsWith('.json') && f !== '_plantilla.json');

  if (archivos.length === 0) {
    console.error('❌ No hay núcleos en', NUCLEOS_DIR);
    process.exit(1);
  }

  const nucleos: NucleoBase[] = archivos.map(f => {
    return JSON.parse(fs.readFileSync(path.join(NUCLEOS_DIR, f), 'utf-8'));
  });

  return { nucleos, inter };
}

function printValidationResult(id: string, result: { valid: boolean; errors: string[]; warnings: string[]; camposFaltantes: string[] }) {
  const icono = result.valid ? '✓' : '✗';
  console.log(`${icono} ${id}: ${result.valid ? 'VÁLIDO' : 'INVÁLIDO'}`);

  if (result.errors.length > 0) {
    console.log(`  Errores (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`    ❌ ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`  Avisos (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      console.log(`    ⚠ ${warn}`);
    }
  }

  if (result.camposFaltantes.length > 0) {
    console.log(`  Campos por rellenar (${result.camposFaltantes.length}):`);
    for (const campo of result.camposFaltantes.slice(0, 10)) {
      console.log(`    📝 ${campo}`);
    }
    if (result.camposFaltantes.length > 10) {
      console.log(`    ... y ${result.camposFaltantes.length - 10} más`);
    }
  }
}

program.parse();

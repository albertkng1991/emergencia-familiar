import Ajv, { ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMAS_DIR = path.resolve(__dirname, '../../data/schemas');

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  camposFaltantes: string[];
}

function loadSchema(filename: string): object {
  const filepath = path.join(SCHEMAS_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });

  // Register module schemas so $ref works
  ajv.addSchema(loadSchema('modulo-bebe.schema.json'), 'modulo-bebe.schema.json');
  ajv.addSchema(loadSchema('modulo-mayores.schema.json'), 'modulo-mayores.schema.json');
  ajv.addSchema(loadSchema('modulo-jovenes.schema.json'), 'modulo-jovenes.schema.json');

  return ajv;
}

function detectCamposFaltantes(data: any, prefix: string = ''): string[] {
  const faltantes: string[] = [];

  if (data === null || data === undefined) return faltantes;

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === '' || value === null) {
      faltantes.push(fullKey);
    } else if (Array.isArray(value) && value.length === 0) {
      faltantes.push(`${fullKey} (vacío)`);
    } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      faltantes.push(...detectCamposFaltantes(value, fullKey));
    }
  }

  return faltantes;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.map(err => {
    const field = err.instancePath || '(raíz)';
    return `${field}: ${err.message}`;
  });
}

export function validateNucleo(data: any): ValidationResult {
  const ajv = createAjv();
  const schema = loadSchema('nucleo-base.schema.json');
  const validate = ajv.compile(schema);
  const valid = validate(data) as boolean;

  const errors = formatAjvErrors(validate.errors);
  const camposFaltantes = detectCamposFaltantes(data);

  const warnings: string[] = [];

  // Warnings por buenas prácticas
  if (data.miembros) {
    for (const m of data.miembros) {
      if (!m.telefono && m.edad >= 12) {
        warnings.push(`Miembro "${m.nombre}" no tiene teléfono registrado`);
      }
      if (!m.grupoSanguineo) {
        warnings.push(`Miembro "${m.nombre}" no tiene grupo sanguíneo registrado`);
      }
    }
  }

  if (!data.suministros?.botiquin || data.suministros.botiquin === '') {
    warnings.push('No se ha indicado si el núcleo dispone de botiquín');
  }

  if (!data.comunicaciones?.apps || data.comunicaciones.apps.length === 0) {
    warnings.push('No se han indicado apps de comunicación');
  }

  if (data.modulosAdicionales?.includes('bebe') && !data.moduloBebe) {
    warnings.push('El núcleo indica módulo "bebe" pero no tiene datos en moduloBebe');
  }
  if (data.modulosAdicionales?.includes('mayores') && !data.moduloMayores) {
    warnings.push('El núcleo indica módulo "mayores" pero no tiene datos en moduloMayores');
  }
  if (data.modulosAdicionales?.includes('jovenes') && !data.moduloJovenes) {
    warnings.push('El núcleo indica módulo "jovenes" pero no tiene datos en moduloJovenes');
  }

  return { valid, errors, warnings, camposFaltantes };
}

export function validateInterconexiones(data: any): ValidationResult {
  const ajv = createAjv();
  const schema = loadSchema('interconexiones.schema.json');
  const validate = ajv.compile(schema);
  const valid = validate(data) as boolean;

  const errors = formatAjvErrors(validate.errors);
  const camposFaltantes = detectCamposFaltantes(data);
  const warnings: string[] = [];

  // Verificar coherencia
  if (data.nucleos && data.distancias) {
    const nucleoSet = new Set(data.nucleos);
    for (const d of data.distancias) {
      if (!nucleoSet.has(d.de)) warnings.push(`Distancia referencia a núcleo inexistente: ${d.de}`);
      if (!nucleoSet.has(d.a)) warnings.push(`Distancia referencia a núcleo inexistente: ${d.a}`);
    }
  }

  if (data.nucleos && data.roles) {
    const nucleoSet = new Set(data.nucleos);
    for (const r of data.roles) {
      if (!nucleoSet.has(r.nucleo)) warnings.push(`Rol asignado a núcleo inexistente: ${r.nucleo}`);
    }
  }

  return { valid, errors, warnings, camposFaltantes };
}

export function validateAllNucleos(dataDir: string): Map<string, ValidationResult> {
  const nucleosDir = path.join(dataDir, 'nucleos');
  const results = new Map<string, ValidationResult>();

  if (!fs.existsSync(nucleosDir)) {
    return results;
  }

  const files = fs.readdirSync(nucleosDir)
    .filter(f => f.endsWith('.json') && f !== '_plantilla.json');

  for (const file of files) {
    const filepath = path.join(nucleosDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      results.set(file.replace('.json', ''), validateNucleo(data));
    } catch (err) {
      results.set(file.replace('.json', ''), {
        valid: false,
        errors: [`Error al leer/parsear ${file}: ${(err as Error).message}`],
        warnings: [],
        camposFaltantes: [],
      });
    }
  }

  return results;
}

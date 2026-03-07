# Plan de Emergencia Familiar Coordinado

Sistema para generar **planes de emergencia familiar coordinados** entre múltiples núcleos familiares (7-15 núcleos). Cada núcleo recibe un dossier personalizado e imprimible (DOCX) con protocolos de actuación, cadenas de contacto, listas de suministros y más.

No son planes aislados: el plan de cada núcleo referencia a los demás ("en caso de evacuación, dirígete a casa de N3", "si ambos padres enferman, el niño va con N2").

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Flujo de trabajo

### 1. Repartir cuestionarios

Los cuestionarios están en la carpeta `docs/`:

- **`cuestionario-base.md`** — para todos los núcleos
- **`modulo-bebe.md`** — para núcleos con bebés/niños pequeños
- **`modulo-mayores.md`** — para núcleos con personas mayores
- **`modulo-jovenes.md`** — para núcleos con adolescentes
- **`interconexiones.md`** — solo para el coordinador

### 2. Crear núcleos en el sistema

```bash
npm run nuevo -- --id N1 --nombre "Carlos + María + Lucas"
npm run nuevo -- --id N2 --nombre "Carmen + Antonio"
```

### 3. Rellenar datos

Edita los archivos JSON en `data/nucleos/` con las respuestas de cada cuestionario.

Crea `data/interconexiones.json` con los datos de interconexiones entre núcleos (ver `docs/interconexiones.md` y `docs/guia-coordinador.md`).

### 4. Validar

```bash
# Validar un núcleo
npm run validar -- --nucleo N1

# Validar todos
npm run validar -- --todos
```

### 5. Generar documentos

```bash
# Dossier + ficha de un núcleo
npm run generar -- --nucleo N1

# Todos los dossiers y fichas
npm run generar -- --todos

# Solo fichas resumen (para plastificar)
npm run generar -- --fichas

# Plan global del coordinador
npm run generar -- --global
```

### 6. Ver estado

```bash
npm run estado
```

## Estructura del proyecto

```
├── data/
│   ├── schemas/              # JSON Schemas para validación
│   ├── nucleos/              # Datos de cada núcleo familiar (gitignored)
│   │   └── _plantilla.json   # Plantilla vacía
│   └── interconexiones.json  # Datos del coordinador (gitignored)
├── src/
│   ├── types/                # Tipos TypeScript
│   ├── validators/           # Validación con ajv
│   ├── engine/               # Motor de procesamiento
│   │   ├── analyzer.ts       # Vulnerabilidades, fortalezas, score
│   │   ├── roles.ts          # Asignación de roles por núcleo
│   │   ├── scenarios.ts      # Protocolos por escenario
│   │   ├── contacts.ts       # Cadenas de contacto
│   │   └── supplies.ts       # Listas de suministros
│   ├── generators/           # Generadores DOCX
│   │   ├── dossier-generator.ts  # Dossier completo (10-15 páginas)
│   │   ├── ficha-resumen.ts      # Ficha plastificable (1 página)
│   │   ├── plan-global.ts        # Resumen para coordinador
│   │   └── docx-helpers.ts       # Helpers de estilo y formato
│   └── cli.ts                # CLI principal
├── output/                   # Documentos generados (gitignored)
├── docs/                     # Cuestionarios y guías
└── scripts/                  # Scripts de shell
```

## Documentos generados

Cada núcleo recibe:

- **Dossier completo** (~15 páginas): datos del núcleo, red familiar, puntos de encuentro, plan de comunicación, kit de emergencia personalizado, protocolos por escenario (apagón, catástrofe, conflicto, pandemia, crisis económica), rol en el plan, plan de evacuación, checklist de documentación.
- **Ficha resumen** (1 página): contactos de emergencia, cadena familiar, puntos de encuentro, códigos, datos médicos críticos. Diseñada para plastificar.

El coordinador recibe:

- **Plan global**: vista de pájaro de todos los núcleos, mapa de roles, vulnerabilidades, recursos disponibles, protocolo de activación, matriz de distancias.

## Privacidad

Los datos personales (JSONs de núcleos, interconexiones, documentos generados) están en `.gitignore`. Solo se versionan los schemas, la plantilla vacía, el código y la documentación.

## Actualización del plan

Revisa cada 6 meses o cuando haya cambios significativos (nacimientos, mudanzas, cambios de teléfono, nuevos recursos). Consulta `docs/guia-coordinador.md` para el proceso completo.

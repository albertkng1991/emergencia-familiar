# Guía del Coordinador — Paso a Paso

## Tu rol

Eres el coordinador del plan de emergencia familiar. Tu trabajo es:
1. Recopilar la información de todos los núcleos
2. Definir las interconexiones entre núcleos
3. Generar y distribuir los dossiers personalizados
4. Mantener el plan actualizado

---

## Paso 1: Preparar los cuestionarios

1. Imprime o envía los cuestionarios que están en la carpeta `docs/`:
   - `cuestionario-base.md` → para TODOS los núcleos
   - `modulo-bebe.md` → para núcleos con bebés/niños pequeños
   - `modulo-mayores.md` → para núcleos con personas mayores
   - `modulo-jovenes.md` → para núcleos con adolescentes

2. Pide a cada núcleo que lo rellene con calma. No hace falta que respondan todo, pero cuanto más completo, mejor será su plan.

---

## Paso 2: Crear los núcleos en el sistema

Para cada núcleo que devuelva su cuestionario:

```bash
npm run nuevo -- --id N1 --nombre "Carlos + María + Lucas"
```

Esto crea un archivo `data/nucleos/N1.json` con la plantilla vacía.

---

## Paso 3: Rellenar los datos

Edita cada archivo `data/nucleos/NX.json` con los datos del cuestionario.

Usa cualquier editor de texto o JSON. Los campos que no se rellenen se pueden dejar como cadena vacía `""` o array vacío `[]`.

---

## Paso 4: Rellenar interconexiones

Crea el archivo `data/interconexiones.json` con la información que solo tú como coordinador conoces:
- Distancias entre núcleos
- Quién puede acoger a quién
- Roles asignados
- Puntos de encuentro
- Configuración de escenarios

Puedes usar `docs/interconexiones.md` como guía.

---

## Paso 5: Validar

```bash
# Validar un núcleo específico
npm run validar -- --nucleo N1

# Validar todos los núcleos e interconexiones
npm run validar -- --todos
```

El validador te dirá:
- **Errores**: campos obligatorios que faltan o tienen formato incorrecto
- **Avisos**: datos recomendados que faltan (teléfono, grupo sanguíneo, etc.)
- **Campos vacíos**: campos que existen pero están sin rellenar

---

## Paso 6: Generar dossiers

```bash
# Generar el dossier completo + ficha de un núcleo
npm run generar -- --nucleo N1

# Generar TODOS los dossiers y fichas
npm run generar -- --todos

# Generar solo las fichas resumen (para plastificar)
npm run generar -- --fichas

# Generar el plan global (solo para ti)
npm run generar -- --global
```

Los documentos se generan en la carpeta `output/`.

---

## Paso 7: Distribuir

1. **Dossier completo** (`NX_dossier.docx`): imprímelo y entrégalo a cada núcleo
2. **Ficha resumen** (`NX_ficha_resumen.docx`): imprímela, plastifícala y dásela a cada núcleo para que la tengan siempre accesible
3. **Plan global** (`plan_global_coordinador.docx`): es solo para ti

---

## Paso 8: Mantener actualizado

- Revisa el plan cada **6 meses**
- Actualiza cuando haya:
  - Nacimientos, fallecimientos, mudanzas
  - Cambios de teléfono
  - Nuevos recursos (compra de vehículo, generador, etc.)
  - Cambios en la situación médica de algún miembro

Para ver el estado actual del sistema:

```bash
npm run estado
```

---

## Consejos

- **No agobies a la familia**. Es mejor tener un plan parcial que no tener plan. Si alguien no rellena todo, genera su dossier igual.
- **Los datos son sensibles**. No subas los archivos JSON a repositorios públicos. El `.gitignore` ya protege los datos, pero ten cuidado con copias.
- **Practica**. Al menos una vez al año, haz un simulacro de contacto: envía el código de activación y comprueba que todos responden.

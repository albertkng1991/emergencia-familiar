import { NucleoBase } from '../types/nucleo';
import { CalendarioRotacion, ItemRotacion } from '../types/dossier';

function generarItemsBase(): ItemRotacion[] {
  return [
    {
      item: 'Agua embotellada',
      categoria: 'Alimentación',
      vidaUtil: '1 año',
      frecuenciaRevision: 'Cada 6 meses',
      consejo: 'Rota el agua: usa la antigua para regar y repón con nueva',
    },
    {
      item: 'Conservas',
      categoria: 'Alimentación',
      vidaUtil: '2 años',
      frecuenciaRevision: 'Anual',
      consejo: 'Revisa fechas. Consume las que caducan pronto en comidas normales y repón',
    },
    {
      item: 'Arroz/pasta seca',
      categoria: 'Alimentación',
      vidaUtil: '1-2 años',
      frecuenciaRevision: 'Anual',
      consejo: 'Almacenar en recipientes herméticos',
    },
    {
      item: 'Pilas de linterna',
      categoria: 'Iluminación y energía',
      vidaUtil: '2 años',
      frecuenciaRevision: 'Cada 6 meses',
      consejo: 'Saca las pilas de las linternas si no las usas (evita fugas)',
    },
    {
      item: 'Powerbank',
      categoria: 'Iluminación y energía',
      vidaUtil: '3 años',
      frecuenciaRevision: 'Cada 3 meses',
      consejo: 'Carga al 80% cada 3 meses para mantener la batería sana',
    },
    {
      item: 'Medicación personal',
      categoria: 'Salud',
      vidaUtil: 'Variable',
      frecuenciaRevision: 'Mensual',
      consejo: 'Revisa fecha de cada medicamento. Rota con la que usas a diario',
    },
    {
      item: 'Botiquín',
      categoria: 'Salud',
      vidaUtil: '1-3 años',
      frecuenciaRevision: 'Cada 6 meses',
      consejo: 'Revisa tiritas, gasas, antiséptico. Lo abierto caduca antes',
    },
    {
      item: 'Efectivo',
      categoria: 'Documentación y finanzas',
      vidaUtil: 'No caduca',
      frecuenciaRevision: 'Cada 6 meses',
      consejo: 'Verifica que sigues teniendo la cantidad prevista',
    },
    {
      item: 'Documentos/USB',
      categoria: 'Documentación y finanzas',
      vidaUtil: 'No caduca',
      frecuenciaRevision: 'Anual',
      consejo: 'Actualiza copias si ha cambiado DNI, dirección, teléfonos',
    },
    {
      item: 'Bombonas camping gas',
      categoria: 'Cocina alternativa',
      vidaUtil: '5 años',
      frecuenciaRevision: 'Anual',
      consejo: 'Verifica que no tienen fugas. Almacena en lugar ventilado',
    },
    {
      item: 'Velas/mecheros',
      categoria: 'Iluminación y energía',
      vidaUtil: '2 años',
      frecuenciaRevision: 'Anual',
      consejo: 'Los mecheros pierden gas con el tiempo',
    },
  ];
}

function generarItemsBebe(): ItemRotacion[] {
  return [
    {
      item: 'Fórmula infantil',
      categoria: 'Bebé',
      vidaUtil: '1 mes abierta / 1 año cerrada',
      frecuenciaRevision: 'Mensual',
      consejo: 'Rota con el uso diario',
    },
    {
      item: 'Pañales',
      categoria: 'Bebé',
      vidaUtil: 'No caducan pero la talla cambia',
      frecuenciaRevision: 'Cada 3 meses',
      consejo: 'Ajusta la talla al crecimiento',
    },
  ];
}

function generarItemsMedicacion(
  medicacion: { nombre: string; dosis: string; frecuencia: string; esencial: boolean }[],
): ItemRotacion[] {
  return medicacion.map((med) => ({
    item: med.nombre,
    categoria: 'Medicación personas mayores',
    vidaUtil: 'Según envase',
    frecuenciaRevision: 'Mensual',
    consejo: 'ESENCIAL: mantener siempre reserva mínima de 2 semanas',
  }));
}

export function generarCalendarioRotacion(nucleo: NucleoBase): CalendarioRotacion {
  const items: ItemRotacion[] = generarItemsBase();

  if (nucleo.modulosAdicionales.includes('bebe') && nucleo.moduloBebe) {
    items.push(...generarItemsBebe());
  }

  if (
    nucleo.modulosAdicionales.includes('mayores') &&
    nucleo.moduloMayores?.medicacionDetallada &&
    nucleo.moduloMayores.medicacionDetallada.length > 0
  ) {
    items.push(...generarItemsMedicacion(nucleo.moduloMayores.medicacionDetallada));
  }

  const recordatoriosSemestrales: string[] = [
    'Revisar fechas de caducidad de TODA la comida almacenada',
    'Cargar powerbanks y verificar que funcionan',
    'Comprobar estado de pilas en linternas',
    'Verificar botiquín: reponer lo gastado o caducado',
    'Actualizar copias de documentos si ha habido cambios',
    'Comprobar estado del agua almacenada',
    'Verificar efectivo disponible',
    'Probar walkie-talkies y radio de emergencia (si los tienes)',
  ];

  const instrucciones: string[] = [
    'La rotación es clave: no acumules y olvides. Integra los suministros en tu vida diaria.',
    'Cuando consumas una conserva del stock de emergencia, repón inmediatamente.',
    'Pon una alarma en el móvil cada 6 meses: 1 de enero y 1 de julio.',
    'Involucra a toda la familia en la revisión semestral: que todos sepan dónde está todo.',
  ];

  return {
    items,
    recordatoriosSemestrales,
    instrucciones,
  };
}

import { NucleoBase, Miembro } from '../types/nucleo';
import { MochilaEmergencia, ItemMochila } from '../types/dossier';

function itemsBaseAdulto(miembro: Miembro): ItemMochila[] {
  const items: ItemMochila[] = [
    { item: 'Copia del DNI', cantidad: '1', esencial: true },
    { item: 'Botella de agua', cantidad: '1.5L', esencial: true },
    { item: 'Barritas energéticas', cantidad: '3', esencial: true },
    { item: 'Silbato', cantidad: '1', esencial: true },
    { item: 'Linterna pequeña', cantidad: '1', esencial: true },
    { item: 'Powerbank', cantidad: '1', esencial: true },
    { item: 'Manta térmica', cantidad: '1', esencial: true },
    { item: 'Copia de contactos impresa', cantidad: '1', esencial: true },
    { item: 'Efectivo 50€ en billetes pequeños', cantidad: '1', esencial: true },
    { item: 'Mascarilla FFP2', cantidad: '2', esencial: true },
    { item: 'Cuchilla multiusos', cantidad: '1', esencial: false },
  ];

  if (miembro.medicacionFija) {
    items.push({
      item: 'Medicación personal',
      cantidad: 'Dosis para 72h',
      esencial: true,
      notas: miembro.medicacionFija,
    });
  }

  return items;
}

function itemsBebe(nucleo: NucleoBase): ItemMochila[] {
  const items: ItemMochila[] = [
    { item: 'Biberón / fórmula', cantidad: 'Para 72h', esencial: true },
    { item: 'Pañales', cantidad: '10', esencial: true },
    { item: 'Muda de ropa', cantidad: '1', esencial: true },
    { item: 'Chupete de repuesto', cantidad: '1', esencial: false },
    { item: 'Manta extra', cantidad: '1', esencial: true },
    { item: 'Documentación sanitaria bebé', cantidad: '1', esencial: true },
  ];

  if (nucleo.moduloBebe?.medicacionInfantil) {
    items.push({
      item: 'Medicación infantil',
      cantidad: 'Según prescripción',
      esencial: true,
      notas: nucleo.moduloBebe.medicacionInfantil,
    });
  }

  return items;
}

function itemsMayor(nucleo: NucleoBase, miembro: Miembro): ItemMochila[] {
  const items: ItemMochila[] = [
    { item: 'Tarjeta sanitaria', cantidad: '1', esencial: true },
    { item: 'Teléfono cargado con contactos ICE', cantidad: '1', esencial: true },
    { item: 'Gafas de repuesto', cantidad: '1', esencial: false },
  ];

  // Add detailed medication from moduloMayores
  const medicacion = nucleo.moduloMayores?.medicacionDetallada;
  if (medicacion && medicacion.length > 0) {
    for (const med of medicacion) {
      items.push({
        item: `Medicación: ${med.nombre}`,
        cantidad: `Dosis para 72h (${med.dosis}, ${med.frecuencia})`,
        esencial: med.esencial,
        notas: `Frecuencia: ${med.frecuencia}`,
      });
    }
  } else if (miembro.medicacionFija) {
    items.push({
      item: 'Medicación personal',
      cantidad: 'Dosis para 72h',
      esencial: true,
      notas: miembro.medicacionFija,
    });
  }

  // Add walking cane if mobility issues
  const movilidad = nucleo.moduloMayores?.movilidad;
  if (movilidad && movilidad.toLowerCase() !== 'normal' && movilidad.toLowerCase() !== 'buena') {
    items.push({
      item: 'Bastón plegable',
      cantidad: '1',
      esencial: true,
      notas: `Movilidad: ${movilidad}`,
    });
  }

  return items;
}

function itemsBaseAdultoLigero(miembro: Miembro): ItemMochila[] {
  // Reduced-weight version for elderly: exclude heavy items (powerbank, cuchilla multiusos)
  const items: ItemMochila[] = [
    { item: 'Copia del DNI', cantidad: '1', esencial: true },
    { item: 'Botella de agua', cantidad: '0.5L', esencial: true, notas: 'Reducido por peso' },
    { item: 'Barritas energéticas', cantidad: '3', esencial: true },
    { item: 'Silbato', cantidad: '1', esencial: true },
    { item: 'Linterna pequeña', cantidad: '1', esencial: true },
    { item: 'Manta térmica', cantidad: '1', esencial: true },
    { item: 'Copia de contactos impresa', cantidad: '1', esencial: true },
    { item: 'Efectivo 50€ en billetes pequeños', cantidad: '1', esencial: true },
    { item: 'Mascarilla FFP2', cantidad: '2', esencial: true },
  ];

  return items;
}

function itemsJoven(miembro: Miembro): ItemMochila[] {
  const extras: ItemMochila[] = [
    { item: 'Cargador de móvil', cantidad: '1', esencial: true },
    { item: 'Copia de contactos del plan', cantidad: '1', esencial: true },
    { item: 'Mochila personal', cantidad: '1', esencial: false },
  ];

  return [...itemsBaseAdulto(miembro), ...extras];
}

function itemsMascota(mascota: { tipo: string; nombre?: string; necesidades?: string }): ItemMochila[] {
  const items: ItemMochila[] = [
    { item: 'Transportín / correa', cantidad: '1', esencial: true },
    { item: 'Comida', cantidad: 'Para 3 días', esencial: true },
    { item: 'Agua', cantidad: 'Para 3 días', esencial: true },
    { item: 'Cartilla veterinaria', cantidad: '1', esencial: true },
  ];

  if (mascota.necesidades) {
    items.push({
      item: 'Medicación / necesidades especiales',
      cantidad: 'Según necesidad',
      esencial: true,
      notas: mascota.necesidades,
    });
  }

  return items;
}

function determinarPerfil(miembro: Miembro, nucleo: NucleoBase): string {
  if (miembro.edad < 3) return 'bebe';
  if (miembro.edad >= 65) return 'mayor';
  if (miembro.edad >= 12 && miembro.edad < 18) return 'joven';
  return 'adulto';
}

function encontrarPortadorBebe(nucleo: NucleoBase): string {
  // Find the titular or cónyuge to carry the baby bag
  const titular = nucleo.miembros.find(
    (m) => m.parentesco.toLowerCase() === 'titular' || m.parentesco.toLowerCase() === 'padre' || m.parentesco.toLowerCase() === 'madre'
  );
  if (titular) return titular.nombre;

  const conyuge = nucleo.miembros.find(
    (m) => m.parentesco.toLowerCase() === 'cónyuge' || m.parentesco.toLowerCase() === 'conyuge' || m.parentesco.toLowerCase() === 'pareja'
  );
  if (conyuge) return conyuge.nombre;

  // Fallback: first adult
  const adulto = nucleo.miembros.find((m) => m.edad >= 18);
  return adulto ? adulto.nombre : nucleo.miembros[0].nombre;
}

export function generarMochilasEmergencia(nucleo: NucleoBase): MochilaEmergencia[] {
  const mochilas: MochilaEmergencia[] = [];

  for (const miembro of nucleo.miembros) {
    const perfil = determinarPerfil(miembro, nucleo);

    if (perfil === 'bebe') {
      const portador = encontrarPortadorBebe(nucleo);
      mochilas.push({
        persona: miembro.nombre,
        perfil: 'bebe',
        items: itemsBebe(nucleo),
      });
      // Add a note to the baby bag indicating who carries it
      const bebeBag = mochilas[mochilas.length - 1];
      bebeBag.items.unshift({
        item: `Mochila portada por ${portador}`,
        cantidad: '-',
        esencial: true,
        notas: 'Este kit lo lleva el adulto responsable',
      });
    } else if (perfil === 'mayor') {
      mochilas.push({
        persona: miembro.nombre,
        perfil: 'mayor',
        items: [...itemsBaseAdultoLigero(miembro), ...itemsMayor(nucleo, miembro)],
      });
    } else if (perfil === 'joven') {
      mochilas.push({
        persona: miembro.nombre,
        perfil: 'joven',
        items: itemsJoven(miembro),
      });
    } else {
      mochilas.push({
        persona: miembro.nombre,
        perfil: 'adulto',
        items: itemsBaseAdulto(miembro),
      });
    }
  }

  // Generate bags for pets
  const mascotas = nucleo.preferencias.mascotas;
  if (mascotas && mascotas.length > 0) {
    for (const mascota of mascotas) {
      const nombre = mascota.nombre || `${mascota.tipo}`;
      mochilas.push({
        persona: nombre,
        perfil: 'mascota',
        items: itemsMascota(mascota),
      });
    }
  }

  return mochilas;
}

import { NucleoBase, Miembro } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { ProtocoloReunificacion, UbicacionHabitual } from '../types/dossier';

function generarUbicacionMiembro(
  miembro: Miembro,
  nucleo: NucleoBase,
  inter: Interconexiones
): UbicacionHabitual {
  const edad = miembro.edad;
  const titular = nucleo.miembros.find(m => m.parentesco === 'titular');
  const conyuge = nucleo.miembros.find(m => m.parentesco === 'cónyuge' || m.parentesco === 'conyuge');

  // Determine location based on age and role
  let lugarTrabajo: string | undefined;
  let lugarEstudios: string | undefined;
  let horarioHabitual: string | undefined;
  let instruccion: string;

  // Children in guardería (from moduloBebe)
  if (nucleo.moduloBebe?.guarderia && edad < 6) {
    lugarEstudios = nucleo.moduloBebe.guarderia.nombre;
    horarioHabitual = 'Horario de guardería';
    const responsablePrincipal = titular?.nombre ?? nucleo.miembros[0].nombre;
    const responsableBackup = conyuge?.nombre
      ?? nucleo.miembros.find(m => m.nombre !== responsablePrincipal && m.edad >= 18)?.nombre
      ?? 'un núcleo cercano';
    instruccion = `El responsable de recoger a ${miembro.nombre} de la guardería es ${responsablePrincipal}. Si no puede, el backup es ${responsableBackup}.`;
  }
  // Teens with centroEstudios (from moduloJovenes)
  else if (nucleo.moduloJovenes?.centroEstudios && edad >= 12 && edad < 18) {
    lugarEstudios = nucleo.moduloJovenes.centroEstudios.nombre;
    horarioHabitual = nucleo.moduloJovenes.horarios ?? 'Horario escolar habitual';
    const responsablePrincipal = titular?.nombre ?? nucleo.miembros[0].nombre;
    const responsableBackup = conyuge?.nombre
      ?? nucleo.miembros.find(m => m.nombre !== responsablePrincipal && m.edad >= 18)?.nombre
      ?? 'un núcleo cercano';
    instruccion = `El responsable de recoger a ${miembro.nombre} del centro de estudios es ${responsablePrincipal}. Si no puede, el backup es ${responsableBackup}.`;
  }
  // Kids 6-17 without moduloJovenes
  else if (edad >= 6 && edad < 18) {
    lugarEstudios = 'Colegio';
    horarioHabitual = 'Horario escolar habitual';
    const responsablePrincipal = titular?.nombre ?? nucleo.miembros[0].nombre;
    const responsableBackup = conyuge?.nombre
      ?? nucleo.miembros.find(m => m.nombre !== responsablePrincipal && m.edad >= 18)?.nombre
      ?? 'un núcleo cercano';
    instruccion = `El responsable de recoger a ${miembro.nombre} del colegio es ${responsablePrincipal}. Si no puede, el backup es ${responsableBackup}.`;
  }
  // Elderly
  else if (edad > 65) {
    horarioHabitual = 'Probablemente en casa';
    instruccion = 'Si estás en casa: quédate donde estás, asegura puertas y ventanas, y comunica tu situación al grupo familiar.';
  }
  // Adults 18-65
  else if (edad >= 18 && edad <= 65) {
    lugarTrabajo = 'En el trabajo o desplazamiento habitual';
    horarioHabitual = 'Jornada laboral habitual';
    instruccion = 'Si estás en el trabajo: contacta con el coordinador, evalúa si puedes volver a casa con seguridad. Si no puedes, quédate donde estás y comunica tu ubicación.';
  }
  // Fallback (children under 6 without guardería)
  else {
    horarioHabitual = 'Probablemente en casa con un adulto';
    instruccion = 'El menor debe permanecer con el adulto responsable en todo momento.';
  }

  return {
    miembro: miembro.nombre,
    lugarTrabajo,
    lugarEstudios,
    horarioHabitual,
    instruccion,
  };
}

function generarInstruccionesNinos(
  nucleo: NucleoBase,
  inter: Interconexiones
): string[] {
  const instrucciones: string[] = [];
  const titular = nucleo.miembros.find(m => m.parentesco === 'titular');
  const conyuge = nucleo.miembros.find(m => m.parentesco === 'cónyuge' || m.parentesco === 'conyuge');
  const ninos = nucleo.miembros.filter(m => m.edad < 18);

  for (const nino of ninos) {
    const responsablePrincipal = titular?.nombre ?? nucleo.miembros[0].nombre;
    const responsableBackup = conyuge?.nombre
      ?? nucleo.miembros.find(m => m.nombre !== responsablePrincipal && m.edad >= 18)?.nombre
      ?? 'un núcleo cercano';

    let lugar = 'el colegio';
    if (nino.edad < 6 && nucleo.moduloBebe?.guarderia) {
      lugar = `la guardería (${nucleo.moduloBebe.guarderia.nombre})`;
    } else if (nino.edad >= 12 && nucleo.moduloJovenes?.centroEstudios) {
      lugar = `el centro de estudios (${nucleo.moduloJovenes.centroEstudios.nombre})`;
    }

    instrucciones.push(
      `El responsable de recoger a ${nino.nombre} de ${lugar} es ${responsablePrincipal}. Si no puede, el backup es ${responsableBackup}.`
    );
  }

  return instrucciones;
}

export function generarProtocoloReunificacion(
  nucleo: NucleoBase,
  inter: Interconexiones
): ProtocoloReunificacion {
  const ubicacionesMiembros: UbicacionHabitual[] = nucleo.miembros.map(m =>
    generarUbicacionMiembro(m, nucleo, inter)
  );

  // Use subfamiliar meeting point or global as local reunion point
  const puntoReunionLocal =
    inter.puntosEncuentro.subfamiliar?.[0]?.ubicacion
    ?? inter.puntosEncuentro.global.ubicacion;

  const instruccionesGenerales: string[] = [
    'Cada miembro envía su ubicación actual al grupo familiar inmediatamente.',
    'NO te desplaces si hay peligro activo. Quédate donde estés y comunica.',
    'Si puedes moverte con seguridad, dirígete a casa. Si no, al punto de reunión local.',
    'Si tras 2 horas no has podido contactar con nadie, dirígete al punto de encuentro global.',
    'Mantén el móvil cargado y con batería. Envía mensajes de texto, no llames (saturan la red).',
  ];

  const instruccionesNinos = generarInstruccionesNinos(nucleo, inter);

  const planBSiNoPuedesLlegarACasa: string[] = [
    'Dirígete al punto de encuentro subfamiliar más cercano a tu ubicación.',
    'Contacta con el núcleo familiar más cercano a donde estés.',
    'Si no hay cobertura, espera en un lugar seguro y visible. Acude al punto de encuentro a las horas en punto.',
    'Deja señal visible en casa si te vas (nota en la puerta con destino y hora).',
  ];

  return {
    ubicacionesMiembros,
    puntoReunionLocal,
    instruccionesGenerales,
    instruccionesNinos,
    planBSiNoPuedesLlegarACasa,
  };
}

import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { RolAsignado } from '../types/dossier';

export function asignarRoles(nucleos: NucleoBase[], inter: Interconexiones): RolAsignado[] {
  const rolesAsignados: RolAsignado[] = [];

  // Primero, respetar roles manuales de interconexiones
  const rolesManual = new Map<string, { rol: string; recurso: string }>();
  if (inter.roles) {
    for (const r of inter.roles) {
      rolesManual.set(r.nucleo, { rol: r.rolPrincipal, recurso: r.recursoQueAporta });
    }
  }

  for (const nucleo of nucleos) {
    const manual = rolesManual.get(nucleo.id);
    const rolesSecundarios: string[] = [];
    let rolPrincipal = manual?.rol || '';
    let recurso = manual?.recurso || '';

    // Auto-detectar roles si no hay manual
    if (!rolPrincipal) {
      const detected = detectarRolAutomatico(nucleo, inter);
      rolPrincipal = detected.rol;
      recurso = detected.recurso;
    }

    // Detectar roles secundarios siempre
    rolesSecundarios.push(...detectarRolesSecundarios(nucleo, inter));

    const descripcion = generarDescripcionRol(rolPrincipal, nucleo, inter);

    rolesAsignados.push({
      nucleoId: nucleo.id,
      nombreNucleo: nucleo.nombre,
      rolPrincipal,
      rolesSecundarios,
      recursoQueAporta: recurso,
      descripcionRol: descripcion,
    });
  }

  return rolesAsignados;
}

function detectarRolAutomatico(n: NucleoBase, inter: Interconexiones): { rol: string; recurso: string } {
  // Punto de acogida: mayor capacidad
  const acogida = inter.capacidadAcogida?.find(a => a.nucleoAnfitrion === n.id);
  if (acogida && acogida.plazasExtra >= 4) {
    return { rol: 'Punto de acogida principal', recurso: `${acogida.plazasExtra} plazas extra` };
  }

  // Responsable sanitario
  if (n.recursos?.conocimientosUtiles?.some(c =>
    ['médico', 'medico', 'enfermero', 'enfermera', 'paramédico', 'paramedico', 'sanitario'].includes(c.toLowerCase())
  )) {
    return { rol: 'Responsable sanitario', recurso: 'Conocimientos médicos' };
  }

  // Responsable transporte
  const vehiculoGrande = n.transporte?.vehiculos?.find(v => v.plazas >= 7);
  if (vehiculoGrande) {
    return { rol: 'Responsable transporte evacuación', recurso: `${vehiculoGrande.modelo || vehiculoGrande.tipo} (${vehiculoGrande.plazas} plazas)` };
  }

  // Punto de refugio rural
  if (n.recursos?.propiedadSecundaria) {
    return { rol: 'Punto de refugio alternativo', recurso: `${n.recursos.propiedadSecundaria.tipo} en ${n.recursos.propiedadSecundaria.ubicacion}` };
  }

  // Generador
  if (inter.recursosCompartidos?.generador === n.id) {
    return { rol: 'Soporte energético', recurso: 'Generador eléctrico' };
  }

  // Coordinador
  if (inter.cadenaContacto?.coordinadorPrincipal === n.id) {
    return { rol: 'Coordinador principal', recurso: 'Gestión y coordinación' };
  }
  if (inter.cadenaContacto?.coordinadorSuplente === n.id) {
    return { rol: 'Coordinador suplente', recurso: 'Gestión y coordinación de respaldo' };
  }

  // Autosuficiencia alimentaria
  if (n.recursos?.huertoAnimales && n.recursos.huertoAnimales !== '') {
    return { rol: 'Soporte alimentario', recurso: n.recursos.huertoAnimales };
  }

  return { rol: 'Apoyo general', recurso: 'Colaboración general en emergencias' };
}

function detectarRolesSecundarios(n: NucleoBase, inter: Interconexiones): string[] {
  const roles: string[] = [];

  if (n.recursos?.conocimientosUtiles) {
    for (const c of n.recursos.conocimientosUtiles) {
      const lower = c.toLowerCase();
      if (['electricista', 'fontanero', 'mecánico', 'mecanico'].includes(lower)) {
        roles.push(`Soporte técnico (${c})`);
      }
      if (['primeros auxilios', 'socorrista'].includes(lower)) {
        roles.push('Apoyo sanitario');
      }
    }
  }

  if (n.comunicaciones?.walkieTalkies || n.comunicaciones?.radioEmergencia) {
    roles.push('Nodo de comunicaciones');
  }

  if (n.transporte?.vehiculos?.some(v => v.todoterreno)) {
    roles.push('Transporte todoterreno');
  }

  const acogida = inter.capacidadAcogida?.find(a => a.nucleoAnfitrion === n.id);
  if (acogida && acogida.plazasExtra > 0 && acogida.plazasExtra < 4) {
    roles.push(`Acogida secundaria (${acogida.plazasExtra} plazas)`);
  }

  return roles;
}

function generarDescripcionRol(rol: string, n: NucleoBase, inter: Interconexiones): string {
  switch (rol) {
    case 'Punto de acogida principal':
      return `Tu hogar es uno de los puntos de acogida de la red familiar. En caso de evacuación de otros núcleos, prepárate para recibir familiares. Mantén espacio disponible y provisiones extra.`;
    case 'Responsable sanitario':
      return `Eres el referente médico de la red familiar. En caso de emergencia con heridos o enfermos, los demás núcleos te contactarán primero. Mantén un botiquín ampliado.`;
    case 'Responsable transporte evacuación':
      return `Tu vehículo es clave para la evacuación del grupo. En el protocolo de evacuación, realizarás viajes de recogida según la secuencia establecida.`;
    case 'Punto de refugio alternativo':
      return `Tu propiedad secundaria es un posible punto de refugio. Mantenla accesible y con suministros básicos por si la red necesita desplazarse allí.`;
    case 'Soporte energético':
      return `Dispones de generador eléctrico. En caso de apagón prolongado, otros núcleos (especialmente los que dependen de aparatos médicos eléctricos) pueden necesitar tu apoyo.`;
    case 'Coordinador principal':
      return `Eres quien activa el plan y coordina las comunicaciones entre núcleos. En cualquier emergencia, los demás te contactan primero.`;
    case 'Coordinador suplente':
      return `Si el coordinador principal no está disponible, asumes la coordinación. Mantente informado del plan y los protocolos.`;
    case 'Soporte alimentario':
      return `Tu huerto/animales pueden ser un recurso alimentario importante en crisis prolongadas. Coordínate con los demás núcleos para compartir producción si es necesario.`;
    default:
      return `Colaboras con el grupo según las necesidades de cada situación. Mantén tu kit preparado y sigue los protocolos establecidos.`;
  }
}

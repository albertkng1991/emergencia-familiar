import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { CadenaContactoDossier, ContactoDossier } from '../types/dossier';

export function generarCadenaContacto(
  nucleoId: string,
  nucleos: NucleoBase[],
  inter: Interconexiones
): CadenaContactoDossier {
  const contactos: ContactoDossier[] = [];
  const nucleo = nucleos.find(n => n.id === nucleoId)!;

  // 1. Emergencias generales
  contactos.push({
    nombre: 'Emergencias',
    telefono: '112',
    rol: 'Emergencias generales',
    prioridad: 0,
  });

  // 2. Coordinador principal (si no soy yo)
  const coordPrincipal = inter.cadenaContacto.coordinadorPrincipal;
  if (coordPrincipal !== nucleoId) {
    const nCoord = nucleos.find(n => n.id === coordPrincipal);
    if (nCoord) {
      const tel = nCoord.comunicaciones.moviles[0]?.numero || 'sin teléfono';
      contactos.push({
        nombre: `${nCoord.miembros[0]?.nombre || nCoord.nombre} (${nCoord.id})`,
        telefono: tel,
        rol: 'Coordinador principal',
        nucleoId: nCoord.id,
        prioridad: 1,
      });
    }
  }

  // 3. Coordinador suplente (si no soy yo)
  const coordSuplente = inter.cadenaContacto.coordinadorSuplente;
  if (coordSuplente !== nucleoId) {
    const nSup = nucleos.find(n => n.id === coordSuplente);
    if (nSup) {
      const tel = nSup.comunicaciones.moviles[0]?.numero || 'sin teléfono';
      contactos.push({
        nombre: `${nSup.miembros[0]?.nombre || nSup.nombre} (${nSup.id})`,
        telefono: tel,
        rol: 'Coordinador suplente',
        nucleoId: nSup.id,
        prioridad: 2,
      });
    }
  }

  // 4. Núcleos más cercanos (por distancia)
  const distancias = inter.distancias
    .filter(d => d.de === nucleoId || d.a === nucleoId)
    .map(d => ({
      nucleoId: d.de === nucleoId ? d.a : d.de,
      km: d.km,
      minutos: d.minutosCoche,
    }))
    .sort((a, b) => a.km - b.km);

  let prioridad = 3;
  for (const dist of distancias) {
    const n = nucleos.find(nc => nc.id === dist.nucleoId);
    if (!n) continue;
    // Evitar duplicados
    if (contactos.some(c => c.nucleoId === dist.nucleoId)) continue;

    const tel = n.comunicaciones.moviles[0]?.numero || 'sin teléfono';
    const rol = inter.roles?.find(r => r.nucleo === n.id)?.rolPrincipal || 'Familiar';
    contactos.push({
      nombre: `${n.miembros[0]?.nombre || n.nombre} (${n.id})`,
      telefono: tel,
      rol: `${rol} — a ${dist.km}km / ${dist.minutos} min`,
      nucleoId: n.id,
      prioridad: prioridad++,
    });
  }

  // 5. Resto de núcleos no incluidos
  for (const n of nucleos) {
    if (n.id === nucleoId) continue;
    if (contactos.some(c => c.nucleoId === n.id)) continue;
    const tel = n.comunicaciones.moviles[0]?.numero || 'sin teléfono';
    contactos.push({
      nombre: `${n.miembros[0]?.nombre || n.nombre} (${n.id})`,
      telefono: tel,
      rol: 'Familiar',
      nucleoId: n.id,
      prioridad: prioridad++,
    });
  }

  // Contacto enlace externo
  let contactoExterno: ContactoDossier | undefined;
  if (inter.cadenaContacto.contactoEnlaceExterno) {
    const ext = inter.cadenaContacto.contactoEnlaceExterno;
    contactoExterno = {
      nombre: `${ext.nombre} (${ext.ciudad})`,
      telefono: ext.telefono,
      rol: 'Contacto enlace externo',
      prioridad: 99,
    };
  }

  // Señales y códigos
  const senales = [
    'Código VERDE: todo bien, sin novedades',
    'Código AMARILLO: situación a vigilar, mantener contacto',
    'Código ROJO: emergencia activa, activar protocolo',
    'Código NEGRO: evacuación inmediata al punto de encuentro',
    '"Estoy en casa" = confirmación de seguridad',
    '"Activo plan" = se inicia el protocolo de emergencia',
  ];

  return {
    contactosPriorizados: contactos,
    contactoEnlaceExterno: contactoExterno,
    codigoActivacion: 'ACTIVO PLAN FAMILIAR',
    senales,
  };
}

export interface Miembro {
  nombre: string;
  edad: number;
  dni?: string;
  grupoSanguineo?: string;
  telefono?: string;
  alergias?: string;
  medicacionFija?: string;
  condicionesMedicas?: string;
  parentesco: string;
}

export interface Vivienda {
  direccion: string;
  tipo: string;
  planta?: number;
  ascensor?: boolean;
  garaje?: string;
  trastero?: string;
  llavesPaso: {
    agua?: string;
    electricidad?: string;
    gas?: string;
  };
  espacioExterior?: string;
  habitacionSegura?: string;
}

export interface Vehiculo {
  tipo: string;
  modelo?: string;
  plazas: number;
  ubicacion?: string;
  todoterreno?: boolean;
}

export interface Transporte {
  vehiculos: Vehiculo[];
  conductores: string[];
  bicicletas?: number;
}

export interface PropiedadSecundaria {
  tipo: string;
  ubicacion: string;
  descripcion?: string;
}

export interface Recursos {
  conocimientosUtiles?: string[];
  herramientas?: string[];
  armasCaza?: string;
  huertoAnimales?: string;
  propiedadSecundaria?: PropiedadSecundaria;
}

export interface Suministros {
  comidaNoPerecedera?: string;
  aguaAlmacenada?: string;
  botiquin?: string;
  iluminacion?: string;
  cocinaAlternativa?: string;
  copiasDocumentos?: string;
}

export interface ContactoMovil {
  nombre: string;
  numero: string;
  operador?: string;
}

export interface Comunicaciones {
  moviles: ContactoMovil[];
  telefonoFijo?: string;
  apps: string[];
  walkieTalkies?: boolean;
  radioEmergencia?: boolean;
  powerbanks?: string;
}

export interface Entorno {
  zona: string;
  riesgosNaturales?: string[];
  supermercadosCercanos?: string;
  farmaciasCercanas?: string;
  hospitalCercano?: { nombre: string; distancia: string };
  vecinosConfianza?: string;
}

export interface Mascota {
  tipo: string;
  nombre?: string;
  necesidades?: string;
}

export interface Preferencias {
  escenarioPreocupante?: string;
  peticionesEspecificas?: string;
  mascotas?: Mascota[];
}

// Módulo bebé/niños pequeños
export interface ModuloBebe {
  alimentacion?: string;
  panales?: string;
  portabebes?: string;
  sillaCoche?: string;
  guarderia?: { nombre: string; direccion?: string; telefono?: string };
  cuidadoresAlternativos?: { nombre: string; telefono: string; relacion: string }[];
  medicacionInfantil?: string;
  pediatra?: { nombre: string; telefono?: string };
  alimentosEspecificos?: string;
  rutinaSueno?: string;
}

// Módulo personas mayores
export interface ModuloMayores {
  movilidad?: string;
  medicacionDetallada?: { nombre: string; dosis: string; frecuencia: string; esencial: boolean }[];
  aparatosElectricosMedicos?: { aparato: string; autonomiaBateria?: string; alternativa?: string }[];
  deterioroCognitivo?: string;
  capacidadEvacuacion?: string;
  cuidadorPrincipal?: string;
  centroSalud?: { nombre: string; telefono?: string; direccion?: string };
  dependencia?: string;
}

// Módulo jóvenes/adolescentes
export interface ModuloJovenes {
  autonomia?: string;
  movilPropio?: boolean;
  conocimientos?: string[];
  horarios?: string;
  carnet?: boolean;
  rolActivo?: string;
  centroEstudios?: { nombre: string; direccion?: string; telefono?: string };
}

export interface NucleoBase {
  id: string;
  nombre: string;
  modulosAdicionales: ("bebe" | "mayores" | "jovenes")[];
  miembros: Miembro[];
  vivienda: Vivienda;
  transporte: Transporte;
  recursos: Recursos;
  suministros: Suministros;
  comunicaciones: Comunicaciones;
  entorno: Entorno;
  preferencias: Preferencias;
  moduloBebe?: ModuloBebe;
  moduloMayores?: ModuloMayores;
  moduloJovenes?: ModuloJovenes;
}

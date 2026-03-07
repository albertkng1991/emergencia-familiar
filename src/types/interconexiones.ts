export interface Distancia {
  de: string;
  a: string;
  km: number;
  minutosCoche: number;
  minutosAPie?: number;
}

export interface CapacidadAcogida {
  nucleoAnfitrion: string;
  puedeAcogerA: string[];
  plazasExtra: number;
  notas?: string;
}

export interface ConocimientoClave {
  nucleo: string;
  habilidad: string;
}

export interface RecursosCompartidos {
  vehiculoGrande?: string;
  generador?: string;
  almacenaje?: string;
  conocimientosClave?: ConocimientoClave[];
}

export interface ContactoEnlaceExterno {
  nombre: string;
  telefono: string;
  ciudad: string;
}

export interface CadenaContacto {
  coordinadorPrincipal: string;
  coordinadorSuplente: string;
  contactoEnlaceExterno?: ContactoEnlaceExterno;
}

export interface RolNucleo {
  nucleo: string;
  rolPrincipal: string;
  recursoQueAporta: string;
}

export interface PuntoEncuentro {
  ubicacion: string;
  comoLlegar?: string;
}

export interface PuntoEncuentroSubfamiliar {
  nucleosImplicados: string[];
  ubicacion: string;
}

export interface PuntosEncuentro {
  global: PuntoEncuentro;
  alternativo?: PuntoEncuentro;
  subfamiliar?: PuntoEncuentroSubfamiliar[];
}

export interface EscenarioConfig {
  nucleoMejorPreparado?: string;
  nucleoMasSeguro?: string;
  nucleoCuidaNinos?: string;
  secuenciaRecogida?: string[];
  destino?: string;
  notas?: string;
}

export interface Escenarios {
  apagon: EscenarioConfig;
  evacuacion: EscenarioConfig;
  conflicto: EscenarioConfig;
  pandemia: EscenarioConfig;
}

export interface Interconexiones {
  nucleos: string[];
  distancias: Distancia[];
  capacidadAcogida: CapacidadAcogida[];
  recursosCompartidos: RecursosCompartidos;
  cadenaContacto: CadenaContacto;
  roles: RolNucleo[];
  puntosEncuentro: PuntosEncuentro;
  escenarios: Escenarios;
}

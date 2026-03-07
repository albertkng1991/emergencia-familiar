import { NucleoBase, Miembro } from './nucleo';

export interface Vulnerabilidad {
  tipo: string;
  descripcion: string;
  severidad: 'alta' | 'media' | 'baja';
  recomendacion: string;
}

export interface Fortaleza {
  tipo: string;
  descripcion: string;
}

export interface AnalisisNucleo {
  nucleoId: string;
  vulnerabilidades: Vulnerabilidad[];
  fortalezas: Fortaleza[];
  scorePreparacion: number; // 0-100
  resumen: string;
}

export interface RolAsignado {
  nucleoId: string;
  nombreNucleo: string;
  rolPrincipal: string;
  rolesSecundarios: string[];
  recursoQueAporta: string;
  descripcionRol: string;
}

export interface PasoProtocolo {
  orden: number;
  accion: string;
  responsable?: string;
  tiempoEstimado?: string;
  notas?: string;
  esCondicional?: boolean;
  condicion?: string;
}

export interface ProtocoloEscenario {
  escenario: string;
  titulo: string;
  descripcion: string;
  faseInmediata: PasoProtocolo[];   // Primeros 30 minutos
  faseCorta: PasoProtocolo[];       // Primeras 4 horas
  faseLarga: PasoProtocolo[];       // Primeras 72 horas
  contactosRelevantes: ContactoDossier[];
}

export interface ContactoDossier {
  nombre: string;
  telefono: string;
  rol?: string;
  nucleoId?: string;
  prioridad: number;
}

export interface CadenaContactoDossier {
  contactosPriorizados: ContactoDossier[];
  contactoEnlaceExterno?: ContactoDossier;
  codigoActivacion?: string;
  senales: string[];
}

export interface ItemSuministro {
  categoria: string;
  item: string;
  cantidad72h: string;
  cantidad2semanas: string;
  tieneActualmente: boolean;
  notas?: string;
}

export interface ListaSuministros {
  items: ItemSuministro[];
  itemsEspecificos: ItemSuministro[]; // Para bebé, mayores, etc.
  resumenFaltantes: string[];
}

export interface DossierNucleo {
  nucleoId: string;
  nombreNucleo: string;
  fechaGeneracion: string;
  analisis: AnalisisNucleo;
  roles: RolAsignado[];
  todosLosNucleos: { id: string; nombre: string; contacto: string; rol: string }[];
  cadenaContacto: CadenaContactoDossier;
  protocolos: ProtocoloEscenario[];
  suministros: ListaSuministros;
  puntosEncuentro: {
    global: { ubicacion: string; comoLlegar?: string };
    alternativo?: { ubicacion: string; comoLlegar?: string };
    subfamiliar?: { nucleos: string[]; ubicacion: string }[];
  };
  checklistDocumentos: string[];
}

export interface PlanGlobal {
  fechaGeneracion: string;
  totalNucleos: number;
  totalPersonas: number;
  mapaRoles: RolAsignado[];
  vulnerabilidadesGlobales: { nucleo: string; vulnerabilidades: Vulnerabilidad[] }[];
  recursosDisponibles: { nucleo: string; recursos: string[] }[];
  protocoloActivacion: string[];
  resumenScores: { nucleo: string; nombre: string; score: number }[];
}

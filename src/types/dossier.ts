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

export interface ItemMochila {
  item: string;
  cantidad: string;
  esencial: boolean; // must-have vs nice-to-have
  notas?: string;
}

export interface MochilaEmergencia {
  persona: string; // name of the person
  perfil: string; // "adulto" | "bebe" | "mayor" | "joven" | "mascota"
  items: ItemMochila[];
}

export interface UbicacionHabitual {
  miembro: string;
  lugarTrabajo?: string;
  lugarEstudios?: string;
  horarioHabitual?: string;
  instruccion: string; // what to do if emergency catches you there
}

export interface ProtocoloReunificacion {
  ubicacionesMiembros: UbicacionHabitual[];
  puntoReunionLocal: string; // where to meet if can't get home
  instruccionesGenerales: string[];
  instruccionesNinos: string[]; // who picks up kids from school
  planBSiNoPuedesLlegarACasa: string[];
}

export interface RutaEvacuacion {
  nombre: string; // "Ruta principal a pie", "Ruta en coche", etc.
  tipo: 'a_pie' | 'coche' | 'alternativa';
  destino: string;
  descripcion: string; // step by step directions
  tiempoEstimado: string;
  notas?: string;
}

export interface PlanEvacuacion {
  rutasDesdeHogar: RutaEvacuacion[];
  secuenciaRecogida?: { orden: number; nucleo: string; nombre: string; direccion: string; telefono: string }[];
  queLlevar: string[];
  antesDeIrte: string[];
  instruccionesEspeciales: string[];
}

export interface FaseRacionamiento {
  fase: string;
  litrosPorPersonaDia: string;
  uso: string;
  duracion: string;
}

export interface PlanAgua {
  consumoDiario: string; // calculated daily need
  reservaActual: string; // what they have
  diasAutonomia: string; // estimated days of self-sufficiency
  fasesRacionamiento: FaseRacionamiento[];
  fuentesAlternativas: string[];
  metodosPotabilizacion: string[];
  consejos: string[];
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
  mochilas: MochilaEmergencia[];
  reunificacion: ProtocoloReunificacion;
  planEvacuacion: PlanEvacuacion;
  comunicacionesDegradadas: ProtocoloComunicacionesDegradadas;
  calendarioRotacion: CalendarioRotacion;
  planAgua: PlanAgua;
  redVecinos: RedVecinos;
  pautasEmocionales: PautasEmocionales;
  infoDigital: InfoDigital;
}

export interface EjercicioSimulacro {
  nombre: string;
  escenario: string;
  descripcion: string;
  dificultad: 'basico' | 'intermedio' | 'avanzado';
  duracionEstimada: string;
  pasos: string[];
  checklistVerificacion: string[];
}

export interface PlanSimulacros {
  ejercicios: EjercicioSimulacro[];
  frecuenciaRecomendada: string;
  instruccionesCoordinador: string[];
}

export interface ItemRotacion {
  item: string;
  categoria: string;
  vidaUtil: string; // e.g., "6 meses", "1 año", "2 años"
  frecuenciaRevision: string; // e.g., "Cada 6 meses", "Anual"
  consejo: string; // tip for rotation
}

export interface CalendarioRotacion {
  items: ItemRotacion[];
  recordatoriosSemestrales: string[]; // things to check every 6 months
  instrucciones: string[];
}

export interface NivelComunicacion {
  nivel: number;
  nombre: string;
  canal: string;
  disponible: boolean; // does this nucleo have this channel?
  instrucciones: string[];
}

export interface VentanaEscucha {
  hora: string; // "En punto (XX:00)"
  duracion: string; // "5 minutos"
  canal: string; // "Canal 8 PMR446" or "Frecuencia acordada"
  protocolo: string; // what to say
}

export interface ProtocoloComunicacionesDegradadas {
  niveles: NivelComunicacion[];
  ventanasEscucha?: VentanaEscucha[];
  senalesFisicas: string[];
  instruccionesGenerales: string[];
}

export interface RedVecinos {
  tieneVecinos: boolean;
  instrucciones: string[];
  protocoloVecinal: string[];
}

export interface PautasEmocionales {
  pautasGenerales: string[];
  pautasNinos?: string[];
  pautasMayores?: string[];
  pautasAdolescentes?: string[];
  senalesAlerta: string[];
}

export interface InfoDigital {
  codigoIdentificacion: string; // unique code for the family
  instrucciones: string[];
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
  simulacros: PlanSimulacros;
}

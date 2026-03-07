import { NucleoBase } from '../types/nucleo';
import { Interconexiones } from '../types/interconexiones';
import { EjercicioSimulacro, PlanSimulacros } from '../types/dossier';

export function generarPlanSimulacros(nucleos: NucleoBase[], inter: Interconexiones): PlanSimulacros {
  const idsNucleos = nucleos.map((n) => n.id);
  const nombresNucleos = nucleos.map((n) => n.nombre);

  const puntoEncuentroGlobal = inter.puntosEncuentro.global.ubicacion;

  const secuenciaRecogida = inter.escenarios.evacuacion.secuenciaRecogida ?? [];

  // --- Ejercicio 1: Simulacro de contacto ---
  const simulacroContacto: EjercicioSimulacro = {
    nombre: 'Simulacro de contacto',
    escenario: 'contacto',
    descripcion:
      'El coordinador envía una señal de activación al grupo familiar y se mide el tiempo de respuesta de cada núcleo.',
    dificultad: 'basico',
    duracionEstimada: '15 minutos',
    pasos: [
      `El coordinador (${inter.cadenaContacto.coordinadorPrincipal}) envía el mensaje "SIMULACRO — Código AMARILLO" al grupo de comunicación familiar.`,
      ...nucleos.map(
        (n) =>
          `El núcleo ${n.nombre} (${n.id}) debe responder dentro de 15 minutos con "${n.id} recibido".`
      ),
      'El coordinador anota la hora de envío y la hora de cada respuesta.',
      'Se calcula el tiempo total hasta que todos los núcleos han respondido.',
    ],
    checklistVerificacion: [
      'Todos los núcleos respondieron en menos de 15 minutos',
      `Se recibió respuesta de cada uno de los ${nucleos.length} núcleos: ${idsNucleos.join(', ')}`,
      'Se registró el tiempo de respuesta de cada núcleo',
      'El canal de comunicación funcionó correctamente',
    ],
  };

  // --- Ejercicio 2: Simulacro de apagón ---
  const simulacroApagon: EjercicioSimulacro = {
    nombre: 'Simulacro de apagón',
    escenario: 'apagon',
    descripcion:
      'Cada núcleo simula un corte de electricidad durante 1 hora para verificar que tiene los recursos básicos localizados y operativos.',
    dificultad: 'intermedio',
    duracionEstimada: '1 hora',
    pasos: [
      'Cada núcleo corta el interruptor general de electricidad de su vivienda.',
      'Localizar las linternas y/o velas disponibles en la vivienda.',
      'Comprobar el nivel de carga de los powerbanks.',
      'Si se dispone de walkie-talkies, encenderlos y hacer una prueba de comunicación con otro núcleo.',
      'Hacer un inventario rápido de comida no perecedera y agua almacenada.',
      'Tras 1 hora, restablecer la electricidad y anotar los resultados.',
    ],
    checklistVerificacion: [
      '¿Se pudieron localizar las linternas/velas rápidamente?',
      '¿Los powerbanks estaban cargados y funcionaron?',
      '¿Los walkie-talkies funcionaron correctamente?',
      '¿Había suficiente comida no perecedera y agua para al menos 72 horas?',
      '¿Todos los miembros del núcleo sabían dónde estaban los recursos?',
    ],
  };

  // --- Ejercicio 3: Simulacro de evacuación ---
  const pasosEvacuacion: string[] = [
    'Cada núcleo prepara sus mochilas de emergencia (bug-out bags) con lo esencial.',
    'Subir al vehículo con todos los miembros del núcleo y las mochilas.',
  ];
  if (secuenciaRecogida.length > 0) {
    pasosEvacuacion.push(
      `Seguir la secuencia de recogida establecida: ${secuenciaRecogida.join(' → ')}.`
    );
  }
  pasosEvacuacion.push(
    `Conducir hasta el punto de encuentro global: ${puntoEncuentroGlobal}.`,
    'Al llegar, hacer recuento de todas las personas presentes.',
    'Verificar que cada núcleo tiene su mochila de emergencia completa.',
    'Anotar el tiempo total desde la señal de inicio hasta el recuento final.'
  );

  const simulacroEvacuacion: EjercicioSimulacro = {
    nombre: 'Simulacro de evacuación',
    escenario: 'evacuacion',
    descripcion:
      'Todos los núcleos preparan sus mochilas de emergencia, siguen la secuencia de evacuación y se reúnen en el punto de encuentro global.',
    dificultad: 'avanzado',
    duracionEstimada: '2-3 horas',
    pasos: pasosEvacuacion,
    checklistVerificacion: [
      '¿Cuánto tiempo tardó cada núcleo en estar listo para salir?',
      '¿Todos los miembros tenían su mochila de emergencia preparada?',
      '¿La ruta hasta el punto de encuentro estaba despejada y era viable?',
      `¿Todos los núcleos llegaron al punto de encuentro (${puntoEncuentroGlobal})?`,
      '¿El recuento final coincide con el número total de personas esperadas?',
      '¿Se completó todo el ejercicio en menos de 3 horas?',
    ],
  };

  // --- Ejercicio 4: Simulacro de reunificación ---
  const simulacroReunificacion: EjercicioSimulacro = {
    nombre: 'Simulacro de reunificación',
    escenario: 'reunificacion',
    descripcion:
      'En un día laborable normal, el coordinador envía una alerta y cada miembro reporta su ubicación para verificar el plan de reunificación.',
    dificultad: 'intermedio',
    duracionEstimada: '1 hora',
    pasos: [
      `El coordinador (${inter.cadenaContacto.coordinadorPrincipal}) envía una alerta de simulacro en un día laborable normal.`,
      'Cada miembro de cada núcleo responde con su ubicación actual (trabajo, colegio, casa, etc.).',
      'Se verifica quién recoge a los niños del colegio o guardería según el plan establecido.',
      'Cada núcleo confirma su plan B en caso de no poder llegar a casa.',
      'Se revisa si hay algún miembro que no respondió y se activa el protocolo de contacto alternativo.',
    ],
    checklistVerificacion: [
      '¿Todos los miembros de todos los núcleos respondieron a la alerta?',
      '¿Quedó claro quién recoge a los niños en caso de emergencia real?',
      '¿Cada núcleo tiene un plan B definido si no puede llegar a su vivienda?',
      '¿Los tiempos de respuesta fueron razonables (menos de 30 minutos)?',
      '¿Se identificaron miembros difíciles de contactar y se buscó una solución?',
    ],
  };

  const ejercicios: EjercicioSimulacro[] = [
    simulacroContacto,
    simulacroApagon,
    simulacroEvacuacion,
    simulacroReunificacion,
  ];

  return {
    ejercicios,
    frecuenciaRecomendada: 'Simulacro de contacto: cada 3 meses. Simulacro completo: cada 6 meses.',
    instruccionesCoordinador: [
      'Avisa a todos los núcleos con 1 semana de antelación (excepto simulacro de contacto)',
      'Anota los tiempos de respuesta y los problemas detectados',
      'Después del simulacro, haz una reunión de 15 minutos para comentar qué salió bien y qué hay que mejorar',
      'Actualiza el plan con las lecciones aprendidas',
    ],
  };
}

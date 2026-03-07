import { NucleoBase } from '../types/nucleo';
import { PautasEmocionales } from '../types/dossier';

export function generarPautasEmocionales(nucleo: NucleoBase): PautasEmocionales {
  const pautasGenerales: string[] = [
    'Mantener la calma es contagioso. Si tú estás sereno, los demás lo estarán.',
    'Informa con honestidad pero sin alarmar. Di lo que sabes y lo que no sabes.',
    'Mantén rutinas: comer a las mismas horas, dormir a las mismas horas. La rutina da sensación de control.',
    'Reparte tareas a todos los miembros. Estar ocupado reduce la ansiedad.',
    "Permite expresar el miedo. No digas 'no pasa nada' si sí pasa. Di 'estamos juntos y tenemos un plan'.",
    'Si alguien entra en pánico: contacto visual, voz calmada, respiración lenta juntos.',
    'Limita la exposición a noticias. Infórmate 2 veces al día, no cada 5 minutos.',
  ];

  const tieneNinos = nucleo.miembros.some(m => m.edad < 12) || nucleo.modulosAdicionales?.includes('bebe');
  let pautasNinos: string[] | undefined;
  if (tieneNinos) {
    pautasNinos = [
      'Explica la situación con palabras simples y adaptadas a su edad.',
      'Deja que hagan preguntas y responde con honestidad.',
      'Mantén sus objetos de apego cerca (peluche, manta, chupete).',
      "Inventa juegos con las tareas de supervivencia: 'vamos a jugar a acampar'.",
      'Si hay oscuridad (apagón), quédate cerca de ellos. El miedo a la oscuridad se amplifica en emergencias.',
      'Los niños reaccionan al estrés de los adultos. Si tú estás bien, ellos lo notan.',
    ];
  }

  let pautasMayores: string[] | undefined;
  if (nucleo.modulosAdicionales?.includes('mayores')) {
    pautasMayores = [
      'Explica lo que pasa con paciencia. Repite si es necesario.',
      'Si hay deterioro cognitivo, mantén la calma aunque haya que repetir las instrucciones.',
      'Asegura que se sienten útiles: vigilar, clasificar suministros, contar historias a los niños.',
      'Vigilar especialmente: desorientación, agitación, negativa a comer/beber.',
      'No subestimes su experiencia. Muchas personas mayores han vivido emergencias antes.',
    ];
  }

  let pautasAdolescentes: string[] | undefined;
  if (nucleo.modulosAdicionales?.includes('jovenes')) {
    pautasAdolescentes = [
      'Dales responsabilidades reales. Son capaces y necesitan sentirse útiles, no tratados como niños.',
      'Permite que mantengan contacto con amigos si es posible. Su red social es importante para ellos.',
      'Si se aíslan o se muestran irritables, es normal. Dale espacio pero mantén el contacto.',
      'Son los mejores aliados tecnológicos: deja que gestionen comunicaciones, carguen dispositivos, etc.',
    ];
  }

  const senalesAlerta: string[] = [
    'Persona que no come ni bebe durante más de 24 horas',
    'Llanto incontrolable o apatía total prolongada',
    'Agresividad inusual o aislamiento extremo',
    'En niños: regresión (vuelven a mojar la cama, no hablan, no se separan del adulto)',
    "Persona que habla de hacerse daño o que 'no merece la pena'",
    'Si detectas estas señales, no dejes sola a la persona. Busca ayuda profesional en cuanto sea posible.',
  ];

  return {
    pautasGenerales,
    pautasNinos,
    pautasMayores,
    pautasAdolescentes,
    senalesAlerta,
  };
}

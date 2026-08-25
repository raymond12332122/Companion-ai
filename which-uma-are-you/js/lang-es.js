/* ==========================================================================
   Which Uma Are You? — Spanish (es) content

   This file is a *presentation-layer overlay*. English remains the single
   source of truth in questions.js and characters.js (both protected, both
   untouched); this file only supplies Spanish equivalents keyed by the
   same question index / character id, and js/i18n.js falls back to the
   English original whenever a key is missing here.

   Nothing in this file is ever read by matching.js — scoring uses only
   `weights` and `personalityProfile`, which are numbers living in the
   protected files. Translating text therefore cannot change anyone's
   result.

   Character names are deliberately NOT translated: they're proper nouns
   and are the same in both languages.
   ========================================================================== */

export const ES = {
  ui: {
    /* --- document titles --- */
    titleHome: 'Which Uma Are You? — Test de Personalidad',
    titleQuiz: 'Which Uma Are You? — Test',
    titleResults: 'Which Uma Are You? — Tu Resultado',

    /* --- landing --- */
    heroBadge: '🏇 Test de personalidad fan',
    heroTitle: '¿Qué Uma<br />Eres Tú?',
    heroBlurb:
      'Responde 25 preguntas rápidas sobre cómo compites, entrenas y tratas a tus rivales, y te emparejamos con la chica caballo cuyo corazón corre más cerca del tuyo.',
    metaQuestions: '<strong>25</strong> Preguntas',
    metaTime: '<strong>~4</strong> min',
    metaChars: '<strong>26</strong> Personajes',
    startBtn: 'Comenzar la Carrera →',
    ideaLink: '💡 Dame una idea',
    homeFooter:
      'Proyecto hecho por fans. Solo personajes, nombres e interpretaciones de personalidad originales — no se usa arte oficial ni material con derechos de autor.',

    /* --- quiz --- */
    exitQuiz: '← Salir del test',
    questionLabel: 'PREGUNTA',
    prevBtn: '← Anterior',
    nextBtn: 'Siguiente →',
    seeResults: 'Ver Resultados →',

    /* --- results --- */
    backHome: '← Volver al inicio',
    yourMatch: '🏆 Tu Coincidencia',
    youAre: 'Tú Eres',
    matchLabel: 'Afinidad',
    sectionStats: 'Estadísticas de Carrera',
    sectionAnalysis: 'Análisis de Carrera',
    sectionField: 'El Resto del Pelotón',
    profileTab: 'PERFIL',
    strengths: 'Fortalezas',
    weaknesses: 'Debilidades',
    retakeBtn: 'Repetir el Test',
    ideaLinkResults: '💡 ¿Tienes una idea para el test?',
    resultsFooter:
      'Los resultados son una aproximación divertida basada en tus respuestas, no una medición oficial ni científica.',

    /* --- results empty state --- */
    emptyBadge: '⚠️ No Hay Respuestas',
    emptyTitle: '¡Haz el test primero!',
    emptyBody:
      'No encontramos respuestas guardadas. Comienza el test para obtener tu resultado.',
    emptyBtn: 'Comenzar Test'
  },

  traits: {
    Determination: 'Determinación',
    Kindness: 'Amabilidad',
    Confidence: 'Confianza',
    Competitiveness: 'Competitividad',
    Discipline: 'Disciplina',
    Chaos: 'Caos',
    Optimism: 'Optimismo'
  },

  /* Indexed to match QUESTIONS in questions.js, in order. `a` is indexed
     to match that question's `answers` array. */
  questions: [
    {
      q: 'Acabas de perder una carrera importante. ¿Qué haces?',
      a: [
        'Empiezas de inmediato a planear cómo entrenar más duro para la próxima.',
        'Consuelas a tu rival, que también está decepcionada.',
        'Le dices a todas que la próxima vez vas a arrasar.',
        'Ya la estás convirtiendo en una historia legendaria: las mejores derrotas dan los mejores relatos.'
      ]
    },
    {
      q: 'Tu entrenador te da un plan de entrenamiento nuevo y estricto. ¿Tu reacción?',
      a: [
        'Lo sigues al pie de la letra, sin excusas.',
        'Preguntas si puedes agregarle retos divertidos.',
        'Intentas convencerlo de hacerlo más intenso.',
        'Lo modificas para que encaje con lo que sientes correcto para ti.'
      ]
    },
    {
      q: 'Una compañera de equipo la está pasando mal antes de una gran carrera. Tú:',
      a: [
        'Le das un discurso de ánimo sobre creer en sí misma.',
        'Te sientas con ella y simplemente escuchas.',
        'Le recuerdas que para esto entrenó.',
        'Sueltas un chiste para aligerar el ambiente.'
      ]
    },
    {
      q: 'Es día de carrera. ¿Cómo te sientes?',
      a: [
        'Concentrada y lista para darlo todo.',
        '¡Emocionada de ver a todas dar lo mejor de sí!',
        'Segura de que voy a ganar.',
        'Ya me imagino exactamente cómo voy a vencer a mis rivales.'
      ]
    },
    {
      q: 'Ves a una rival a punto de rebasarte en la recta final.',
      a: [
        'Aprietas más: te niegas a dejarla pasar.',
        'La animas incluso mientras corres.',
        'Confías en tu entrenamiento y mantienes el ritmo.',
        'Intentas algo impredecible para desconcertarla.'
      ]
    },
    {
      q: 'Día libre, sin entrenamiento. ¿Qué haces?',
      a: [
        'Lo aprovechas para estudiar videos de carreras igual.',
        'Sales por ahí y te pones al día con tus amigas.',
        'Haces algo espontáneo y divertido.',
        'Descansas y te mantienes positiva sobre mañana.'
      ]
    },
    {
      q: '¿Cómo manejas las críticas?',
      a: [
        'Las tomas en serio y las usas para mejorar.',
        'Duelen, pero me recupero rápido.',
        'Las ignoro: sé de lo que soy capaz.',
        'Depende de mi humor, honestamente.'
      ]
    },
    {
      q: '¿Cuál es tu rol en el equipo?',
      a: [
        'La confiable que siempre está presente.',
        'El corazón que mantiene a todas unidas.',
        'La que empuja a todas a ser mejores.',
        'La impredecible que mantiene todo interesante.'
      ]
    },
    {
      q: 'Alguien duda de que puedas ganar. ¿Tu respuesta?',
      a: [
        'Le demostraré lo contrario con trabajo duro.',
        'Está bien, cada quien tiene derecho a su opinión.',
        'Mírame.',
        'Ni idea de lo que va a pasar, y eso es justo lo que lo hace divertido.'
      ]
    },
    {
      q: '¡Gran victoria! ¿Cómo lo celebras?',
      a: [
        'Piensas de inmediato en el siguiente reto.',
        'Agradeces a todas las que te ayudaron a llegar.',
        'Disfrutas el momento: te lo ganaste.',
        'Armas una fiesta improvisada.'
      ]
    },
    {
      q: 'Tu compañera de entrenamiento te lleva muchísima ventaja en habilidad. Tú:',
      a: [
        'Entrenas aún más duro para alcanzarla.',
        'Le pides consejos: te encanta aprender.',
        'Lo ves como motivación para demostrar que eres igual de buena.',
        'No te preocupas: llegarás a tu manera.'
      ]
    },
    {
      q: '¿Cómo te preparas la noche antes de una carrera?',
      a: [
        'Sigues tu rutina exacta.',
        'Descansas y te mantienes en calma.',
        'Te visualizas cruzando la meta en primer lugar.',
        'Pase lo que pase, pasará: no le das tantas vueltas.'
      ]
    },
    {
      q: 'Una amiga necesita ayuda, pero en un momento inoportuno. Tú:',
      a: [
        'La ayudas igual: ella importa más.',
        'Buscas una forma rápida de ayudar sin perder el ritmo.',
        'Lo conviertes en una distracción divertida para las dos.',
        'La ayudas, y en silencio lo conviertes en un reto personal: resolverlo más rápido de lo que nadie esperaba.'
      ]
    },
    {
      q: '¿Qué te motiva más?',
      a: [
        'Convertirme en la mejor versión de mí misma.',
        'Hacer felices a las personas a mi alrededor.',
        'Ganar. Así de simple.',
        'Simplemente disfrutar el camino.'
      ]
    },
    {
      q: 'Describe tu carrera ideal.',
      a: [
        'Una dura que ponga a prueba todo lo que he entrenado.',
        'Una donde todas se diviertan y den lo mejor de sí.',
        'Una donde yo sea claramente la estrella.',
        'Impredecible, caótica y emocionante.'
      ]
    },
    {
      q: 'Te toca enfrentarte a tu mayor rival en un duelo directo. ¿Qué te pasa por la cabeza de verdad?',
      a: [
        'Este es exactamente el duelo para el que he estado entrenando.',
        'Solo quiero que las dos nos vayamos orgullosas de cómo corrimos.',
        'Ya sé cómo termina esto.',
        'Veamos qué pasa: los planes están sobrevalorados.'
      ]
    },
    {
      q: 'Tu mejor amiga acaba de recibir una noticia enorme, buenísima o pésima, da igual cuál. ¿Lo primero que haces?',
      a: [
        'Dejas todo y vas a estar con ella en persona.',
        'La animas (o la calmas) con total seguridad.',
        'Empiezas de inmediato a resolver o a planear los siguientes pasos con ella.',
        'Te mantienes optimista y le recuerdas que todo saldrá bien, sea cual sea la noticia.'
      ]
    },
    {
      q: 'Fracasas en algo que de verdad te importaba, y feo. Una semana después, estás...',
      a: [
        'Metida de lleno en un nuevo plan de entrenamiento para que no vuelva a pasar.',
        'Casi superándolo. A seguir.',
        'Contando la historia como si ya fuera una anécdota graciosa.',
        'Todavía algo dolida, pero usándolo como combustible.'
      ]
    },
    {
      q: 'Los planes del día se cayeron sin ningún aviso. ¿Tu reacción?',
      a: [
        'Empiezas de inmediato a armar un plan de respaldo.',
        'Hasta emocionante, la verdad: a improvisar.',
        'Revisas cómo están las demás afectadas antes de preocuparte por ti.',
        'Lo tomas como un reto que de algún modo aún puedes ganar.'
      ]
    },
    {
      q: '¿Cómo piensas realmente en las metas a largo plazo?',
      a: [
        'Plan detallado, hitos claros, sin saltarse pasos.',
        'Sé la dirección general y ajusto sobre la marcha.',
        'Las metas son solo derechos a presumir esperando su turno.',
        'Ser un poco mejor que ayer. Y sí, ganarle a todas también.'
      ]
    },
    {
      q: 'Se te viene encima una fecha límite grande. ¿Tu forma real de trabajar ahora mismo?',
      a: [
        'Concentrada al máximo. Horario estructurado, cero distracciones.',
        'Avanzando a pura terquedad hasta terminar.',
        'De algún modo, haciendo mi mejor trabajo a último minuto.',
        'Tomando pausas para ayudar a otras con lo suyo antes de terminar lo mío.'
      ]
    },
    {
      q: 'Tienes una decisión realmente difícil: dos buenas opciones. ¿Cómo decides de verdad?',
      a: [
        'Lista de pros y contras. Varios borradores.',
        'Sigues tu instinto y no miras atrás.',
        'Preguntas a toda la gente en la que confías qué haría.',
        'Básicamente lanzas una moneda: lo harás funcionar de cualquier forma.'
      ]
    },
    {
      q: 'Tú y alguien a quien respetas están en total desacuerdo sobre algo que sí importa. ¿Y ahora?',
      a: [
        'Expones tu postura con claridad y no te mueves.',
        'Buscas la versión donde ambas tienen algo de razón.',
        'Te plantas: no cedes solo por mantener la paz.',
        '¿Honestamente? Probablemente lo dejo pasar y sigo adelante.'
      ]
    },
    {
      q: 'Una tarde completamente libre, cero obligaciones. ¿Qué pasa en realidad?',
      a: [
        'Probablemente termino haciendo algo productivo igual.',
        'Lo que sea que hagan mis amigas, me apunto.',
        'Algo un poco imprudente, ojalá con una buena historia después.',
        'Videojuegos competitivos, deportes, literalmente cualquier cosa con marcador.'
      ]
    },
    {
      q: 'Alguien te reta a hacer algo que de verdad no estás segura de poder lograr. ¿Reacción instintiva?',
      a: [
        'Ya estoy dentro. El cómo lo resuelvo después.',
        'Hagámoslo: suena divertido sin importar el resultado.',
        'Por supuesto. Y ahora tengo que ser la mejor en eso también.',
        'Hablemos primero de logística: quiero un plan real antes de decir que sí.'
      ]
    }
  ],

  /* Keyed by character id in characters.js. `name` is intentionally absent
     everywhere -- proper nouns stay identical in both languages. */
  characters: {
    'special-week': {
      tagline: 'La entusiasta radiante de gran corazón.',
      summary:
        'Cálida, incansablemente animada y genuinamente feliz de ver triunfar a las demás. Entrena duro porque le encanta, no porque tenga que hacerlo.',
      strengths: [
        'Levanta el ánimo de todas a su alrededor',
        'Se recupera rápido de los tropiezos',
        'Entusiasmo genuino y contagioso'
      ],
      weaknesses: [
        'Puede tomarse las críticas de forma personal',
        'A veces intenta hacer demasiado a la vez',
        'Le cuesta decir que no a quien la necesita'
      ],
      raceStrategy:
        'Corre como si cada zancada fuera una nota de agradecimiento a quienes creyeron en ella: esfuerzo total, al frente y sin guardarse nada.'
    },
    'silence-suzuka': {
      tagline: 'La líder silenciosa que nunca mira atrás.',
      summary:
        'Constante, reservada y enfocada como un láser en la meta. No necesita los reflectores: necesita la pista despejada por delante.',
      strengths: [
        'Concentración inquebrantable bajo presión',
        'Ritmo constante y confiable',
        'No se altera por sus rivales'
      ],
      weaknesses: [
        'Puede parecer distante o difícil de leer',
        'Rara vez pide ayuda',
        'Le incomoda depender de un plan de remontada'
      ],
      raceStrategy:
        'Toma la delantera temprano y desafía al resto del pelotón a alcanzarla: si va adelante, piensa quedarse ahí, en silencio, todo el camino.'
    },
    'tokai-teio': {
      tagline: 'La competidora feroz que se niega a rendirse.',
      summary:
        'Audaz, decidida y alérgica a darse por vencida. Los tropiezos no la desaniman: son simplemente lo siguiente que hay que superar.',
      strengths: [
        'Se niega a que la descarten',
        'Convierte los tropiezos en remontadas',
        'Inspira a sus compañeras con el ejemplo'
      ],
      weaknesses: [
        'Puede exigirse más allá de límites sanos',
        'Le cuesta aceptar ayuda a mitad de una remontada',
        'Las derrotas le duelen más de lo que demuestra'
      ],
      raceStrategy:
        'Aguanta su posición dentro del grupo y luego lo da todo en la recta final: el tipo de cierre que hace que quienes la descartaron se arrepientan.'
    },
    'gold-ship': {
      tagline: 'La comodín impredecible.',
      summary:
        'Ruidosa, caótica y extrañamente segura de que todo va a salir bien. Las reglas son más bien una sugerencia, y de algún modo eso juega a su favor.',
      strengths: [
        'Florece en el caos y la presión',
        'Genuinamente sin miedo a reglas ni expectativas',
        'Mantiene el ambiente ligero incluso cuando hay mucho en juego'
      ],
      weaknesses: [
        'Se salta preparación que probablemente necesitaba',
        'Impredecible, incluso para sí misma',
        'Difícil de considerar en los planes del equipo'
      ],
      raceStrategy:
        'No tiene una estrategia consistente, y de algún modo esa es la estrategia: a fondo, puro instinto, y el resto se resuelve en la recta.'
    },
    'haru-urara': {
      tagline: 'La optimista eterna que nunca deja de intentarlo.',
      summary:
        'Amable hasta el exceso e imposible de desanimar. Ganar le importa menos que presentarse e intentarlo con todo el corazón.',
      strengths: [
        'Nunca se desanima de verdad por las derrotas',
        'Hace que todas a su alrededor se sientan bienvenidas',
        'Vuelve a intentarlo sin rencor ni ego'
      ],
      weaknesses: [
        'Le cuesta defenderse competitivamente',
        'Puede ser subestimada, incluso por ella misma',
        'Rara vez prioriza su propio reconocimiento'
      ],
      raceStrategy:
        'Corre cada carrera como si fuera la mejor hasta ahora, sin importar las probabilidades: la meta importa menos que demostrar que se presentó y lo dio todo.'
    },
    'meisho-doto': {
      tagline: 'La táctica disciplinada.',
      summary:
        'Metódica, aguda y siempre pensando dos pasos adelante. Confía en la preparación por encima de la suerte, siempre.',
      strengths: [
        'Se prepara meticulosamente para cada escenario',
        'Lee bien las carreras y las situaciones',
        'Rara vez la toman por sorpresa'
      ],
      weaknesses: [
        'Puede ser inflexible cuando los planes fallan',
        'Piensa de más bajo presión de tiempo',
        'Tarda en confiar en la improvisación, incluso cuando hace falta'
      ],
      raceStrategy:
        'Estudia el pelotón de antemano y corre el plan, no el momento: posicionamiento preciso, movimientos calculados, mínimo esfuerzo desperdiciado.'
    },
    'mejiro-mcqueen': {
      tagline: 'La aristócrata elegante que jamás pierde la compostura.',
      summary:
        'Serena, correcta y silenciosamente formidable. Se comporta como la realeza porque, en todo lo que le importa, lo es: gracia y temple a partes iguales.',
      strengths: [
        'Serena bajo cualquier presión',
        'Establece un estándar al que otras aspiran',
        'Convierte la disciplina en una excelencia que parece sin esfuerzo'
      ],
      weaknesses: [
        'Le cuesta relajarse o improvisar',
        'Puede parecer inaccesible',
        'Se toma la etiqueta más en serio de lo que la mayoría de las situaciones requiere'
      ],
      raceStrategy:
        'Corre con una forma impecable desde la salida hasta la meta: sin movimientos desperdiciados, sin dramatismos, solo precisión elegante e implacable.'
    },
    'symboli-rudolf': {
      tagline: 'La líder digna con presencia de emperatriz.',
      summary:
        'Impone sin necesidad de alzar la voz. Donde ella está se convierte en el centro de la sala, y carga ese peso como si siempre le hubiera correspondido.',
      strengths: [
        'Autoridad natural, sin forzar',
        'Nunca alterada, nunca apurada',
        'Se gana el respeto en lugar de exigirlo'
      ],
      weaknesses: [
        'Pone un listón intimidantemente alto para las demás',
        'Rara vez muestra vulnerabilidad, aun cuando ayudaría',
        'Puede parecer distante o inalcanzable'
      ],
      raceStrategy:
        'Controla el ritmo desde el frente como si fuera simplemente el orden natural de las cosas: tranquila, imponente, indiscutida.'
    },
    'air-groove': {
      tagline: 'La hermana mayor serena que todas quisieran tener.',
      summary:
        'Cálida pero inquebrantable: esa presencia estable que hace que todas a su alrededor sientan que todo va a estar bien, porque claramente ella lo tiene bajo control.',
      strengths: [
        'Mantiene la calma cuando las demás la pierden',
        'Genuinamente comprometida con la gente a su alrededor',
        'Lidera con el ejemplo callado, no con órdenes'
      ],
      weaknesses: [
        'Pone las necesidades ajenas antes que las suyas demasiado seguido',
        'Tarda en pedir apoyo para sí misma',
        'Puede reprimir su propio estrés para mantener a las demás en calma'
      ],
      raceStrategy:
        'Dosifica su ritmo como si ya tuviera toda la carrera trazada: medida, controlada y demoledora en la recta final.'
    },
    vodka: {
      tagline: 'La rival ardiente que nunca da un paso atrás.',
      summary:
        'Directa, intensa y alérgica a perder con elegancia. No hace rivalidades silenciosas: si te interpones, quiere que sepas exactamente cómo se siente al respecto.',
      strengths: [
        'Puro fuego en los duelos directos',
        'Dice lo que piensa, sin juegos',
        'Convierte el ser subestimada en combustible'
      ],
      weaknesses: [
        'Su temperamento estalla más rápido de lo que le gustaría admitir',
        'Le cuesta soltar un rencor',
        'Puede quemar puentes que no pretendía quemar'
      ],
      raceStrategy:
        'Se fija en quien va delante y se niega a dejarla sentirse cómoda ni un solo segundo de la carrera.'
    },
    'daiwa-scarlet': {
      tagline: 'La orgullosa acaparadora de escena que corre como si fuera un espectáculo.',
      summary:
        'Glamorosa, segura de sí misma y plenamente consciente de los reflectores, porque piensa estar parada bajo ellos. Ganar está bien; ganar con belleza es el verdadero objetivo.',
      strengths: [
        'Convierte la presión en un escenario donde brilla',
        'Fe inquebrantable en su propio talento',
        'Hace que incluso las victorias peleadas parezcan sencillas'
      ],
      weaknesses: [
        'Prioriza verse bien por encima de ir a lo seguro',
        'Puede ser desdeñosa con quien dude de ella',
        'Le cuesta aceptar una victoria que no fue vistosa'
      ],
      raceStrategy:
        'Se guarda lo justo para poner nervioso al público y luego cierra con un floreo hecho para el resumen de highlights.'
    },
    'grass-wonder': {
      tagline: 'La gentil cuya resolución silenciosa supera todas las expectativas.',
      summary:
        'De voz suave y fácil de subestimar, que es justo el error que la gente comete justo antes de que demuestre, con calma y sin alardes, exactamente de lo que es capaz.',
      strengths: [
        'Esfuerzo constante que nunca flaquea, aunque nadie lo note',
        'Genuina y sencillamente amable',
        'No necesita reconocimiento para seguir intentándolo'
      ],
      weaknesses: [
        'Rara vez se defiende a sí misma',
        'Puede pasar desapercibida o ser interrumpida',
        'Evita el conflicto incluso cuando no debería'
      ],
      raceStrategy:
        'Se mantiene calladamente a distancia de ataque todo el camino y luego cierra la brecha con tal suavidad que nadie lo nota hasta que ya está hecho.'
    },
    'mayano-top-gun': {
      tagline: 'La entusiasta ruidosa y salvaje que siempre está viviendo el mejor día de su vida.',
      summary:
        'Emoción pura y sin filtro, con piernas. Se lanza a todo a máximo volumen y, de algún modo, esa energía es lo bastante contagiosa como para arrastrar a todo el equipo con ella.',
      strengths: [
        'Entusiasmo genuino y contagioso',
        'Nunca demasiado cool como para gritar más fuerte',
        'Convierte los nervios en emoción en lugar de miedo'
      ],
      weaknesses: [
        'Rara vez piensa dos pasos adelante',
        'Su energía puede abrumar a las compañeras más calladas',
        'Le cuesta quedarse quieta durante las partes aburridas de la preparación'
      ],
      raceStrategy:
        'Esprinta como si la carrera fuera una fiesta que está decidida a ganar: ráfagas caóticas de velocidad, cero conservación de energía, máximo entusiasmo.'
    },
    'rice-shower': {
      tagline: 'La trabajadora humilde que nunca acaba de creer en sí misma, y por eso trabaja el doble.',
      summary:
        'Convencida de que es la desfavorecida incluso cuando no lo es. No entrena duro para demostrarle a nadie que se equivoca: entrena duro porque, en el fondo, no está segura de merecer ganar de otro modo.',
      strengths: [
        'Trabaja más que nadie sin quejarse',
        'Genuinamente humilde, nunca presumida',
        'Maneja la decepción sin derrumbarse'
      ],
      weaknesses: [
        'No cree en sus propios resultados',
        'Minimiza sus victorias hasta el exceso',
        'Asume lo peor sobre sus posibilidades por defecto'
      ],
      raceStrategy:
        'Pelea cada zancada como si tuviera algo que demostrar, porque en su propia cabeza siempre lo tiene.'
    },
    'agnes-tachyon': {
      tagline: 'La genio excéntrica que entrena según sus propias teorías poco convencionales.',
      summary:
        'Brillante, intensa y un poquito en otra parte mentalmente, a media ecuación sobre una idea que la mayoría aún no alcanza. Sus métodos son extraños. También suelen funcionar.',
      strengths: [
        'Ve patrones y ángulos que las demás pasan por alto por completo',
        'Pensamiento genuinamente original bajo presión',
        'Incansablemente curiosa y automotivada'
      ],
      weaknesses: [
        'Sus explicaciones a menudo solo tienen sentido para ella',
        'Puede pasar por alto señales sociales obvias cuando está concentrada',
        'Confía en sus teorías por encima del consejo convencional, a veces demasiado'
      ],
      raceStrategy:
        'Corre la carrera según una fórmula personal que nadie más entiende y, de algún modo, más seguido de lo que debería, las cuentas le cuadran.'
    },
    'oguri-cap': {
      tagline: 'La as misteriosa que salió de la nada y se quedó tan tranquila.',
      summary:
        'Serena, poco convencional y difícil de leer. No tomó el camino esperado para llegar aquí, y no tiene prisa por explicarse: los resultados terminan hablando por sí solos.',
      strengths: [
        'Florece fuera de las expectativas convencionales',
        'No le afectan las dudas ni un mal comienzo',
        'Responde cuando más importa, en silencio'
      ],
      weaknesses: [
        'Mantiene a la gente a distancia',
        'Su preparación poco convencional puede parecer falta de esfuerzo',
        'Rara vez se explica, aun cuando ayudaría'
      ],
      raceStrategy:
        'Toma una ruta poco ortodoxa entre el pelotón que parece un error hasta el momento exacto en que deja de serlo.'
    },
    'mihono-bourbon': {
      tagline: 'La perfeccionista obsesiva que nunca se permite descansar.',
      summary:
        'Encerrada en un estándar imposiblemente exigente de su propia creación. Cada sesión se mide, se registra y nunca es del todo suficiente: no busca la aprobación de nadie más, solo la suya.',
      strengths: [
        'Ética de trabajo inigualable',
        'Nunca toma atajos, jamás',
        'Se exige un estándar que nadie más podría imponerle'
      ],
      weaknesses: [
        'No sabe cómo bajar el ritmo',
        'Le cuesta aceptar elogios o descanso',
        'Se aísla bajo el peso de sus propias expectativas'
      ],
      raceStrategy:
        'Ejecuta al segundo un plan pulido en el entrenamiento: sin adornos, sin desviaciones, solo precisión implacable y exacta.'
    },
    'nice-nature': {
      tagline: 'La bonachona eterna subcampeona que jamás se ha amargado por ello.',
      summary:
        'Segundo lugar, otra vez, y de algún modo completamente en paz con eso. Se presenta, da un esfuerzo honesto y está genuina y sencillamente feliz de ver a otra llevarse la victoria.',
      strengths: [
        'Buena perdedora sin esfuerzo',
        'Nunca deja que una derrota le arruine el ánimo',
        'Hace que todas a su alrededor se sientan cómodas'
      ],
      weaknesses: [
        'Rara vez se exige más allá de lo "suficientemente bueno"',
        'Puede conformarse demasiado fácil con el casi',
        'No defiende lo que realmente quiere'
      ],
      raceStrategy:
        'Corre una carrera perfectamente agradable, termina cerca pero no primera, y ya está animando a la ganadora antes de cruzar la meta ella misma.'
    },
    'sakura-bakushin-o': {
      tagline: 'La velocista escandalosa con energía de protagonista y pulmones a la altura.',
      summary:
        'Ruidosa, encantada de estar aquí y absolutamente convencida de que está a punto de ganar, a todo volumen, todo el tiempo. Su entusiasmo no es una estrategia, es simplemente quien es en cada momento posible.',
      strengths: [
        'Energía explosiva y contagiosa',
        'Genuinamente sin miedo a los momentos grandes',
        'Nunca se conforma calladamente con el segundo lugar'
      ],
      weaknesses: [
        'Alcanza su pico con fuerza y se apaga rápido',
        'Le cuesta cualquier cosa lenta o paciente',
        'A veces el volumen sustituye a un plan'
      ],
      raceStrategy:
        'No se guarda nada desde el estallido inicial: pura energía de esprint, todo al principio y sin disculpas, apostándolo todo a la explosión.'
    },
    'twin-turbo': {
      tagline: 'La autoproclamada demonio de la velocidad que ya le está poniendo nombre a su movimiento especial.',
      summary:
        'Convencida de que es lo más genial y veloz de la pista, y ruidosa al respecto de la forma más entrañable posible. La realidad no siempre está de acuerdo, pero su compromiso con el personaje nunca flaquea.',
      strengths: [
        'Entusiasmo inquebrantable por su propio hype',
        'Convierte hasta una derrota en una buena historia',
        'Nunca es aburrido estar con ella'
      ],
      weaknesses: [
        'El estilo supera con frecuencia a la sustancia',
        'Se salta la preparación a favor de la vibra',
        'Sobrestima qué tan bien está funcionando el personaje'
      ],
      raceStrategy:
        'Anuncia de antemano y con detalle exactamente cómo va a ganar, y luego improvisa algo completamente distinto en cuanto se abre la puerta.'
    },
    'winning-ticket': {
      tagline: 'La apostadora despreocupada que está bastante segura de que saldrá bien.',
      summary:
        'No se estresa, no planea de más, y no le ve mucho sentido a ninguna de las dos cosas. Victorias y derrotas le resbalan igual: está aquí por la diversión y, en general, eso le basta de verdad.',
      strengths: [
        'Imposible de alterar',
        'Nunca trae presión innecesaria a una sala',
        'Disfruta el proceso sin importar el resultado'
      ],
      weaknesses: [
        'Rara vez se prepara más allá de "ya veremos"',
        'Puede dar la impresión de que no le importa nada',
        'Deja los resultados casi por completo al azar'
      ],
      raceStrategy:
        'Se presenta, elige el carril que le late en el momento y deja que la carrera se resuelva sola a partir de ahí.'
    },
    maruzensky: {
      tagline: 'El talento natural dominante que no necesita dar explicaciones.',
      summary:
        'Simplemente, abrumadoramente buena, y no particularmente interesada en suavizar ese hecho para la comodidad de nadie. No posa ni provoca: los resultados ya dicen todo lo que se molestaría en decir.',
      strengths: [
        'Un talento que habla enteramente por sí solo',
        'Completamente indiferente a las dudas',
        'Responde sin necesidad de hype ni preámbulo'
      ],
      weaknesses: [
        'Directa hasta el punto de resultar distante',
        'Poca paciencia con quienes necesitan aliento',
        'Rara vez le explica su razonamiento a nadie'
      ],
      raceStrategy:
        'Corre como si el resultado estuviera decidido antes de abrirse la puerta: sin esfuerzo desperdiciado, sin dramatismos, solo una superioridad abrumadora y natural.'
    },
    'taiki-shuttle': {
      tagline: 'La trotamundos carismática que hace que cualquier lugar se sienta como casa.',
      summary:
        'Cálida, viajada y genuinamente entusiasmada con la idea de demostrar lo que vale en cualquier parte, contra quien sea. Colecciona rivales como recuerdos y de algún modo se queda amiga de todas.',
      strengths: [
        'Encantadora sin esfuerzo ante cualquier público',
        'Florece específicamente ante retos nuevos y desconocidos',
        'Convierte rivales en amigas sin siquiera proponérselo'
      ],
      weaknesses: [
        'Se inquieta con la rutina familiar y repetitiva',
        'A veces persigue el siguiente gran escenario en vez del actual',
        'Se prepara de menos para todo lo que no sea novedoso'
      ],
      raceStrategy:
        'Trata cada carrera como un escenario nuevo digno de dar un espectáculo: segura, adaptable y claramente pasándola de maravilla.'
    },
    'kitasan-black': {
      tagline: 'La capitana constante que levanta a todo el equipo con solo aparecer.',
      summary:
        'No necesita ser la más ruidosa de la sala para ser aquella en torno a quien todas se reúnen. Trabaja duro, dice lo que piensa de verdad y genuinamente quiere ver triunfar a la gente a su alrededor.',
      strengths: [
        'Ética de trabajo poderosa y silenciosa',
        'Hace que sus compañeras crean en sí mismas',
        'De fiar exactamente en los momentos que importan'
      ],
      weaknesses: [
        'Minimiza sus propios logros',
        'Carga más de lo que le toca para proteger a las demás',
        'Tarda en pedirle al equipo que la sostenga a ella'
      ],
      raceStrategy:
        'Corre una carrera fuerte y honesta construida sobre esfuerzo más que sobre brillo, y de algún modo todo el equipo parece correr un poco mejor cuando ella está en ella.'
    },
    'satono-diamond': {
      tagline: 'El perfeccionista idealista que persigue una victoria que tiene que verse exactamente bien.',
      summary:
        'No le basta con ganar: tiene que ser el tipo correcto de victoria, conseguida tal como siempre se la imaginó. Esa visión es hermosa. También es un estándar muy difícil de cumplir.',
      strengths: [
        'Sostiene una visión de excelencia genuinamente inspiradora',
        'Se niega a tomar atajos con sus propios ideales',
        'Eleva el estándar de todos a su alrededor'
      ],
      weaknesses: [
        'Una victoria que no es "limpia" le sigue sabiendo a derrota',
        'Se cuestiona cuando la realidad no coincide con la visión',
        'Puede paralizarse ante su propio listón tan alto'
      ],
      raceStrategy:
        'Espera exactamente el momento correcto para atacar: no el hueco más rápido, ni el más seguro, sino el que coincide con la imagen que tiene en la cabeza.'
    },
    'smart-falcon': {
      tagline: 'La trabajadora sin pretensiones que solo quiere sacar el trabajo adelante.',
      summary:
        'Sin glamour, sin dramatismos, sin interés en ninguno de los dos. Se presenta, hace el trabajo y se va a casa: competente y constante de una forma que nunca necesita anunciarse.',
      strengths: [
        'Confiable sin necesitar reconocimiento por ello',
        'Indiferente ante competencia más llamativa',
        'Esfuerzo constante, carrera tras carrera'
      ],
      weaknesses: [
        'Se subestima en los momentos grandes',
        'Puede pasar desapercibida junto a personalidades más ruidosas',
        'Rara vez reclama los reflectores que se ha ganado'
      ],
      raceStrategy:
        'Corre la misma carrera honesta y sin adornos cada vez: ritmo constante, sin drama desperdiciado, y calladamente lo saca adelante.'
    }
  }
};

export const ARTICULOS_FIJADOS = [
  {
    id: 'como-funciona-power-ranking-tibumetrico',
    slug: 'como-funciona-power-ranking-tibumetrico',
    numero: '01',
    estadoBadge: 'FIJADO · METODOLOGÍA ACTIVA',
    publicado: true,
    categoria: 'METODOLOGÍA · MOTOR DE TALENTO',
    fecha: '27 Noviembre 2026',
    fechaISO: '2026-11-27',
    autor: 'Ernesto Márquez · Tibumétrico Research',
    lectura: '8 min de lectura',
    titulo: 'Cómo funciona el Power Ranking de Tibumétrico: traducción multi-liga, regresión bayesiana y escala 0–100',
    seoDescription:
      'Explicación técnica completa del Power Ranking 0-100 de Tibumétrico: integración de MLB, MiLB, LMBP y ligas del Caribe, factores de traducción empíricos, decaimiento de 4 años y validación histórica en 4,807 juegos.',
    keywords:
      'Power Ranking LVBP, metodología sabermétrica, escala 0-100, traducción MiLB, regresión bayesiana, Serie del Caribe, Tibumétrico',
    bajada:
      'Por qué una actuación en Doble-A o en la LMBP no vale lo mismo que en la LVBP, cómo evitamos el sesgo de muestra pequeña con regresión bayesiana y cómo validamos el modelo sobre 20 temporadas de béisbol.',
    datoDestacado: {
      cifra: '4,807 juegos',
      etiqueta: 'Muestra histórica de validación (2006–2026) con 56.04% de acierto fuera de muestra',
    },
    contenido: [
      {
        tipo: 'parrafo',
        texto:
          'Evaluar el talento real en las ligas invernales del Caribe presenta un desafío estructural que no existe en Grandes Ligas: los rosters cambian cada semana, los importados llegan con historiales en circuitos muy distintos entre sí y las temporadas regulares apenas duran entre 56 y 68 juegos. Si ordenáramos a los peloteros únicamente por su línea ofensiva o efectividad del mes en curso, el ruido estadístico dominaría cada conclusión. El Power Ranking de Tibumétrico nace para resolver ese problema midiendo capacidad intrínseca bajo una sola regla.',
      },
      {
        tipo: 'subtitulo',
        texto: '1. Ingesta multi-liga: el expediente completo de cada pelotero',
      },
      {
        tipo: 'parrafo',
        texto:
          'Antes de asignar un puntaje, nuestro motor reconstruye los últimos cuatro años calendario de actividad oficial de cada jugador a partir de tres fuentes unificadas por identificador oficial: (1) Grandes Ligas y todo el sistema de Ligas Menores (Triple-A, Doble-A, Clase A+, Clase A y Rookie) mediante el endpoint yearByYear multi-liga de MLB; (2) la Liga Mayor de Béisbol Profesional (LMBP) de verano en Venezuela; y (3) las cuatro ligas invernales afiliadas a la Confederación del Caribe (LVBP, LIDOM, LMP y LBPRC).',
      },
      {
        tipo: 'subtitulo',
        texto: '2. Puentes empíricos de traducción entre circuitos',
      },
      {
        tipo: 'parrafo',
        texto:
          'Un OPS de .850 en Clase A o un K-BB% de 18% en Doble-A no se trasladan de forma lineal al béisbol invernal. Para poner todas las ligas en la misma moneda, calibramos factores empíricos comparando el rendimiento de los mismos peloteros dentro del mismo año calendario entre su liga de origen y la LVBP. En ofensiva, el OPS equivalente se ajusta según el nivel competitivo (por ejemplo, factor 1.155 desde MLB hacia LVBP, 0.970 desde LMBP, 0.860 en Doble-A, 0.760 en Clase A+ y 0.680 en Clase A). En pitcheo, utilizamos la tasa pura de ponches menos boletos (K-BB%), aplicando diferenciales empíricos de traslado (-0.10 puntos porcentuales desde Triple-A, -2.66 desde LMBP y -6.14 desde Doble-A).',
      },
      {
        tipo: 'cita',
        texto:
          '«En el pitcheo invernal, K-BB% predice el rendimiento futuro con mucha mayor estabilidad que la efectividad (ERA), porque aísla el dominio real del lanzador sobre la defensa y la suerte con bolas puestas en juego.»',
      },
      {
        tipo: 'subtitulo',
        texto: '3. Decaimiento temporal de 4 años y estabilización bayesiana',
      },
      {
        tipo: 'parrafo',
        texto:
          'No todas las temporadas pesan igual: el rendimiento reciente refleja mejor el estado físico y técnico actual del pelotero. Por ello aplicamos una ponderación exponencial sobre los últimos cuatro años calendario con pesos de 1.00 (año en curso), 0.65 (año -1), 0.35 (año -2) y 0.18 (año -3). Posteriormente, para proteger el modelo contra rachas cortas de 20 o 30 turnos, aplicamos regresión bayesiana hacia la media de la liga: añadimos 130 apariciones al plato (PA) ficticias con un OPS equivalente de .735 en bateadores, y 125 bateadores enfrentados (BF) con un K-BB% de +5.50% en lanzadores. A medida que el jugador acumula volumen real, su propio desempeño desplaza por completo el ancla inicial.',
      },
      {
        tipo: 'subtitulo',
        texto: '4. La escala unificada 0–100: cómo leer cada número',
      },
      {
        tipo: 'parrafo',
        texto:
          'El OPS equivalente y el K-BB% equivalente estabilizados se transforman a una escala lineal intuitiva de 0 a 100 puntos diseñada para comparar bateadores y lanzadores bajo un mismo estándar: 50.0 representa el nivel de reemplazo o profundidad de banca; 55.0 equivale al jugador titular promedio de la LVBP; entre 65.0 y 75.0 se ubican las estrellas consolidadas del circuito invernal y piezas de Triple-A; y por encima de 80.0 puntos aparecen los peloteros con impacto probado de Grandes Ligas.',
      },
      {
        tipo: 'subtitulo',
        texto: '5. Agregación por franquicia y validación histórica (2006–2026)',
      },
      {
        tipo: 'parrafo',
        texto:
          'Para calcular el Power Ranking colectivo de cada franquicia —tanto en la LVBP como en el ranking unificado de 32 equipos del Caribe—, tomamos el promedio de los 9 mejores bateadores y los 8 mejores lanzadores activos en su roster, ponderando el peso real de la ofensiva (67.4%) y el pitcheo (32.6%) derivado de nuestra regresión logística pre-juego: z = 0.1822 + 0.0391·(Bat_Local - Bat_Vis) + 0.0100·(SP_Local - SP_Vis) + 0.0089·(BP_Local - BP_Vis).',
      },
      {
        tipo: 'parrafo',
        texto:
          'Antes de llevar este índice a producción, lo sometimos a una prueba retrospectiva sobre 4,807 juegos oficiales de temporada regular entre 2006 y 2026. Calibrado únicamente con datos de 2006–2021, el modelo alcanzó un 56.04% de acierto fuera de muestra en el bloque 2022–2026 (y 63.2% en la campaña 2026-27 al corte de validación), demostrando que separar el talento intrínseco del ruido diario permite anticipar el comportamiento real de los equipos en el largo plazo.',
      },
    ],
  },
  {
    id: 'metodologia-wpa-leverage-index-lvbp',
    slug: 'metodologia-wpa-leverage-index-lvbp',
    numero: '02',
    estadoBadge: 'FIJADO · PRÓXIMAMENTE',
    publicado: false,
    categoria: 'METODOLOGÍA · IMPACTO SITUACIONAL',
    fecha: 'Próxima publicación',
    autor: 'Tibumétrico Lab',
    lectura: 'Guía técnica',
    titulo: 'WPA, WPA/LI y Leverage Index: cómo medimos cada turno según el apremio del juego',
    bajada:
      'Construcción de la matriz propia de Expectativa de Victoria (24 estados de bases y outs) en la LVBP, cálculo del índice de apremio (pLI) y separación entre contexto y ejecución.',
  },
  {
    id: 'metodologia-owar-fwar-caribe',
    slug: 'metodologia-owar-fwar-caribe',
    numero: '03',
    estadoBadge: 'FIJADO · EN DESARROLLO',
    publicado: false,
    categoria: 'METODOLOGÍA · VALOR SOBRE REEMPLAZO',
    fecha: 'En construcción',
    autor: 'Tibumétrico Lab',
    lectura: 'Modelo en curso',
    titulo: 'oWAR y fWAR adaptado al Caribe: nivel de reemplazo, ajuste de parque y valor acumulado',
    bajada:
      'Definición empírica del nivel de reemplazo en temporadas cortas de 56 juegos, ajuste por factores de parque (Guatamare, Maracaibo, Caracas, Valencia) y conversión de carreras a victorias.',
  },
]

export const ARTICULO_PRINCIPAL = {
  id: 'paradoja-bravos-margarita-2026',
  slug: 'paradoja-bravos-margarita-2026',
  categoria: 'INVESTIGACIÓN · POWER RANKING VS. REALIDAD',
  fecha: '26 Noviembre 2026',
  fechaISO: '2026-11-26',
  autor: 'Ernesto Márquez · Tibumétrico Research',
  lectura: '6 min de lectura',
  titulo: 'La paradoja de Bravos de Margarita: por qué un roster Top 4 del Caribe marcha último en la LVBP',
  seoDescription:
    'Análisis sabermétrico de Bravos de Margarita en la LVBP 2026-27: récord Pitagórico (13.8-20.2), WHIP colectivo de 1.71 y el impacto negativo de -3.23 WPA.',
  keywords: 'Bravos de Margarita, LVBP 2026, Power Ranking Caribe, sabermetría, WPA, FIP, Tibumétrico',
  bajada:
    'Nuestro modelo unificado ubica a Margarita como la cuarta plantilla más talentosa de las cuatro ligas invernales, pero su récord de 13-21 los tiene en el sótano. Cruzamos Pitágoras, FIP y WPA para explicar la brecha entre el papel y el terreno.',
  datoDestacado: {
    cifra: '-3.23 WPA',
    etiqueta: 'Victorias restadas entre solo cuatro piezas de uso constante (Núñez, Idrogo, Hernández y Herrera)',
  },
  contenido: [
    {
      tipo: 'parrafo',
      texto:
        'A primera vista parece un fallo del algoritmo: en el Power Ranking unificado del Caribe —que evalúa a 32 franquicias bajo una misma escala calibrada con cuatro años de datos en MLB, Ligas Menores, LMBP y ligas invernales—, Bravos de Margarita aparece en el puesto #4 global. Sin embargo, al mirar la tabla de posiciones de la LVBP tras 34 encuentros, el equipo insular ocupa el último lugar con marca de 13-21 (.382). ¿Por qué un modelo proyecta como élite a un club que juega por debajo de .400?',
    },
    {
      tipo: 'subtitulo',
      texto: '1. Proyección de talento vs. tabla de posiciones: por qué no se maquilla el modelo',
    },
    {
      tipo: 'parrafo',
      texto:
        'En sabermetría (como ocurre con los sistemas ZiPS o Steamer de FanGraphs), un índice de talento no es un resumen de la tabla de posiciones; es una medición de la capacidad base de los peloteros que integran el roster. Bravos viene de tres campañas consecutivas en el podio de la LVBP (3.º, 2.º y 2.º) y conserva un núcleo veterano con amplio recorrido en MLB, Triple-A y LMBP: Alfred Gutiérrez (73.6), David Peralta (72.5), Cristian Alvarado (70.1), Carlos Pérez (69.8), Félix Doubront (67.6), Edward Olivares (67.0) y Alexi Amarista (65.1). Si ajustáramos el algoritmo para que coincidiera con una racha de 34 juegos, el sistema dejaría de proyectar para limitarse a repetir el pasado.',
    },
    {
      tipo: 'subtitulo',
      texto: '2. Descartando la mala suerte: la prueba de Pitágoras',
    },
    {
      tipo: 'parrafo',
      texto:
        'Cuando un equipo talentoso cae al sótano, la primera hipótesis suele ser la mala suerte en juegos cerrados. Los números la descartan de plano: Margarita ha anotado 187 carreras y permitido 231 (diferencial de -44). Su récord Pitagórico esperado es de 13.8 ganados y 20.2 perdidos (.405), apenas 0.8 victorias por encima de su 13-21 real. Aunque tienen marca de 2-5 en encuentros decididos por una carrera y 7-11 como locales en Guatamare, los insulares están perdiendo porque reciben 6.79 carreras por juego.',
    },
    {
      tipo: 'cita',
      texto:
        '«Bravos no es víctima de la varianza ni de la mala suerte: su diferencial de -44 carreras respalda casi al decimal su récord real de 13-21.»',
    },
    {
      tipo: 'subtitulo',
      texto: '3. Tráfico extremo en las bases (WHIP 1.71) y 42 jonrones permitidos',
    },
    {
      tipo: 'parrafo',
      texto:
        'La autopsia del pitcheo revela el origen del problema. Tanto la rotación (151.0 IP, 4.4 entradas por apertura, WHIP de 1.70 y FIP de 4.67) como el bullpen (142.2 IP, WHIP de 1.73, FIP de 5.23 y un diferencial K-BB% de apenas +4.81%) están congestionando las almohadillas a un ritmo insostenible de casi dos corredores por entrada. A ello se suman 42 cuadrangulares recibidos en 34 compromisos (1.24 HR por juego), neutralizando por completo la ventaja natural de lanzar en un estadio favorable al pitcheo como Margarita (Factor de Parque 0.941).',
    },
    {
      tipo: 'subtitulo',
      texto: '4. La brecha entre el Power Rating y el impacto real (WPA)',
    },
    {
      tipo: 'parrafo',
      texto:
        'A diferencia de otros clubes donde las estrellas se ausentan, los referentes de Bravos han estado en el terreno (Peralta, Pérez, Doubront, Olivares, Amarista y Gutiérrez suman presencia en los 34 juegos). El problema es la ejecución situacional: solo David Peralta (+1.23 WPA, +1.04 WPA/LI) está rindiendo a nivel de MVP. Carlos Pérez muestra un bateo productivo en contexto neutral (+0.88 WPA/LI), pero la falta de batazos oportunos reduce su WPA total a +0.20, mientras Alvarado (-0.30), Doubront (-0.12) y Olivares (-0.02) operan en terreno neutro o negativo.',
    },
    {
      tipo: 'parrafo',
      texto:
        'En el extremo opuesto, cuatro piezas de uso frecuente han hundido las probabilidades de victoria del club en momentos apremiantes: el relevista cubano Darien Núñez (61.5 de rating, pero -0.96 WPA frente a -0.15 WPA/LI, señal inequívoca de colapsos en innings de alto apremio), César Idrogo (-0.87 WPA en 23 juegos), Alejandro Hernández (-0.72 WPA) y José Herrera (-0.68 WPA). Entre los cuatro acumulan -3.23 victorias restadas.',
    },
    {
      tipo: 'subtitulo',
      texto: 'Conclusión: qué esperar en el cierre de temporada',
    },
    {
      tipo: 'parrafo',
      texto:
        'Margarita es el ejemplo perfecto de por qué la sabermetría separa el talento del resultado. Su plantilla sigue teniendo la profundidad ofensiva para competir de tú a tú en el Caribe, pero mientras su cuerpo de lanzadores no reduzca un WHIP colectivo de 1.71 ni contenga el daño en entradas tardías, el talento proyectado seguirá atrapado en el fondo de la tabla.',
    },
  ],
}

export const ARTICULOS_DESTACADOS = [
  {
    id: 'brazos-mlb-dominan-caribe-2026',
    slug: 'brazos-mlb-dominan-caribe-2026',
    categoria: 'POWER RANKING · SERIE DEL CARIBE',
    fecha: '26 Noviembre 2026',
    fechaISO: '2026-11-26',
    autor: 'Ernesto Márquez · Tibumétrico Research',
    lectura: '5 min',
    titulo: 'Por qué los brazos de MLB dominan el Caribe: lo que revela el Power Ranking de 1,440 peloteros',
    seoDescription:
      'Nueve de los diez mejores peloteros del Caribe son lanzadores con experiencia en Grandes Ligas. Así funciona la normalización entre LVBP, LIDOM, LMP y LBPRC.',
    keywords: 'Serie del Caribe, Power Ranking, Joe Jiménez, Renato Núñez, LVBP, LIDOM, LMP, LBPRC',
    bajada:
      'Al normalizar el historial completo desde Clase A hasta Grandes Ligas en una escala única de 0 a 100, el pitcheo con experiencia en MLB acapara 9 de los 10 primeros puestos.',
    metricaArte: {
      valor: '9 de 10',
      sub: 'Lanzadores en el Top 10 Caribe',
      acento: 'navy',
    },
    contenido: [
      {
        tipo: 'parrafo',
        texto:
          'Cuando se evalúa el talento invernal mirando únicamente los números recientes en el Caribe, el sesgo de muestra pequeña suele distorsionar la realidad. Para eliminar esa distorsión, el motor de Tibumétrico integra los últimos cuatro años de actividad oficial en MLB, Ligas Menores (AAA a Rookie), LMBP y las cuatro grandes ligas invernales bajo factores empíricos de traducción.',
      },
      {
        tipo: 'subtitulo',
        texto: '1. La brecha real del pitcheo de Grandes Ligas en invierno',
      },
      {
        tipo: 'parrafo',
        texto:
          'En nuestra escala calibrada —donde 55.0 representa al titular promedio de la LVBP y 80.0+ identifica talento de impacto de Grandes Ligas—, los lanzadores con tasa alta de ponches menos boletos (K-BB%) en MLB o Triple-A mantienen una ventaja estructural inmediata. Casos como el de Joe Jiménez (Atlanta Braves) escalan hasta la segunda posición global del Caribe.',
      },
      {
        tipo: 'subtitulo',
        texto: '2. Renato Núñez, la excepción ofensiva en la cima',
      },
      {
        tipo: 'parrafo',
        texto:
          'En medio de ese dominio desde el montículo, Renato Núñez (Navegantes del Magallanes) emerge como el único bateador dentro del Top 10 del Caribe (80.3 puntos), sosteniendo a Magallanes en el primer lugar del ranking de franquicias (69.2), por encima de Leones del Caracas (67.2) y Caribes de Anzoátegui (66.3).',
      },
    ],
  },
  {
    id: 'sesgo-muestra-pequena-prospectos',
    slug: 'sesgo-muestra-pequena-prospectos',
    categoria: 'METODOLOGÍA · CALIBRACIÓN',
    fecha: '26 Noviembre 2026',
    fechaISO: '2026-11-26',
    autor: 'Tibumétrico Lab',
    lectura: '4 min',
    titulo: 'El caso Jadher Areinamo: cómo el historial completo de Ligas Menores corrige el sesgo de Novato del Año',
    seoDescription:
      'Cómo evitar el sesgo de muestra pequeña en prospectos de la LVBP integrando más de 1,500 turnos de Ligas Menores (MiLB) mediante factores de traducción.',
    keywords: 'Jadher Areinamo, Tiburones de La Guaira, Ligas Menores, sabermetría LVBP, traducción MiLB',
    bajada:
      'Sin sus más de 1,500 turnos en Clase A y Doble-A, el modelo lo ubicaba en el Top 10 de la liga. Al integrar todo su recorrido profesional, su proyección se ajusta a su nivel real.',
    metricaArte: {
      valor: '1,500+ PA',
      sub: 'Historial MiLB integrado',
      acento: 'terracotta',
    },
    contenido: [
      {
        tipo: 'parrafo',
        texto:
          'Uno de los errores más frecuentes en el análisis de ligas invernales es proyectar el rendimiento futuro de un prospecto tomando únicamente sus primeros 150 o 200 turnos en el Caribe. Aunque un jugador joven gane el premio Novato del Año, su verdadera línea base de talento está escrita en el volumen acumulado de Ligas Menores.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Al sincronizar el parámetro leagueListId=mlb_milb de la API oficial de MLB, incorporamos automáticamente cada temporada disputada desde Rookie y Clase A hasta Triple-A. Aplicando factores de traducción empíricos (0.68 en Clase A, 0.76 en Clase A+ y 0.86 en Doble-A), el motor evita sobrevalorar rachas cortas y estabiliza las probabilidades de victoria diarias de cada franquicia.',
      },
    ],
  },
]

export const NOTAS_BREVES = [
  {
    id: 'nota-bravos-pitagoras',
    etiqueta: 'DATO DEL DÍA · LVBP',
    fecha: '26 Nov 2026',
    titulo: 'Bravos de Margarita (13-21) tiene un récord Pitagórico esperado de 13.8-20.2',
    resumen:
      'Con 187 carreras anotadas y 231 permitidas (-44), su posición en el sótano responde a un WHIP colectivo de 1.71 y 42 jonrones recibidos, no a mala suerte.',
  },
  {
    id: 'nota-tiburones-ascenso',
    etiqueta: 'AJUSTE DE ROSTER',
    fecha: '26 Nov 2026',
    titulo: 'Tiburones de La Guaira escala del #18 al #11 del Caribe tras la actualización de historiales MiLB',
    resumen:
      'La incorporación completa de estadísticas de Ligas Menores elevó la valoración real de la profundidad de brazos y jugadores de posición escualos.',
  },
  {
    id: 'nota-pitcheo-lidom',
    etiqueta: 'TENDENCIA · LIDOM',
    fecha: '26 Nov 2026',
    titulo: 'Águilas Cibaeñas registra el techo de pitcheo del Caribe con 75.3 puntos',
    resumen:
      'Cuatro franquicias dominicanas superan los 69.5 puntos colectivos en pitcheo, confirmando el perfil de bajo carreraje de la liga.',
  },
]

export const TODOS_LOS_ARTICULOS = [
  ...ARTICULOS_FIJADOS.filter((a) => a.publicado),
  ARTICULO_PRINCIPAL,
  ...ARTICULOS_DESTACADOS,
]

export function buscarArticuloPorSlug(slug) {
  return TODOS_LOS_ARTICULOS.find((a) => a.slug === slug || a.id === slug) || null
}
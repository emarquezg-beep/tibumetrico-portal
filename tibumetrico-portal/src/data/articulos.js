export const ARTICULO_PRINCIPAL = {
  id: 'brazos-mlb-dominan-caribe-2026',
  categoria: 'POWER RANKING · SERIE DEL CARIBE',
  fecha: '26 Noviembre 2026',
  autor: 'Ernesto Márquez · Tibumétrico Research',
  lectura: '5 min de lectura',
  titulo: 'Por qué los brazos de MLB dominan el Caribe: lo que revela el Power Ranking de 1,440 peloteros',
  bajada:
    'Al normalizar el historial completo desde Clase A hasta Grandes Ligas en una escala única de 0 a 100, el pitcheo con experiencia de bullpen en MLB acapara nueve de los diez primeros puestos de la cuenca del Caribe.',
  datoDestacado: {
    cifra: '9 de 10',
    etiqueta: 'Lanzadores ocupan el Top 10 unificado entre LVBP, LIDOM, LMP y LBPRC',
  },
  contenido: [
    {
      tipo: 'parrafo',
      texto:
        'Cuando se evalúa el talento invernal mirando únicamente los números recientes en el Caribe, el sesgo de muestra pequeña suele distorsionar la realidad: un bateador con un mes caliente en octubre puede parecer superior a un relevista establecido en Grandes Ligas. Para eliminar esa distorsión, el motor de Tibumétrico integra los últimos cuatro años de actividad oficial en MLB, Ligas Menores (AAA a Rookie), LMBP y las cuatro grandes ligas invernales bajo factores empíricos de traducción.',
    },
    {
      tipo: 'subtitulo',
      texto: '1. La brecha real del pitcheo de Grandes Ligas en invierno',
    },
    {
      tipo: 'parrafo',
      texto:
        'En nuestra escala calibrada —donde 55.0 representa al titular promedio de la LVBP y 80.0+ identifica talento de impacto de Grandes Ligas—, los lanzadores con tasa alta de ponches menos boletos (K-BB%) en MLB o Triple-A mantienen una ventaja estructural inmediata. Casos como el de Joe Jiménez (Atlanta Braves) escalan hasta la segunda posición global del Caribe porque su dominio frente a bateadores de MLB se traduce con un ajuste positivo de +4.5 puntos porcentuales al entorno invernal.',
    },
    {
      tipo: 'cita',
      texto:
        '«En torneos cortos como la Serie del Caribe, un bullpen con brazos por encima de 75 puntos en la escala Tibumétrico reduce la varianza ofensiva más que cualquier alineación individual.»',
    },
    {
      tipo: 'subtitulo',
      texto: '2. Renato Núñez, la excepción ofensiva en la cima',
    },
    {
      tipo: 'parrafo',
      texto:
        'En medio de ese dominio desde el montículo, Renato Núñez (Navegantes del Magallanes) emerge como el único bateador dentro del Top 10 del Caribe (80.3 puntos, OPS equivalente de .941 en 891 apariciones ponderadas). Su combinación de poder aislado (ISO) y producción sostenida tanto en la LVBP como en la LMBP sostiene a Magallanes en el primer lugar del ranking de franquicias (69.2), por encima de Leones del Caracas (67.2) y Caribes de Anzoátegui (66.3).',
    },
    {
      tipo: 'subtitulo',
      texto: '3. Contraste de identidad: ofensiva LVBP vs. pitcheo LIDOM',
    },
    {
      tipo: 'parrafo',
      texto:
        'El mapa de las 32 franquicias confirma dos escuelas distintas en el Caribe. Mientras los equipos venezolanos lideran el índice compuesto gracias al balance de sus alineaciones, la LIDOM concentra los cuerpos de pitcheo más profundos de la región: Águilas Cibaeñas marca 75.3 puntos colectivos en pitcheo, seguido por Toros del Este (71.3) y Leones del Escogido (70.5). En México, Tomateros de Culiacán (65.4) encabeza la LMP como el club más equilibrado del Pacífico.',
    },
  ],
}

export const ARTICULOS_DESTACADOS = [
  {
    id: 'sesgo-muestra-pequena-prospectos',
    categoria: 'METODOLOGÍA · CALIBRACIÓN',
    fecha: '26 Noviembre 2026',
    autor: 'Tibumétrico Lab',
    lectura: '4 min',
    titulo: 'El caso Jadher Areinamo: cómo el historial completo de Ligas Menores corrige el sesgo de Novato del Año',
    bajada:
      'Sin sus más de 1,500 turnos en Clase A y Doble-A, el modelo lo ubicaba en el Top 10 de la liga. Al integrar todo su recorrido profesional, su proyección se ajusta a su nivel real de desarrollo.',
    metricaArte: {
      valor: '1,500+ PA',
      sub: 'Historial MiLB integrado',
      acento: 'navy',
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
  {
    id: 'duelos-interligas-modelo-xr',
    categoria: 'SIMULADOR · SERIE DEL CARIBE',
    fecha: '25 Noviembre 2026',
    autor: 'Tibumétrico Lab',
    lectura: '3 min',
    titulo: 'Magallanes vs. Leones del Escogido en terreno neutral: anatomía de un duelo de estilos',
    bajada:
      'Qué sucede cuando el mejor ataque de la LVBP enfrenta a una rotación y relevo dominicano de 70.5 puntos bajo un factor de parque neutro (PF 1.00).',
    metricaArte: {
      valor: 'PF 1.00',
      sub: 'Simulación Terreno Neutral',
      acento: 'terracotta',
    },
    contenido: [
      {
        tipo: 'parrafo',
        texto:
          'Nuestro simulador de Serie del Caribe combina dos modelos calibrados sobre juegos oficiales: una regresión logística para la probabilidad de victoria y una distribución de carreras esperadas (xR) que cruza el Top 9 ofensivo de un equipo contra el Top 8 de pitcheo del rival.',
      },
      {
        tipo: 'parrafo',
        texto:
          'En un enfrentamiento hipotético en sede neutral entre Navegantes del Magallanes (Bat 69.0 / Pit 69.6) y Leones del Escogido (Bat 63.4 / Pit 70.5), la ligera ventaja ofensiva venezolana inclina la balanza hacia un duelo cerrado de aproximadamente 4.6 a 3.9 carreras esperadas. Puedes probar cualquier cruce entre los 32 clubes en la pestaña Caribe.',
      },
    ],
  },
]

export const NOTAS_BREVES = [
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
  {
    id: 'nota-ciclo-importados',
    etiqueta: 'SISTEMA EN VIVO',
    fecha: '25 Nov 2026',
    titulo: 'Seguimiento automático de importados: de Anunciado a Activo en el primer turno oficial',
    resumen:
      'El sincronizador diario detecta el debut en el boxscore y actualiza el impacto proyectado en el Power Ranking sin intervención manual.',
  },
]
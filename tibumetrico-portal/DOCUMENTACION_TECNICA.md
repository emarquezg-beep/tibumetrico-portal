Documentación Técnica · Tibumétrico (LVBP & Caribe)
1. Arquitectura de Datos y Pipelines
El ecosistema opera en dos módulos principales conectados a una caché compartida (raw/carrera_jugadores/) y exporta dos archivos estáticos optimizados para el frontend en Vercel (public/data/).
Componente  / Ubicación / Función Principal
- sincronizar_portal_jugadores.py /	lvbp/tibumetrico_mlb_puro/	/ Sincroniza rosters LVBP, calcula métricas PBP, integra WPA oficial, clasifica importados y genera portal_jugadores.json.
- construir_caribe.py /	lvbp/tibumetrico_caribe/ /	Descarga calendarios y boxscores de LVBP, LIDOM, LMP y LBPRC, normaliza talento multi-liga y genera portal_caribe.json.
- wpa_temporada.py /	lvbp/tibumetrico_mlb_puro/ /	Calcula WPA, WPA/LI y pLI por jugador a partir de estados de juego y genera wpa_temporada_{season}.csv.
- raw/carrera_jugadores/{id}.json /	lvbp/tibumetrico_mlb_puro/ / Caché local de historiales yearByYear (MLB + Ligas Menores).
- raw/biografia_jugadores.json / lvbp/tibumetrico_mlb_puro/ / Caché local de país de nacimiento (birthCountry) y posición primaria consultados en lotes.
2. Reglas de Extracción y Calibración (MLB Stats API)
A. Historial Multi-Liga (MLB + MiLB)
- Endpoint: [https://statsapi.mlb.com/api/v1/people/](https://statsapi.mlb.com/api/v1/people/){pid}/stats?stats=yearByYear&gameType=R&group=hitting,pitching&leagueListId=mlb_milb
- Motivo técnico: El parámetro leagueListId=mlb_milb fuerza a la API a devolver todas las categorías de Ligas Menores (Triple-A, Doble-A, Clase A+, Clase A, Rookie) junto con Grandes Ligas, evitando el sesgo de muestra pequeña en prospectos que aún no han debutado en MLB.
- Saneamiento numérico (_safe_float): Convierte cadenas especiales de la API como "-.--" (efectividad/WHIP con 0.0 IP) o ".---" a valores seguros sin interrumpir el pipeline.
B. Enriquecimiento Oficial de Pitcheo LVBP (CL, ERA, G-P, SV)
- Función: cargar_pitcheo_oficial_lvbp_api(seasons)
- Endpoint: [https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&sportId=17&leagueId=135&season=](https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&sportId=17&leagueId=135&season=){sea}&playerPool=ALL&limit=1000
- Funcionamiento: Realiza 1 petición HTTP por temporada para obtener victorias (W), derrotas (L), salvados (SV), carreras limpias (ER / CL) y efectividad (ERA) oficiales, inyectándolos sobre las filas generadas desde plate_appearances (que aportan IP, H, HR, BB, SO, WHIP, FIP y K-BB%).
3. Integración de WPA y Métricas de Impacto Real
La función cargar_wpa_temporada(season) ejecuta wpa_temporada.py en segundo plano y lee el archivo wpa_temporada_{season}.csv más reciente bajo el siguiente mapeo de columnas:
Campo en portal_jugadores.json / Columna en wpa_temporada_2026.csv / Descripción
wpa	/ wpa_total /	Probabilidad de victoria añadida acumulada (bateo + pitcheo).
wpa_li / wpa_li_total/ WPA neutralizado por contexto de apremio (Leverage Index).
pli	/ pli_total	/ Índice de apremio promedio de las apariciones del jugador (1.00 = neutral).
4. Clasificación Automática de Importados (es_importado)
La detección de refuerzos extranjeros funciona de manera uniforme para las 4 ligas invernales mediante obtener_biografia_lote(player_ids) (consultas en bloques de 100 IDs a /api/v1/people?personIds=...):
- LVBP (leagueId=135): Se marca es_importado = True si birthCountry es distinto de "Venezuela"/"VEN", o si existe en tibumetrico_importados.duckdb (importados_actuales) / importados_temporada.json con país distinto de "VEN"/"Venezuela".
- LIDOM (leagueId=131): birthCountry != "Dominican Republic".
- LMP (leagueId=132): birthCountry != "Mexico".
- LBPRC (leagueId=133): birthCountry != "Puerto Rico" (distingue jugadores nacidos en EE. UU. continental como importados).
5. Arquitectura Frontend (tibumetrico-portal)
Identidad Visual y Sistema Editorial
- Estilo: Diseño editorial suizo de alta legibilidad con fondo Blanco Piedra (#F4F4F2), superficies de tablas en Blanco Puro (#FFFFFF), bloques de contraste en Carbón (#161616), acento institucional en Azul Marino (#1E3A5F) y acento de élite/alertas en Terracota (#B84A39).
- Tipografía: Inter para lectura editorial y encabezados; JetBrains Mono para alineación tabular exacta en estadísticas.
Estructura de Vistas y Archivos Clave
- src/data/articulos.js: Repositorio desacoplado de contenido editorial (ARTICULO_PRINCIPAL, ARTICULOS_DESTACADOS, NOTAS_BREVES). Permite publicar nuevos análisis agregando objetos al arreglo sin modificar componentes Vue.
- src/App.vue:
* Vista Editorial: Portada estilo blog sabermétrico con artículo principal, tarjeta en vivo del Top 5 del Caribe, retícula asimétrica de notas breves/investigación, franja oscura con las 6 mejores franquicias y lector de artículos completos.
* Vista LVBP: Power Ranking de los 8 equipos, ordenamiento dual (Power 0–100, WPA 2026, WPA/LI) con selector ascendente/descendente (Mejores primero / Peores primero), filtro de origen (Todos / Importados / Criollos) y expedientes expandibles con totales por liga y de carrera (calcularTotalesBateo y calcularTotalesPitcheo).
* Vista Caribe · 4 Ligas: Simulador interligas en terreno neutral (PF 1.00 con modelo logístico + Poisson xR), ranking unificado de las 32 franquicias y tabla global filtrable por liga, rol e importados.
6. Rutina de Actualización Diaria (Comandos de Despliegue)
Para actualizar los datos tras cada jornada y publicarlos en producción:
# 1. Actualizar LVBP (Play-by-play, WPA oficial, Pitcheo oficial API e Importados)
cd C:\Users\emarq\Documents\Proyectos\lvbp\tibumetrico_mlb_puro
python sincronizar_portal_jugadores.py

# 2. Actualizar Caribe (LVBP, LIDOM, LMP, LBPRC)
cd C:\Users\emarq\Documents\Proyectos\lvbp\tibumetrico_caribe
python construir_caribe.py

# 3. Copiar JSON al repositorio web y desplegar en Vercel
copy -Force C:\Users\emarq\Documents\Proyectos\lvbp\tibumetrico_mlb_puro\portal_jugadores.json C:\Users\emarq\Documents\Proyectos\tibumetrico-portal\public\data\portal_jugadores.json
copy -Force C:\Users\emarq\Documents\Proyectos\lvbp\tibumetrico_caribe\portal_caribe.json C:\Users\emarq\Documents\Proyectos\tibumetrico-portal\public\data\portal_caribe.json

cd C:\Users\emarq\Documents\Proyectos\tibumetrico-portal
git add public/data/
git commit -m "Actualizacion diaria de datos LVBP y Caribe"
git push origin main

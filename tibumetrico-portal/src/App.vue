<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ARTICULO_PRINCIPAL,
  ARTICULOS_DESTACADOS,
  NOTAS_BREVES,
} from './data/articulos.js'

const vistaActiva = ref('editorial')
const articuloAbierto = ref(null)

const cargando = ref(true)
const error = ref(null)

// Datos LVBP
const metaLvbp = ref({ season: 2026, fecha_corte: '', total_activos: 0, total_anunciados: 0, total_importados: 0 })
const jugadoresLvbp = ref([])

// Datos Caribe
const metaCaribe = ref({ season: 2026, total_equipos: 0, total_jugadores: 0, total_importados: 0 })
const equiposCaribe = ref([])
const jugadoresCaribe = ref([])

// Filtros y Ordenamiento LVBP
const busqueda = ref('')
const filtroEquipo = ref('TODOS')
const filtroRol = ref('TODOS')
const filtroEstado = ref('TODOS')
const filtroOrigen = ref('TODOS') // 'TODOS' | 'IMPORTADOS' | 'NATIVOS'
const ordenarPor = ref('power') // 'power' | 'wpa' | 'wpa_li'
const ordenDir = ref('desc') // 'desc' (mejores) | 'asc' (peores)
const soloMuestraMinima = ref(false)
const expandidoId = ref(null)

// Filtros Caribe
const busquedaCaribe = ref('')
const filtroLigaCaribe = ref('TODAS')
const filtroEquipoCaribe = ref('TODOS')
const filtroRolCaribe = ref('TODOS')
const filtroOrigenCaribe = ref('TODOS') // 'TODOS' | 'IMPORTADOS' | 'NATIVOS'
const soloMuestraCaribe = ref(true)
const expandidoCaribeKey = ref(null)

// Simulador Serie del Caribe
const simEquipoA = ref('')
const simEquipoB = ref('')

onMounted(async () => {
  try {
    const [resLvbp, resCaribe] = await Promise.all([
      fetch('/data/portal_jugadores.json', { cache: 'no-store' }),
      fetch('/data/portal_caribe.json', { cache: 'no-store' }).catch(() => null),
    ])

    if (!resLvbp.ok) throw new Error(`HTTP ${resLvbp.status} al cargar LVBP`)
    const dataLvbp = await resLvbp.json()
    metaLvbp.value = {
      season: dataLvbp.season,
      fecha_corte: dataLvbp.fecha_corte,
      total_activos: dataLvbp.total_activos,
      total_anunciados: dataLvbp.total_anunciados,
      total_importados: dataLvbp.total_importados || 0,
    }
    jugadoresLvbp.value = dataLvbp.jugadores || []

    if (resCaribe && resCaribe.ok) {
      const dataCaribe = await resCaribe.json()
      metaCaribe.value = {
        season: dataCaribe.season,
        total_equipos: dataCaribe.total_equipos,
        total_jugadores: dataCaribe.total_jugadores,
        total_importados: dataCaribe.total_importados || 0,
      }
      equiposCaribe.value = dataCaribe.ranking_equipos || []
      jugadoresCaribe.value = dataCaribe.jugadores || []

      if (equiposCaribe.value.length >= 2) {
        simEquipoA.value = equiposCaribe.value[0].equipo
        const rivalOtraLiga = equiposCaribe.value.find((e) => e.liga !== equiposCaribe.value[0].liga)
        simEquipoB.value = rivalOtraLiga ? rivalOtraLiga.equipo : equiposCaribe.value[1].equipo
      }
    }
  } catch (e) {
    error.value = `Error cargando datos del portal: ${e.message}`
  } finally {
    cargando.value = false
  }
})

// --- Totales por Liga y Carrera (estilo Baseball-Reference) ---
function normalizarNombreNivel(liga) {
  if (!liga) return 'Otras'
  if (liga.startsWith('MLB')) return 'MLB'
  if (liga.startsWith('Triple-A')) return 'Triple-A'
  if (liga.startsWith('Doble-A')) return 'Doble-A'
  if (liga.startsWith('Clase A+')) return 'Clase A+'
  if (liga.startsWith('Clase A-Corta')) return 'Clase A-Corta'
  if (liga.startsWith('Clase A')) return 'Clase A'
  return liga
}

function resumirBateoGrupo(etiqueta, rows) {
  let jj = 0, pa = 0, ab = 0, h = 0, d2 = 0, d3 = 0, hr = 0, rbi = 0, bb = 0, so = 0, sb = 0
  let opsSum = 0, opsPa = 0, opsEqSum = 0, opsEqPa = 0

  for (const r of rows) {
    jj += r.jj || 0
    pa += r.pa || 0
    ab += r.ab || 0
    h += r.h || 0
    d2 += r.d2 || 0
    d3 += r.d3 || 0
    hr += r.hr || 0
    rbi += r.rbi || 0
    bb += r.bb || 0
    so += r.so || 0
    sb += r.sb || 0
    if (r.pa > 0 && r.ops > 0) {
      opsSum += r.ops * r.pa
      opsPa += r.pa
    }
    if (r.pa > 0 && r.ops_eq > 0) {
      opsEqSum += r.ops_eq * r.pa
      opsEqPa += r.pa
    }
  }

  const avg = ab > 0 ? h / ab : 0
  const obp = pa > 0 ? (h + bb) / pa : 0
  const tb = Math.max(0, h - d2 - d3 - hr) + 2 * d2 + 3 * d3 + 4 * hr
  const slg = ab > 0 ? tb / ab : 0
  const opsCalc = ab > 0 ? obp + slg : (opsPa > 0 ? opsSum / opsPa : 0)
  const iso = ab > 0 ? Math.max(0, slg - avg) : 0

  return {
    etiqueta,
    temporadas: rows.length,
    jj, pa, ab, h, d2, d3, hr, rbi, bb, so, sb,
    avg, obp, slg,
    ops: opsCalc,
    iso,
    bb_pct: pa > 0 ? (bb * 100) / pa : 0,
    k_pct: pa > 0 ? (so * 100) / pa : 0,
    ops_eq: opsEqPa > 0 ? opsEqSum / opsEqPa : 0,
  }
}

function calcularTotalesBateo(rows) {
  if (!rows || !rows.length) return { porLiga: [], carrera: null }
  const grupos = {}
  for (const r of rows) {
    const k = normalizarNombreNivel(r.liga)
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(r)
  }
  const porLiga = Object.entries(grupos)
    .map(([k, list]) => resumirBateoGrupo(`Total ${k}`, list))
    .sort((a, b) => b.pa - a.pa)
  const carrera = resumirBateoGrupo('TOTAL CARRERA', rows)
  return { porLiga, carrera }
}

function ipStrAOuts(ipStr) {
  if (!ipStr || ipStr === '—') return 0
  const s = String(ipStr)
  if (s.includes('.')) {
    const [e, f] = s.split('.')
    return (parseInt(e, 10) || 0) * 3 + (parseInt(f[0], 10) || 0)
  }
  return Math.round((parseFloat(s) || 0) * 3)
}

function resumirPitcheoGrupo(etiqueta, rows) {
  let jj = 0, ji = 0, w = 0, l = 0, sv = 0, outs = 0, bf = 0, h = 0, er = 0, hr = 0, bb = 0, so = 0
  let outsConEr = 0, kbbSum = 0, kbbBf = 0, kbbEqSum = 0, kbbEqBf = 0

  for (const p of rows) {
    const o = ipStrAOuts(p.ip)
    jj += p.jj || 0
    ji += p.ji || 0
    w += p.w || 0
    l += p.l || 0
    sv += p.sv || 0
    outs += o
    bf += p.bf || 0
    h += p.h || 0
    hr += p.hr || 0
    bb += p.bb || 0
    so += p.so || 0
    if (p.er != null && p.era != null) {
      er += p.er
      outsConEr += o
    }
    if (p.bf > 0) {
      kbbSum += (p.kbb || 0) * p.bf
      kbbBf += p.bf
      kbbEqSum += (p.kbb_eq || 0) * p.bf
      kbbEqBf += p.bf
    }
  }

  const ipNum = outs / 3
  const ipEra = outsConEr / 3
  const era = ipEra > 0 ? (er * 9) / ipEra : null
  const whip = ipNum > 0 ? (bb + h) / ipNum : null
  const fip = ipNum > 0 ? Math.max(0, (13 * hr + 3 * bb - 2 * so) / ipNum + 3.15) : null
  const k9 = ipNum > 0 ? (so * 9) / ipNum : null
  const bb9 = ipNum > 0 ? (bb * 9) / ipNum : null

  return {
    etiqueta,
    temporadas: rows.length,
    jj, ji, w, l, sv,
    ip: `${Math.floor(outs / 3)}.${outs % 3}`,
    bf, h,
    er: outsConEr > 0 ? er : null,
    hr, bb, so, era, whip, fip, k9, bb9,
    kbb: kbbBf > 0 ? kbbSum / kbbBf : 0,
    kbb_eq: kbbEqBf > 0 ? kbbEqSum / kbbEqBf : 0,
  }
}

function calcularTotalesPitcheo(rows) {
  if (!rows || !rows.length) return { porLiga: [], carrera: null }
  const grupos = {}
  for (const r of rows) {
    const k = normalizarNombreNivel(r.liga)
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(r)
  }
  const porLiga = Object.entries(grupos)
    .map(([k, list]) => resumirPitcheoGrupo(`Total ${k}`, list))
    .sort((a, b) => b.bf - a.bf)
  const carrera = resumirPitcheoGrupo('TOTAL CARRERA', rows)
  return { porLiga, carrera }
}

// --- Computeds Portada Editorial ---
const top5CaribeVivo = computed(() => {
  return jugadoresCaribe.value
    .filter((j) => (j.rol === 'Lanzador' ? j.bf_4y >= 100 : j.pa_4y >= 100))
    .slice(0, 5)
})

const top6EquiposCaribe = computed(() => equiposCaribe.value.slice(0, 6))

// --- Computeds LVBP ---
const equiposUnicos = computed(() => {
  const set = new Set(jugadoresLvbp.value.map((j) => j.equipo).filter(Boolean))
  return Array.from(set).sort()
})

const rankingEquiposLvbp = computed(() => {
  const mapa = {}
  for (const j of jugadoresLvbp.value) {
    if (!j.equipo) continue
    if (!mapa[j.equipo]) mapa[j.equipo] = { equipo: j.equipo, bats: [], pits: [], anunciados: 0 }
    if (j.estado === 'Anunciado') mapa[j.equipo].anunciados++
    if (j.rol === 'Lanzador') mapa[j.equipo].pits.push(j)
    else mapa[j.equipo].bats.push(j)
  }

  return Object.values(mapa)
    .map((eq) => {
      const top9 = [...eq.bats].sort((a, b) => b.power_ranking - a.power_ranking).slice(0, 9)
      const top8 = [...eq.pits].sort((a, b) => b.power_ranking - a.power_ranking).slice(0, 8)
      const pBat = top9.length ? top9.reduce((s, x) => s + x.power_ranking, 0) / top9.length : 50
      const pPit = top8.length ? top8.reduce((s, x) => s + x.power_ranking, 0) / top8.length : 50
      const power = (0.0391 * pBat + 0.0189 * pPit) / (0.0391 + 0.0189)
      return {
        equipo: eq.equipo,
        power: Number(power.toFixed(1)),
        pBat: Number(pBat.toFixed(1)),
        pPit: Number(pPit.toFixed(1)),
        anunciados: eq.anunciados,
      }
    })
    .sort((a, b) => b.power - a.power)
})

const jugadoresFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  const lista = jugadoresLvbp.value.filter((j) => {
    if (filtroEquipo.value !== 'TODOS' && j.equipo !== filtroEquipo.value) return false
    if (filtroRol.value !== 'TODOS' && j.rol !== filtroRol.value) return false
    if (filtroEstado.value !== 'TODOS' && j.estado !== filtroEstado.value) return false
    if (filtroOrigen.value === 'IMPORTADOS' && !j.es_importado) return false
    if (filtroOrigen.value === 'NATIVOS' && j.es_importado) return false
    if (soloMuestraMinima.value) {
      const vol = j.rol === 'Lanzador' ? j.bf_4y : j.pa_4y
      if (vol < 100) return false
    }
    if (q && !j.nombre.toLowerCase().includes(q) && !j.equipo.toLowerCase().includes(q)) return false
    return true
  })

  const mult = ordenDir.value === 'desc' ? -1 : 1
  return [...lista].sort((a, b) => {
    let va = a.power_ranking
    let vb = b.power_ranking
    if (ordenarPor.value === 'wpa') {
      va = a.wpa ?? 0
      vb = b.wpa ?? 0
    } else if (ordenarPor.value === 'wpa_li') {
      va = a.wpa_li ?? 0
      vb = b.wpa_li ?? 0
    }
    if (va !== vb) return (va - vb) * mult
    return a.nombre.localeCompare(b.nombre)
  })
})

// --- Computeds Caribe ---
const equiposCaribeFiltrados = computed(() => {
  if (filtroLigaCaribe.value === 'TODAS') return equiposCaribe.value
  return equiposCaribe.value.filter((e) => e.liga === filtroLigaCaribe.value)
})

const jugadoresCaribeFiltrados = computed(() => {
  const q = busquedaCaribe.value.trim().toLowerCase()
  return jugadoresCaribe.value
    .filter((j) => {
      if (filtroLigaCaribe.value !== 'TODAS' && j.liga !== filtroLigaCaribe.value) return false
      if (filtroEquipoCaribe.value !== 'TODOS' && j.equipo !== filtroEquipoCaribe.value) return false
      if (filtroRolCaribe.value !== 'TODOS' && j.rol !== filtroRolCaribe.value) return false
      if (filtroOrigenCaribe.value === 'IMPORTADOS' && !j.es_importado) return false
      if (filtroOrigenCaribe.value === 'NATIVOS' && j.es_importado) return false
      if (soloMuestraCaribe.value) {
        const vol = j.rol === 'Lanzador' ? j.bf_4y : j.pa_4y
        if (vol < 100) return false
      }
      if (q && !j.nombre.toLowerCase().includes(q) && !j.equipo.toLowerCase().includes(q)) return false
      return true
    })
    .slice(0, 250)
})

const resultadoSimulacion = computed(() => {
  const eqA = equiposCaribe.value.find((e) => e.equipo === simEquipoA.value)
  const eqB = equiposCaribe.value.find((e) => e.equipo === simEquipoB.value)
  if (!eqA || !eqB) return null

  const z = 0.0391 * (eqA.p_bat - eqB.p_bat) + 0.0189 * (eqA.p_pit - eqB.p_pit)
  const probA = 1 / (1 + Math.exp(-z))
  const probB = 1 - probA
  const xrA = Math.exp(1.5665 + 0.0178 * (eqA.p_bat - 55) - 0.0165 * (eqB.p_pit - 55))
  const xrB = Math.exp(1.5665 + 0.0178 * (eqB.p_bat - 55) - 0.0165 * (eqA.p_pit - 55))

  return {
    eqA,
    eqB,
    probA: (probA * 100).toFixed(1),
    probB: (probB * 100).toFixed(1),
    xrA: xrA.toFixed(1),
    xrB: xrB.toFixed(1),
    xrTotal: (xrA + xrB).toFixed(1),
  }
})

function cambiarVista(vista) {
  vistaActiva.value = vista
  articuloAbierto.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function abrirArticulo(art) {
  articuloAbierto.value = art
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function toggleExpandir(pid) {
  expandidoId.value = expandidoId.value === pid ? null : pid
}

function toggleExpandirCaribe(key) {
  expandidoCaribeKey.value = expandidoCaribeKey.value === key ? null : key
}

function seleccionarEquipo(eq) {
  filtroEquipo.value = filtroEquipo.value === eq ? 'TODOS' : eq
}

function seleccionarEquipoCaribe(eq) {
  filtroEquipoCaribe.value = filtroEquipoCaribe.value === eq ? 'TODOS' : eq
}

function colorRating(val) {
  if (val >= 78) return 'bg-[#B84A39]/12 text-[#9A3425] border-[#B84A39]/35'
  if (val >= 66) return 'bg-[#1E3A5F]/12 text-[#1E3A5F] border-[#1E3A5F]/30'
  if (val >= 56) return 'bg-[#2E5A44]/12 text-[#234735] border-[#2E5A44]/30'
  return 'bg-[#F4F4F2] text-[#52525B] border-[#D4D4D8]'
}

function colorWpa(val) {
  if (val == null || val === 0) return 'text-[#71717A]'
  if (val >= 1.0) return 'text-[#234735] font-bold'
  if (val > 0) return 'text-[#1E3A5F] font-semibold'
  if (val <= -0.75) return 'text-[#9A3425] font-bold'
  return 'text-[#B84A39]'
}

function badgeLiga(liga) {
  const map = {
    LVBP: 'bg-[#B84A39]/10 text-[#9A3425] border-[#B84A39]/25',
    LIDOM: 'bg-[#1E3A5F]/10 text-[#1E3A5F] border-[#1E3A5F]/25',
    LMP: 'bg-[#2E5A44]/10 text-[#234735] border-[#2E5A44]/25',
    LBPRC: 'bg-[#6B4C3B]/10 text-[#573D2F] border-[#6B4C3B]/25',
  }
  return map[liga] || 'bg-[#F4F4F2] text-[#52525B] border-[#D4D4D8]'
}

function headshotUrl(pid) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${pid}/headshot/67/current`
}
</script>

<template>
  <div class="min-h-screen bg-[#F4F4F2] text-[#18181B] flex flex-col" style="font-family: 'Inter', sans-serif">
    <!-- CABECERA EDITORIAL MINIMALISTA -->
    <header class="border-b border-[#D4D4D8] bg-[#F4F4F2]/95 backdrop-blur sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button @click="cambiarVista('editorial')" class="text-left group cursor-pointer flex items-baseline gap-3">
          <span class="text-2xl font-black tracking-tighter text-[#161616] uppercase leading-none">
            TIBUMÉTRICO
          </span>
          <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52525B] hidden sm:inline">
            Sabermetría & Análisis · {{ metaLvbp.season }}
          </span>
        </button>

        <nav class="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            @click="cambiarVista('editorial')"
            :class="[
              'px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer border',
              vistaActiva === 'editorial'
                ? 'bg-[#161616] text-white border-[#161616]'
                : 'bg-transparent text-[#52525B] border-transparent hover:text-[#161616] hover:border-[#D4D4D8]',
            ]"
          >
            Editorial
          </button>

          <button
            @click="cambiarVista('lvbp')"
            :class="[
              'px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer border',
              vistaActiva === 'lvbp'
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-transparent text-[#52525B] border-transparent hover:text-[#161616] hover:border-[#D4D4D8]',
            ]"
          >
            LVBP ({{ metaLvbp.total_activos + metaLvbp.total_anunciados }})
          </button>

          <button
            v-if="equiposCaribe.length > 0"
            @click="cambiarVista('caribe')"
            :class="[
              'px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer border flex items-center gap-1.5',
              vistaActiva === 'caribe'
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-transparent text-[#52525B] border-transparent hover:text-[#161616] hover:border-[#D4D4D8]',
            ]"
          >
            <span>Caribe · 4 Ligas</span>
            <span class="text-[10px] opacity-75">({{ metaCaribe.total_equipos }})</span>
          </button>

          <span class="hidden lg:inline-block pl-3 ml-1 border-l border-[#D4D4D8] text-[11px] font-mono text-[#52525B]">
            CORTE {{ metaLvbp.fecha_corte || 'HOY' }}
          </span>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <div v-if="cargando" class="max-w-7xl mx-auto px-6 py-24 text-center text-sm text-[#52525B]">
        Sincronizando base sabermétrica multi-liga...
      </div>

      <div v-else-if="error" class="max-w-7xl mx-auto px-6 py-12">
        <div class="p-4 border border-[#B84A39] bg-white text-[#9A3425] text-sm">{{ error }}</div>
      </div>

      <!-- ======================================================= -->
      <!-- VISTA 1: PORTADA EDITORIAL                              -->
      <!-- ======================================================= -->
      <template v-else-if="vistaActiva === 'editorial'">
        <article v-if="articuloAbierto" class="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <button
            @click="articuloAbierto = null"
            class="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] hover:underline mb-6 inline-flex items-center gap-1.5 cursor-pointer"
          >
            ← Volver a la portada editorial
          </button>

          <div class="bg-white border border-[#E4E4E7] p-6 sm:p-10 md:p-12 shadow-xs">
            <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B84A39]">
              {{ articuloAbierto.categoria }}
            </div>
            <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#161616] mt-3 leading-tight">
              {{ articuloAbierto.titulo }}
            </h1>
            <p class="text-base sm:text-lg text-[#52525B] mt-4 leading-relaxed border-b border-[#E4E4E7] pb-6">
              {{ articuloAbierto.bajada }}
            </p>
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52525B] py-3 border-b border-[#E4E4E7]">
              <span>Por <strong class="text-[#18181B]">{{ articuloAbierto.autor }}</strong></span>
              <span>{{ articuloAbierto.fecha }} · {{ articuloAbierto.lectura }}</span>
            </div>

            <div class="mt-8 space-y-5 text-[16px] text-[#27272A] leading-relaxed">
              <template v-for="(bloque, i) in articuloAbierto.contenido" :key="i">
                <h2 v-if="bloque.tipo === 'subtitulo'" class="text-xl font-bold text-[#161616] pt-4">
                  {{ bloque.texto }}
                </h2>
                <blockquote
                  v-else-if="bloque.tipo === 'cita'"
                  class="my-6 pl-5 border-l-4 border-[#1E3A5F] italic text-lg text-[#1E3A5F] font-medium"
                >
                  {{ bloque.texto }}
                </blockquote>
                <p v-else>{{ bloque.texto }}</p>
              </template>
            </div>

            <div class="mt-10 pt-6 border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
              <span class="text-xs text-[#52525B]">Explora los números completos detrás de este análisis:</span>
              <div class="flex gap-2">
                <button
                  @click="cambiarVista('caribe')"
                  class="px-4 py-2 bg-[#161616] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1E3A5F] transition cursor-pointer"
                >
                  Ver Ranking Caribe (4 Ligas)
                </button>
                <button
                  @click="cambiarVista('lvbp')"
                  class="px-4 py-2 bg-[#F4F4F2] text-[#161616] border border-[#D4D4D8] text-xs font-bold uppercase tracking-wider hover:border-[#161616] transition cursor-pointer"
                >
                  Expedientes LVBP
                </button>
              </div>
            </div>
          </div>
        </article>

        <div v-else>
          <!-- HERO EDITORIAL + TOP 5 EN VIVO -->
          <section class="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 border-b border-[#D4D4D8]">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div class="lg:col-span-7 bg-white border border-[#E4E4E7] p-6 sm:p-10 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B84A39]">
                      {{ ARTICULO_PRINCIPAL.categoria }}
                    </span>
                    <span class="text-xs text-[#52525B]">{{ ARTICULO_PRINCIPAL.fecha }}</span>
                  </div>

                  <h1
                    @click="abrirArticulo(ARTICULO_PRINCIPAL)"
                    class="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#161616] mt-4 leading-[1.12] hover:text-[#1E3A5F] transition cursor-pointer"
                  >
                    {{ ARTICULO_PRINCIPAL.titulo }}
                  </h1>

                  <p class="text-sm sm:text-base text-[#52525B] mt-4 leading-relaxed">
                    {{ ARTICULO_PRINCIPAL.bajada }}
                  </p>
                </div>

                <div class="mt-8 pt-6 border-t border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="flex items-baseline gap-3">
                    <span class="text-3xl font-black text-[#1E3A5F] font-mono">
                      {{ ARTICULO_PRINCIPAL.datoDestacado.cifra }}
                    </span>
                    <span class="text-xs text-[#52525B] max-w-xs leading-snug">
                      {{ ARTICULO_PRINCIPAL.datoDestacado.etiqueta }}
                    </span>
                  </div>

                  <button
                    @click="abrirArticulo(ARTICULO_PRINCIPAL)"
                    class="px-5 py-2.5 bg-[#161616] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1E3A5F] transition cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    Leer análisis →
                  </button>
                </div>
              </div>

              <div class="lg:col-span-5 bg-white border border-[#E4E4E7] p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
                    <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A5F]">
                      Índice En Vivo · Top 5 Caribe
                    </span>
                    <span class="text-[11px] font-mono text-[#52525B]">ESCALA 0-100</span>
                  </div>

                  <div class="divide-y divide-[#E4E4E7] mt-2">
                    <div
                      v-for="(j, i) in top5CaribeVivo"
                      :key="`${j.liga}-${j.player_id}`"
                      class="py-3 flex items-center justify-between gap-3"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="font-mono text-xs font-bold text-[#71717A] w-4">#{{ i + 1 }}</span>
                        <img
                          :src="headshotUrl(j.player_id)"
                          :alt="j.nombre"
                          class="w-9 h-9 rounded-full object-cover bg-[#F4F4F2] border border-[#E4E4E7] shrink-0"
                        />
                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5">
                            <span class="text-sm font-bold text-[#161616] truncate">{{ j.nombre }}</span>
                            <span v-if="j.es_importado" class="px-1 py-0.2 bg-[#B84A39]/12 text-[#9A3425] border border-[#B84A39]/30 text-[9px] font-bold shrink-0">
                              IMP
                            </span>
                          </div>
                          <div class="text-[11px] text-[#52525B] truncate">
                            <span class="font-semibold text-[#1E3A5F]">{{ j.liga }}</span> · {{ j.equipo }}
                          </div>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <span
                          :class="[
                            'inline-block px-2 py-0.5 font-mono text-xs font-bold border',
                            colorRating(j.power_ranking),
                          ]"
                        >
                          {{ j.power_ranking.toFixed(1) }}
                        </span>
                        <div class="text-[10px] font-mono text-[#71717A] mt-0.5">
                          {{ j.rol === 'Lanzador' ? `${j.kbb_eq >= 0 ? '+' : ''}${j.kbb_eq.toFixed(1)}% K-BB` : `${j.ops_eq.toFixed(3)} OPS` }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-[#E4E4E7] flex items-center justify-between">
                  <span class="text-[11px] text-[#52525B]">Muestra mín. 100 PA/BF (4 años)</span>
                  <button
                    @click="cambiarVista('caribe')"
                    class="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] hover:underline cursor-pointer"
                  >
                    Ver los {{ metaCaribe.total_jugadores }} →
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- RETÍCULA ASIMÉTRICA -->
          <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                Investigación & Apuntes Sabermétricos
              </h2>
              <span class="h-px flex-1 bg-[#D4D4D8] ml-4"></span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div class="lg:col-span-4 divide-y divide-[#D4D4D8] border-t border-b border-[#D4D4D8]">
                <div v-for="nota in NOTAS_BREVES" :key="nota.id" class="py-5">
                  <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#B84A39]">
                    <span>{{ nota.etiqueta }}</span>
                    <span class="text-[#71717A] font-normal">{{ nota.fecha }}</span>
                  </div>
                  <h3 class="text-sm font-bold text-[#161616] mt-1.5 leading-snug">
                    {{ nota.titulo }}
                  </h3>
                  <p class="text-xs text-[#52525B] mt-1.5 leading-relaxed">
                    {{ nota.resumen }}
                  </p>
                </div>
              </div>

              <div class="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <article
                  v-for="art in ARTICULOS_DESTACADOS"
                  :key="art.id"
                  @click="abrirArticulo(art)"
                  class="bg-white border border-[#E4E4E7] hover:border-[#161616] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div
                      :class="[
                        'p-6 border-b border-[#E4E4E7] flex flex-col justify-between h-44',
                        art.metricaArte.acento === 'terracotta' ? 'bg-[#161616] text-white' : 'bg-[#1E3A5F] text-white',
                      ]"
                    >
                      <span class="text-[10px] font-mono uppercase tracking-[0.2em] opacity-75">
                        {{ art.metricaArte.sub }}
                      </span>
                      <div class="text-4xl font-black font-mono tracking-tight">
                        {{ art.metricaArte.valor }}
                      </div>
                    </div>

                    <div class="p-6">
                      <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B84A39]">
                        {{ art.categoria }}
                      </div>
                      <h3 class="text-lg font-extrabold text-[#161616] mt-2 leading-snug group-hover:text-[#1E3A5F] transition">
                        {{ art.titulo }}
                      </h3>
                      <p class="text-xs text-[#52525B] mt-2.5 leading-relaxed">
                        {{ art.bajada }}
                      </p>
                    </div>
                  </div>

                  <div class="px-6 py-3.5 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#52525B]">
                    <span>{{ art.fecha }} · {{ art.lectura }}</span>
                    <span class="font-bold text-[#161616] group-hover:translate-x-0.5 transition">Leer →</span>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <!-- FRANJA OSCURA DE CONTRASTE -->
          <section class="bg-[#161616] text-white py-14 border-t border-b border-[#27272A]">
            <div class="max-w-7xl mx-auto px-4 sm:px-6">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#27272A]">
                <div class="lg:col-span-6">
                  <h2 class="text-2xl sm:text-4xl font-black tracking-tight uppercase leading-none">
                    MODELADO EN LA LVBP.<br />
                    <span class="text-[#A1A1AA]">CALIBRADO PARA TODO EL CARIBE.</span>
                  </h2>
                </div>
                <div class="lg:col-span-6 flex flex-col justify-between gap-4">
                  <p class="text-sm text-[#D4D4D8] leading-relaxed">
                    Integramos diariamente los juegos oficiales de Venezuela (LVBP), República Dominicana (LIDOM), México (LMP) y Puerto Rico (LBPRC) junto con el historial completo de MLB y Ligas Menores para medir el talento real bajo una misma regla.
                  </p>
                  <div class="flex flex-wrap gap-3">
                    <button
                      @click="cambiarVista('caribe')"
                      class="px-4 py-2 bg-white text-[#161616] text-xs font-bold uppercase tracking-wider hover:bg-[#E4E4E7] transition cursor-pointer"
                    >
                      Abrir Power Ranking & Simulador Caribe
                    </button>
                    <button
                      @click="cambiarVista('lvbp')"
                      class="px-4 py-2 bg-transparent text-white border border-[#52525B] text-xs font-bold uppercase tracking-wider hover:border-white transition cursor-pointer"
                    >
                      Explorar Rosters LVBP
                    </button>
                  </div>
                </div>
              </div>

              <div class="pt-10">
                <div class="flex items-center justify-between mb-6">
                  <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">
                    Top 6 Franquicias del Caribe · Temporada {{ metaCaribe.season }}
                  </span>
                  <button
                    @click="cambiarVista('caribe')"
                    class="text-xs font-bold uppercase tracking-wider text-white hover:underline cursor-pointer"
                  >
                    Ver las {{ metaCaribe.total_equipos }} franquicias →
                  </button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div
                    v-for="(eq, idx) in top6EquiposCaribe"
                    :key="eq.equipo"
                    @click="cambiarVista('caribe')"
                    class="bg-[#202023] border border-[#2E2E32] hover:border-white transition p-4 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div class="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA]">
                        <span>#{{ idx + 1 }}</span>
                        <span class="font-bold text-white">{{ eq.liga }}</span>
                      </div>
                      <div class="text-sm font-bold text-white mt-3 leading-snug">
                        {{ eq.equipo }}
                      </div>
                    </div>

                    <div class="mt-6 pt-3 border-t border-[#2E2E32]">
                      <div class="text-2xl font-black font-mono text-white">{{ eq.power.toFixed(1) }}</div>
                      <div class="text-[11px] font-mono text-[#A1A1AA] mt-0.5">
                        Bat {{ eq.p_bat }} · Pit {{ eq.p_pit }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </template>

      <!-- ======================================================= -->
      <!-- VISTA 2: PORTAL LVBP (POWER + WPA + IMPORTADOS)         -->
      <!-- ======================================================= -->
      <template v-else-if="vistaActiva === 'lvbp'">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <!-- Power Ranking LVBP -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xs font-bold uppercase tracking-[0.18em] text-[#52525B]">
                Power Ranking LVBP · Top 9 Bateadores + Top 8 Lanzadores
              </h2>
              <button v-if="filtroEquipo !== 'TODOS'" @click="filtroEquipo = 'TODOS'" class="text-xs font-bold text-[#1E3A5F] hover:underline cursor-pointer">
                Mostrar toda la liga
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <button
                v-for="(eq, idx) in rankingEquiposLvbp"
                :key="eq.equipo"
                @click="seleccionarEquipo(eq.equipo)"
                :class="[
                  'text-left p-3.5 border transition cursor-pointer',
                  filtroEquipo === eq.equipo
                    ? 'bg-[#161616] text-white border-[#161616]'
                    : 'bg-white text-[#18181B] border-[#E4E4E7] hover:border-[#161616]',
                ]"
              >
                <div class="flex items-center justify-between text-[11px] font-mono opacity-75">
                  <span class="font-bold">#{{ idx + 1 }}</span>
                  <span v-if="eq.anunciados > 0" class="px-1.5 py-0.2 bg-[#B84A39] text-white text-[10px]">
                    +{{ eq.anunciados }}
                  </span>
                </div>
                <div class="font-bold text-xs truncate mt-1.5" :title="eq.equipo">{{ eq.equipo }}</div>
                <div class="text-xl font-black font-mono mt-1">{{ eq.power.toFixed(1) }}</div>
                <div class="text-[11px] font-mono opacity-75 mt-0.5">Bat {{ eq.pBat }} · Pit {{ eq.pPit }}</div>
              </button>
            </div>
          </section>

          <!-- Filtros y Ordenamiento LVBP -->
          <section class="p-4 bg-white border border-[#E4E4E7] space-y-3">
            <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              <div class="flex-1">
                <input
                  v-model="busqueda"
                  type="text"
                  placeholder="Buscar pelotero LVBP por nombre o equipo..."
                  class="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#D4D4D8] text-sm text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#161616]"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <select v-model="filtroEquipo" class="px-3 py-2 bg-[#F4F4F2] border border-[#D4D4D8] text-xs font-semibold text-[#18181B] focus:outline-none focus:border-[#161616]">
                  <option value="TODOS">Todos los equipos</option>
                  <option v-for="eq in equiposUnicos" :key="eq" :value="eq">{{ eq }}</option>
                </select>

                <!-- Filtro Origen: Todos / Importados / Nativos -->
                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8] text-xs">
                  <button
                    @click="filtroOrigen = 'TODOS'"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroOrigen === 'TODOS' ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    Todos
                  </button>
                  <button
                    @click="filtroOrigen = 'IMPORTADOS'"
                    :class="['px-2.5 py-1 font-bold transition cursor-pointer', filtroOrigen === 'IMPORTADOS' ? 'bg-[#B84A39] text-white' : 'text-[#9A3425] hover:bg-[#B84A39]/10']"
                  >
                    Importados ({{ metaLvbp.total_importados }})
                  </button>
                  <button
                    @click="filtroOrigen = 'NATIVOS'"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroOrigen === 'NATIVOS' ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    Criollos
                  </button>
                </div>

                <!-- Filtro Rol -->
                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8] text-xs">
                  <button
                    v-for="r in ['TODOS', 'Bateador', 'Lanzador']"
                    :key="r"
                    @click="filtroRol = r"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroRol === r ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    {{ r === 'TODOS' ? 'Roles' : r + 'es' }}
                  </button>
                </div>

                <!-- Filtro Estado -->
                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8] text-xs">
                  <button
                    v-for="est in ['TODOS', 'Activo', 'Anunciado']"
                    :key="est"
                    @click="filtroEstado = est"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroEstado === est ? 'bg-[#1E3A5F] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    {{ est === 'TODOS' ? 'Estados' : est + 's' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Segunda fila: Selector de Ordenamiento Dual (Power vs WPA) + Muestra -->
            <div class="pt-3 border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold uppercase tracking-wider text-[10px] text-[#52525B]">Ordenar por:</span>
                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8]">
                  <button
                    @click="ordenarPor = 'power'"
                    :class="['px-2.5 py-1 font-bold transition cursor-pointer', ordenarPor === 'power' ? 'bg-[#1E3A5F] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    Power (0-100)
                  </button>
                  <button
                    @click="ordenarPor = 'wpa'"
                    :class="['px-2.5 py-1 font-bold transition cursor-pointer', ordenarPor === 'wpa' ? 'bg-[#1E3A5F] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    WPA {{ metaLvbp.season }}
                  </button>
                  <button
                    @click="ordenarPor = 'wpa_li'"
                    :class="['px-2.5 py-1 font-bold transition cursor-pointer', ordenarPor === 'wpa_li' ? 'bg-[#1E3A5F] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    WPA/LI
                  </button>
                </div>

                <button
                  @click="ordenDir = ordenDir === 'desc' ? 'asc' : 'desc'"
                  class="px-2.5 py-1 bg-[#F4F4F2] border border-[#D4D4D8] font-semibold text-[#161616] hover:border-[#161616] transition cursor-pointer"
                >
                  {{ ordenDir === 'desc' ? '↓ Mejores primero' : '↑ Peores primero' }}
                </button>
              </div>

              <label class="inline-flex items-center gap-2 font-medium text-[#52525B] cursor-pointer select-none">
                <input v-model="soloMuestraMinima" type="checkbox" class="accent-[#161616]" />
                Mín. 100 PA/BF (4 años)
              </label>
            </div>
          </section>

          <!-- Tabla Principal LVBP -->
          <section class="bg-white border border-[#E4E4E7] overflow-hidden">
            <div class="px-4 py-2.5 border-b border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#52525B]">
              <span>Mostrando <strong class="text-[#161616]">{{ jugadoresFiltrados.length }}</strong> peloteros</span>
              <span>Clic en cualquier fila para desplegar historial multi-liga</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#D4D4D8] text-[10px] font-bold uppercase tracking-wider text-[#52525B] bg-[#F4F4F2]">
                    <th class="py-3 px-4 w-12">#</th>
                    <th class="py-3 px-4">Pelotero</th>
                    <th class="py-3 px-4">Equipo</th>
                    <th class="py-3 px-4">Rol</th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#161616]" @click="ordenarPor = 'power'">
                      Power {{ ordenarPor === 'power' ? (ordenDir === 'desc' ? '↓' : '↑') : '' }}
                    </th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#161616]" @click="ordenarPor = 'wpa'">
                      WPA {{ metaLvbp.season }} {{ ordenarPor === 'wpa' ? (ordenDir === 'desc' ? '↓' : '↑') : '' }}
                    </th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#161616]" @click="ordenarPor = 'wpa_li'">
                      WPA/LI {{ ordenarPor === 'wpa_li' ? (ordenDir === 'desc' ? '↓' : '↑') : '' }}
                    </th>
                    <th class="py-3 px-4 text-right">Métrica Eq.</th>
                    <th class="py-3 px-4 text-right">Volumen 4a</th>
                    <th class="py-3 px-4 text-right">JJ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E4E4E7] text-sm">
                  <template v-for="(j, index) in jugadoresFiltrados" :key="j.player_id">
                    <tr @click="toggleExpandir(j.player_id)" class="hover:bg-[#F4F4F2]/70 transition cursor-pointer">
                      <td class="py-3 px-4 font-mono text-xs text-[#71717A]">{{ index + 1 }}</td>
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                          <img :src="headshotUrl(j.player_id)" :alt="j.nombre" class="w-9 h-9 rounded-full object-cover bg-[#F4F4F2] border border-[#E4E4E7] shrink-0" loading="lazy" />
                          <div>
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-bold text-[#161616] leading-tight">{{ j.nombre }}</span>
                              <span
                                v-if="j.es_importado"
                                :title="`Importado · ${j.pais_origen}`"
                                class="px-1.5 py-0.2 bg-[#B84A39]/12 text-[#9A3425] border border-[#B84A39]/30 text-[9px] font-extrabold uppercase tracking-wider"
                              >
                                IMP · {{ j.pais_origen }}
                              </span>
                              <span
                                v-if="j.estado === 'Anunciado'"
                                class="px-1.5 py-0.2 bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/25 text-[9px] font-bold uppercase"
                              >
                                Anunciado
                              </span>
                            </div>
                            <div class="text-[11px] text-[#71717A] font-mono">ID {{ j.player_id }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-4 text-xs font-medium text-[#3F3F46]">{{ j.equipo }}</td>
                      <td class="py-3 px-4 text-xs text-[#52525B]">{{ j.rol }}</td>
                      <td class="py-3 px-4 text-right">
                        <span :class="['inline-block px-2.5 py-0.5 font-mono font-bold text-xs border', colorRating(j.power_ranking)]">
                          {{ j.power_ranking.toFixed(1) }}
                        </span>
                      </td>
                      <td :class="['py-3 px-4 text-right font-mono text-xs', colorWpa(j.wpa)]">
                        {{ j.wpa > 0 ? '+' : '' }}{{ (j.wpa ?? 0).toFixed(2) }}
                      </td>
                      <td :class="['py-3 px-4 text-right font-mono text-xs', colorWpa(j.wpa_li)]">
                        {{ j.wpa_li > 0 ? '+' : '' }}{{ (j.wpa_li ?? 0).toFixed(2) }}
                      </td>
                      <td class="py-3 px-4 text-right font-mono text-xs text-[#18181B]">
                        <template v-if="j.rol === 'Lanzador'">
                          {{ j.kbb_eq >= 0 ? '+' : '' }}{{ j.kbb_eq.toFixed(2) }}% <span class="text-[#71717A]">K-BB%</span>
                        </template>
                        <template v-else>
                          {{ j.ops_eq.toFixed(3) }} <span class="text-[#71717A]">OPS</span>
                        </template>
                      </td>
                      <td class="py-3 px-4 text-right font-mono text-xs text-[#52525B]">
                        {{ j.rol === 'Lanzador' ? `${j.bf_4y} BF` : `${j.pa_4y} PA` }}
                      </td>
                      <td class="py-3 px-4 text-right font-mono text-xs text-[#18181B]">{{ j.juegos_lvbp }}</td>
                    </tr>

                    <!-- Ficha Expandida LVBP -->
                    <tr v-if="expandidoId === j.player_id" class="bg-[#FAFAFA]">
                      <td colspan="10" class="p-4 md:p-6 border-t border-b border-[#D4D4D8]">
                        <div class="space-y-6">
                          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
                            <h3 class="text-sm font-extrabold uppercase tracking-wide text-[#161616]">
                              Expediente Multi-Liga · {{ j.nombre }}
                            </h3>
                            <span class="text-xs font-mono text-[#52525B]">
                              Rating Bateo: <strong class="text-[#161616]">{{ j.rating_bateo }}</strong> ·
                              Rating Pitcheo: <strong class="text-[#161616]">{{ j.rating_picheo }}</strong> ·
                              pLI {{ metaLvbp.season }}: <strong class="text-[#161616]">{{ (j.pli ?? 0).toFixed(2) }}</strong>
                            </span>
                          </div>

                          <!-- Historial Bateo -->
                          <div v-if="j.historial_bateo && j.historial_bateo.length > 0">
                            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#52525B] mb-2">
                              Historial Ofensivo por Temporada y Totales por Liga
                            </h4>
                            <div class="overflow-x-auto bg-white border border-[#D4D4D8]">
                              <table class="w-full text-xs text-left whitespace-nowrap">
                                <thead class="bg-[#F4F4F2] text-[#52525B] uppercase text-[10px] border-b border-[#D4D4D8]">
                                  <tr>
                                    <th class="py-2 px-2.5">Año</th>
                                    <th class="py-2 px-2.5">Liga</th>
                                    <th class="py-2 px-2.5">Equipo</th>
                                    <th class="py-2 px-2 text-right">JJ</th>
                                    <th class="py-2 px-2 text-right">PA</th>
                                    <th class="py-2 px-2 text-right">VB</th>
                                    <th class="py-2 px-2 text-right">H</th>
                                    <th class="py-2 px-2 text-right">2B</th>
                                    <th class="py-2 px-2 text-right">3B</th>
                                    <th class="py-2 px-2 text-right">HR</th>
                                    <th class="py-2 px-2 text-right">CI</th>
                                    <th class="py-2 px-2 text-right">BB</th>
                                    <th class="py-2 px-2 text-right">SO</th>
                                    <th class="py-2 px-2 text-right">BR</th>
                                    <th class="py-2 px-2 text-right">AVG</th>
                                    <th class="py-2 px-2 text-right">OBP</th>
                                    <th class="py-2 px-2 text-right">SLG</th>
                                    <th class="py-2 px-2 text-right">OPS</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">ISO</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">BB%</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K%</th>
                                    <th class="py-2 px-2.5 text-right text-[#B84A39]">OPS Eq.</th>
                                  </tr>
                                </thead>
                                <tbody class="divide-y divide-[#E4E4E7] font-mono">
                                  <tr v-for="(h, idxH) in j.historial_bateo" :key="idxH" class="hover:bg-[#F4F4F2]/60">
                                    <td class="py-1.5 px-2.5 text-[#52525B]">{{ h.season }}</td>
                                    <td class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ h.liga }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#52525B]">{{ h.equipo || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ h.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-semibold">{{ h.pa }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.ab || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.h ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.d2 ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.d3 ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ h.hr ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.rbi ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.bb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.so ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.sb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.avg ? h.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.obp ? h.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.slg ? h.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ h.ops.toFixed(3) }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.iso != null ? h.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.bb_pct ? h.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.k_pct ? h.k_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ h.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                </tbody>
                                <tfoot v-if="calcularTotalesBateo(j.historial_bateo).carrera" class="border-t-2 border-[#161616] font-mono bg-[#F4F4F2]">
                                  <tr v-for="tot in calcularTotalesBateo(j.historial_bateo).porLiga" :key="tot.etiqueta" class="border-b border-[#D4D4D8]">
                                    <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ tot.etiqueta }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#71717A]">{{ tot.temporadas }} temp.</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.pa }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.d2 }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.d3 }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.hr }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.rbi }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.so }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.sb }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.pa > 0 ? tot.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.ops.toFixed(3) }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.ab > 0 ? tot.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.pa > 0 ? tot.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.pa > 0 ? tot.k_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ tot.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                  <tr class="bg-[#161616] text-white font-bold">
                                    <td colspan="2" class="py-2 px-2.5 font-sans">TOTAL CARRERA</td>
                                    <td class="py-2 px-2.5 font-sans text-[#A1A1AA]">{{ calcularTotalesBateo(j.historial_bateo).carrera.temporadas }} reg.</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.jj || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.pa }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.h }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.d2 }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.d3 }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.hr }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.rbi }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.so }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.sb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.pa > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops.toFixed(3) }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb_pct.toFixed(1) }}%</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.k_pct.toFixed(1) }}%</td>
                                    <td class="py-2 px-2.5 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <!-- Historial Pitcheo -->
                          <div v-if="j.historial_picheo && j.historial_picheo.length > 0">
                            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#52525B] mb-2">
                              Historial de Pitcheo por Temporada y Totales por Liga
                            </h4>
                            <div class="overflow-x-auto bg-white border border-[#D4D4D8]">
                              <table class="w-full text-xs text-left whitespace-nowrap">
                                <thead class="bg-[#F4F4F2] text-[#52525B] uppercase text-[10px] border-b border-[#D4D4D8]">
                                  <tr>
                                    <th class="py-2 px-2.5">Año</th>
                                    <th class="py-2 px-2.5">Liga</th>
                                    <th class="py-2 px-2.5">Equipo</th>
                                    <th class="py-2 px-2 text-right">JJ</th>
                                    <th class="py-2 px-2 text-right">JI</th>
                                    <th class="py-2 px-2 text-right">G-P</th>
                                    <th class="py-2 px-2 text-right">SV</th>
                                    <th class="py-2 px-2 text-right">IP</th>
                                    <th class="py-2 px-2 text-right">H</th>
                                    <th class="py-2 px-2 text-right">CL</th>
                                    <th class="py-2 px-2 text-right">HR</th>
                                    <th class="py-2 px-2 text-right">BB</th>
                                    <th class="py-2 px-2 text-right">SO</th>
                                    <th class="py-2 px-2 text-right">ERA</th>
                                    <th class="py-2 px-2 text-right">WHIP</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">FIP</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K/9</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">BB/9</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K-BB%</th>
                                    <th class="py-2 px-2.5 text-right text-[#B84A39]">K-BB% Eq.</th>
                                  </tr>
                                </thead>
                                <tbody class="divide-y divide-[#E4E4E7] font-mono">
                                  <tr v-for="(p, idxP) in j.historial_picheo" :key="idxP" class="hover:bg-[#F4F4F2]/60">
                                    <td class="py-1.5 px-2.5 text-[#52525B]">{{ p.season }}</td>
                                    <td class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ p.liga }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#52525B]">{{ p.equipo || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ p.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ p.ji ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.w ?? 0 }}-{{ p.l ?? 0 }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.sv ?? 0 }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ p.ip || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.h ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.er ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.hr ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.bb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-semibold">{{ p.so ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ p.era != null ? p.era.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.whip != null ? p.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.fip != null ? p.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.k9 ? p.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.bb9 ? p.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.kbb >= 0 ? '+' : '' }}{{ p.kbb.toFixed(2) }}%</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ p.kbb_eq >= 0 ? '+' : '' }}{{ p.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                </tbody>
                                <tfoot v-if="calcularTotalesPitcheo(j.historial_picheo).carrera" class="border-t-2 border-[#161616] font-mono bg-[#F4F4F2]">
                                  <tr v-for="tot in calcularTotalesPitcheo(j.historial_picheo).porLiga" :key="tot.etiqueta" class="border-b border-[#D4D4D8]">
                                    <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ tot.etiqueta }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#71717A]">{{ tot.temporadas }} temp.</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ji }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.w }}-{{ tot.l }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.sv }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.ip }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.er ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.hr }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.so }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.era != null ? tot.era.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.whip != null ? tot.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.fip != null ? tot.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.k9 != null ? tot.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.bb9 != null ? tot.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.kbb >= 0 ? '+' : '' }}{{ tot.kbb.toFixed(2) }}%</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ tot.kbb_eq >= 0 ? '+' : '' }}{{ tot.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                  <tr class="bg-[#161616] text-white font-bold">
                                    <td colspan="2" class="py-2 px-2.5 font-sans">TOTAL CARRERA</td>
                                    <td class="py-2 px-2.5 font-sans text-[#A1A1AA]">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.temporadas }} reg.</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.jj || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.ji }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.w }}-{{ calcularTotalesPitcheo(j.historial_picheo).carrera.l }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.sv }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.ip }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.h }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.er ?? '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.hr }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.so }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.era != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.era.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.whip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.fip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.k9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb.toFixed(2) }}%</td>
                                    <td class="py-2 px-2.5 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </template>

      <!-- ======================================================= -->
      <!-- VISTA 3: POWER RANKING CARIBE (4 LIGAS + IMPORTADOS)    -->
      <!-- ======================================================= -->
      <template v-else-if="vistaActiva === 'caribe'">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <!-- Simulador Serie del Caribe -->
          <section v-if="resultadoSimulacion" class="p-6 sm:p-8 bg-[#161616] text-white border border-[#27272A]">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#27272A]">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">
                  Simulador Serie del Caribe · Terreno Neutral (PF 1.00)
                </span>
                <h2 class="text-lg font-extrabold text-white mt-1">
                  Proyección de Duelo Interligas (Modelo Logístico + Poisson xR)
                </h2>
              </div>
              <span class="text-xs font-mono text-[#A1A1AA]">
                {{ metaCaribe.total_jugadores }} PELOTEROS EN ESCALA ÚNICA
              </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-11 gap-5 items-center">
              <div class="lg:col-span-4 space-y-2.5">
                <select v-model="simEquipoA" class="w-full px-3.5 py-2.5 bg-[#202023] border border-[#3F3F46] text-sm font-bold text-white focus:outline-none focus:border-white">
                  <option v-for="e in equiposCaribe" :key="e.equipo" :value="e.equipo">[{{ e.liga }}] {{ e.equipo }} ({{ e.power }})</option>
                </select>
                <div class="p-4 bg-[#202023] border border-[#2E2E32] flex items-center justify-between">
                  <div>
                    <div class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Probabilidad</div>
                    <div class="text-3xl font-black font-mono text-white mt-0.5">{{ resultadoSimulacion.probA }}%</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Carreras xR</div>
                    <div class="text-3xl font-black font-mono text-white mt-0.5">{{ resultadoSimulacion.xrA }}</div>
                  </div>
                </div>
              </div>

              <div class="lg:col-span-3 text-center space-y-1.5 py-2">
                <div class="inline-block px-3 py-1 bg-[#27272A] text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                  VS NEUTRAL
                </div>
                <div class="text-xs text-[#D4D4D8] pt-1">
                  Total Esperado: <strong class="font-mono text-white">{{ resultadoSimulacion.xrTotal }} carreras</strong>
                </div>
                <div class="text-[11px] font-mono text-[#A1A1AA]">
                  Bat {{ resultadoSimulacion.eqA.p_bat }} vs {{ resultadoSimulacion.eqB.p_bat }} ·
                  Pit {{ resultadoSimulacion.eqA.p_pit }} vs {{ resultadoSimulacion.eqB.p_pit }}
                </div>
              </div>

              <div class="lg:col-span-4 space-y-2.5">
                <select v-model="simEquipoB" class="w-full px-3.5 py-2.5 bg-[#202023] border border-[#3F3F46] text-sm font-bold text-white focus:outline-none focus:border-white">
                  <option v-for="e in equiposCaribe" :key="e.equipo" :value="e.equipo">[{{ e.liga }}] {{ e.equipo }} ({{ e.power }})</option>
                </select>
                <div class="p-4 bg-[#202023] border border-[#2E2E32] flex items-center justify-between">
                  <div>
                    <div class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Probabilidad</div>
                    <div class="text-3xl font-black font-mono text-white mt-0.5">{{ resultadoSimulacion.probB }}%</div>
                  </div>
                  <div class="text-right">
                    <div class="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Carreras xR</div>
                    <div class="text-3xl font-black font-mono text-white mt-0.5">{{ resultadoSimulacion.xrB }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Ranking Franquicias del Caribe -->
          <section>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="inline-flex bg-white p-1 border border-[#D4D4D8] text-xs">
                <button
                  v-for="lg in ['TODAS', 'LVBP', 'LIDOM', 'LMP', 'LBPRC']"
                  :key="lg"
                  @click="filtroLigaCaribe = lg; filtroEquipoCaribe = 'TODOS'"
                  :class="['px-3 py-1 font-bold uppercase tracking-wider transition cursor-pointer', filtroLigaCaribe === lg ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                >
                  {{ lg }}
                </button>
              </div>
              <button v-if="filtroEquipoCaribe !== 'TODOS'" @click="filtroEquipoCaribe = 'TODOS'" class="text-xs font-bold text-[#1E3A5F] hover:underline cursor-pointer">
                Limpiar filtro ({{ filtroEquipoCaribe }})
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              <button
                v-for="(eq, idx) in equiposCaribeFiltrados"
                :key="eq.equipo"
                @click="seleccionarEquipoCaribe(eq.equipo)"
                :class="[
                  'text-left p-3.5 border transition cursor-pointer',
                  filtroEquipoCaribe === eq.equipo
                    ? 'bg-[#161616] text-white border-[#161616]'
                    : 'bg-white text-[#18181B] border-[#E4E4E7] hover:border-[#161616]',
                ]"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono font-bold opacity-70">#{{ idx + 1 }}</span>
                  <span :class="['px-1.5 py-0.2 text-[10px] font-bold border', filtroEquipoCaribe === eq.equipo ? 'border-white/30 text-white' : badgeLiga(eq.liga)]">
                    {{ eq.liga }}
                  </span>
                </div>
                <div class="font-bold text-xs truncate mt-2" :title="eq.equipo">{{ eq.equipo }}</div>
                <div class="text-xl font-black font-mono mt-1">{{ eq.power.toFixed(1) }}</div>
                <div class="text-[11px] font-mono opacity-75 mt-0.5">Bat {{ eq.p_bat }} · Pit {{ eq.p_pit }}</div>
              </button>
            </div>
          </section>

          <!-- Top Peloteros del Caribe + Filtro Importados -->
          <section class="bg-white border border-[#E4E4E7] overflow-hidden">
            <div class="p-4 border-b border-[#E4E4E7] flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              <input
                v-model="busquedaCaribe"
                type="text"
                placeholder="Buscar entre los peloteros del Caribe (clic en un jugador para abrir expediente)..."
                class="flex-1 px-3.5 py-2 bg-[#F4F4F2] border border-[#D4D4D8] text-sm text-[#18181B] placeholder-[#71717A] focus:outline-none focus:border-[#161616]"
              />
              <div class="flex flex-wrap items-center gap-2">
                <!-- Filtro Importados Caribe -->
                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8] text-xs">
                  <button
                    @click="filtroOrigenCaribe = 'TODOS'"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroOrigenCaribe === 'TODOS' ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    Todos
                  </button>
                  <button
                    @click="filtroOrigenCaribe = 'IMPORTADOS'"
                    :class="['px-2.5 py-1 font-bold transition cursor-pointer', filtroOrigenCaribe === 'IMPORTADOS' ? 'bg-[#B84A39] text-white' : 'text-[#9A3425] hover:bg-[#B84A39]/10']"
                  >
                    Importados ({{ metaCaribe.total_importados }})
                  </button>
                  <button
                    @click="filtroOrigenCaribe = 'NATIVOS'"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroOrigenCaribe === 'NATIVOS' ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    Locales
                  </button>
                </div>

                <div class="inline-flex bg-[#F4F4F2] p-0.5 border border-[#D4D4D8] text-xs">
                  <button
                    v-for="r in ['TODOS', 'Bateador', 'Lanzador']"
                    :key="r"
                    @click="filtroRolCaribe = r"
                    :class="['px-2.5 py-1 font-semibold transition cursor-pointer', filtroRolCaribe === r ? 'bg-[#161616] text-white' : 'text-[#52525B] hover:text-[#161616]']"
                  >
                    {{ r === 'TODOS' ? 'Roles' : r + 'es' }}
                  </button>
                </div>

                <label class="inline-flex items-center gap-2 text-xs font-medium text-[#52525B] px-2 cursor-pointer select-none">
                  <input v-model="soloMuestraCaribe" type="checkbox" class="accent-[#161616]" />
                  Mín. 100 PA/BF
                </label>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#D4D4D8] text-[10px] font-bold uppercase tracking-wider text-[#52525B] bg-[#F4F4F2]">
                    <th class="py-3 px-4 w-12">#</th>
                    <th class="py-3 px-4">Pelotero</th>
                    <th class="py-3 px-4">Liga</th>
                    <th class="py-3 px-4">Equipo</th>
                    <th class="py-3 px-4">Rol</th>
                    <th class="py-3 px-4 text-right">Power (0-100)</th>
                    <th class="py-3 px-4 text-right">Métrica Eq.</th>
                    <th class="py-3 px-4 text-right">Volumen 4a</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E4E4E7] text-sm">
                  <template v-for="(j, index) in jugadoresCaribeFiltrados" :key="`${j.liga}-${j.player_id}`">
                    <tr @click="toggleExpandirCaribe(`${j.liga}-${j.player_id}`)" class="hover:bg-[#F4F4F2]/70 transition cursor-pointer">
                      <td class="py-2.5 px-4 font-mono text-xs text-[#71717A]">{{ index + 1 }}</td>
                      <td class="py-2.5 px-4">
                        <div class="flex items-center gap-3">
                          <img :src="headshotUrl(j.player_id)" :alt="j.nombre" class="w-8 h-8 rounded-full object-cover bg-[#F4F4F2] border border-[#E4E4E7] shrink-0" loading="lazy" />
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-[#161616]">{{ j.nombre }}</span>
                            <span
                              v-if="j.es_importado"
                              :title="`Importado · ${j.pais_origen}`"
                              class="px-1.5 py-0.2 bg-[#B84A39]/12 text-[#9A3425] border border-[#B84A39]/30 text-[9px] font-extrabold uppercase tracking-wider"
                            >
                              IMP · {{ j.pais_origen }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 px-4">
                        <span :class="['px-2 py-0.5 text-[10px] font-bold border', badgeLiga(j.liga)]">{{ j.liga }}</span>
                      </td>
                      <td class="py-2.5 px-4 text-xs font-medium text-[#3F3F46]">{{ j.equipo }}</td>
                      <td class="py-2.5 px-4 text-xs text-[#52525B]">{{ j.rol }}</td>
                      <td class="py-2.5 px-4 text-right">
                        <span :class="['inline-block px-2.5 py-0.5 font-mono font-bold text-xs border', colorRating(j.power_ranking)]">
                          {{ j.power_ranking.toFixed(1) }}
                        </span>
                      </td>
                      <td class="py-2.5 px-4 text-right font-mono text-xs text-[#18181B]">
                        <template v-if="j.rol === 'Lanzador'">
                          {{ j.kbb_eq >= 0 ? '+' : '' }}{{ j.kbb_eq.toFixed(2) }}% <span class="text-[#71717A]">K-BB%</span>
                        </template>
                        <template v-else>
                          {{ j.ops_eq.toFixed(3) }} <span class="text-[#71717A]">OPS</span>
                        </template>
                      </td>
                      <td class="py-2.5 px-4 text-right font-mono text-xs text-[#52525B]">
                        {{ j.rol === 'Lanzador' ? `${j.bf_4y} BF` : `${j.pa_4y} PA` }}
                      </td>
                    </tr>

                    <!-- Ficha Expandida Caribe -->
                    <tr v-if="expandidoCaribeKey === `${j.liga}-${j.player_id}`" class="bg-[#FAFAFA]">
                      <td colspan="8" class="p-4 md:p-6 border-t border-b border-[#D4D4D8]">
                        <div class="space-y-6">
                          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
                            <h3 class="text-sm font-extrabold uppercase tracking-wide text-[#161616]">
                              Expediente Multi-Liga · {{ j.nombre }} ({{ j.liga }})
                            </h3>
                            <span class="text-xs font-mono text-[#52525B]">
                              Rating Bateo: <strong class="text-[#161616]">{{ j.rating_bateo }}</strong> ·
                              Rating Pitcheo: <strong class="text-[#161616]">{{ j.rating_picheo }}</strong>
                            </span>
                          </div>

                          <div v-if="j.historial_bateo && j.historial_bateo.length > 0">
                            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#52525B] mb-2">
                              Historial Ofensivo por Temporada y Totales por Liga
                            </h4>
                            <div class="overflow-x-auto bg-white border border-[#D4D4D8]">
                              <table class="w-full text-xs text-left whitespace-nowrap">
                                <thead class="bg-[#F4F4F2] text-[#52525B] uppercase text-[10px] border-b border-[#D4D4D8]">
                                  <tr>
                                    <th class="py-2 px-2.5">Año</th>
                                    <th class="py-2 px-2.5">Liga</th>
                                    <th class="py-2 px-2.5">Equipo</th>
                                    <th class="py-2 px-2 text-right">JJ</th>
                                    <th class="py-2 px-2 text-right">PA</th>
                                    <th class="py-2 px-2 text-right">VB</th>
                                    <th class="py-2 px-2 text-right">H</th>
                                    <th class="py-2 px-2 text-right">2B</th>
                                    <th class="py-2 px-2 text-right">3B</th>
                                    <th class="py-2 px-2 text-right">HR</th>
                                    <th class="py-2 px-2 text-right">CI</th>
                                    <th class="py-2 px-2 text-right">BB</th>
                                    <th class="py-2 px-2 text-right">SO</th>
                                    <th class="py-2 px-2 text-right">BR</th>
                                    <th class="py-2 px-2 text-right">AVG</th>
                                    <th class="py-2 px-2 text-right">OBP</th>
                                    <th class="py-2 px-2 text-right">SLG</th>
                                    <th class="py-2 px-2 text-right">OPS</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">ISO</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">BB%</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K%</th>
                                    <th class="py-2 px-2.5 text-right text-[#B84A39]">OPS Eq.</th>
                                  </tr>
                                </thead>
                                <tbody class="divide-y divide-[#E4E4E7] font-mono">
                                  <tr v-for="(h, idxH) in j.historial_bateo" :key="idxH" class="hover:bg-[#F4F4F2]/60">
                                    <td class="py-1.5 px-2.5 text-[#52525B]">{{ h.season }}</td>
                                    <td class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ h.liga }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#52525B]">{{ h.equipo || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ h.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-semibold">{{ h.pa }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.ab || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.h ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.d2 ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.d3 ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ h.hr ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.rbi ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.bb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.so ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ h.sb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.avg ? h.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.obp ? h.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ h.slg ? h.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ h.ops.toFixed(3) }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.iso != null ? h.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.bb_pct ? h.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ h.k_pct ? h.k_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ h.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                </tbody>
                                <tfoot v-if="calcularTotalesBateo(j.historial_bateo).carrera" class="border-t-2 border-[#161616] font-mono bg-[#F4F4F2]">
                                  <tr v-for="tot in calcularTotalesBateo(j.historial_bateo).porLiga" :key="tot.etiqueta" class="border-b border-[#D4D4D8]">
                                    <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ tot.etiqueta }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#71717A]">{{ tot.temporadas }} temp.</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.pa }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.d2 }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.d3 }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.hr }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.rbi }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.so }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.sb }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.pa > 0 ? tot.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.ops.toFixed(3) }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.ab > 0 ? tot.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.pa > 0 ? tot.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.pa > 0 ? tot.k_pct.toFixed(1) + '%' : '—' }}</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ tot.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                  <tr class="bg-[#161616] text-white font-bold">
                                    <td colspan="2" class="py-2 px-2.5 font-sans">TOTAL CARRERA</td>
                                    <td class="py-2 px-2.5 font-sans text-[#A1A1AA]">{{ calcularTotalesBateo(j.historial_bateo).carrera.temporadas }} reg.</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.jj || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.pa }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.h }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.d2 }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.d3 }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.hr }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.rbi }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.so }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.sb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.avg.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.pa > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.obp.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.slg.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops.toFixed(3) }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.iso.toFixed(3) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb_pct.toFixed(1) }}%</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.k_pct.toFixed(1) }}%</td>
                                    <td class="py-2 px-2.5 text-right">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops_eq.toFixed(3) }}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div v-if="j.historial_picheo && j.historial_picheo.length > 0">
                            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#52525B] mb-2">
                              Historial de Pitcheo por Temporada y Totales por Liga
                            </h4>
                            <div class="overflow-x-auto bg-white border border-[#D4D4D8]">
                              <table class="w-full text-xs text-left whitespace-nowrap">
                                <thead class="bg-[#F4F4F2] text-[#52525B] uppercase text-[10px] border-b border-[#D4D4D8]">
                                  <tr>
                                    <th class="py-2 px-2.5">Año</th>
                                    <th class="py-2 px-2.5">Liga</th>
                                    <th class="py-2 px-2.5">Equipo</th>
                                    <th class="py-2 px-2 text-right">JJ</th>
                                    <th class="py-2 px-2 text-right">JI</th>
                                    <th class="py-2 px-2 text-right">G-P</th>
                                    <th class="py-2 px-2 text-right">SV</th>
                                    <th class="py-2 px-2 text-right">IP</th>
                                    <th class="py-2 px-2 text-right">H</th>
                                    <th class="py-2 px-2 text-right">CL</th>
                                    <th class="py-2 px-2 text-right">HR</th>
                                    <th class="py-2 px-2 text-right">BB</th>
                                    <th class="py-2 px-2 text-right">SO</th>
                                    <th class="py-2 px-2 text-right">ERA</th>
                                    <th class="py-2 px-2 text-right">WHIP</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">FIP</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K/9</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">BB/9</th>
                                    <th class="py-2 px-2 text-right text-[#1E3A5F]">K-BB%</th>
                                    <th class="py-2 px-2.5 text-right text-[#B84A39]">K-BB% Eq.</th>
                                  </tr>
                                </thead>
                                <tbody class="divide-y divide-[#E4E4E7] font-mono">
                                  <tr v-for="(p, idxP) in j.historial_picheo" :key="idxP" class="hover:bg-[#F4F4F2]/60">
                                    <td class="py-1.5 px-2.5 text-[#52525B]">{{ p.season }}</td>
                                    <td class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ p.liga }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#52525B]">{{ p.equipo || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ p.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#71717A]">{{ p.ji ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.w ?? 0 }}-{{ p.l ?? 0 }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.sv ?? 0 }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ p.ip || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.h ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.er ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.hr ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#52525B]">{{ p.bb ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-semibold">{{ p.so ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold text-[#161616]">{{ p.era != null ? p.era.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ p.whip != null ? p.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.fip != null ? p.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.k9 ? p.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.bb9 ? p.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ p.kbb >= 0 ? '+' : '' }}{{ p.kbb.toFixed(2) }}%</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ p.kbb_eq >= 0 ? '+' : '' }}{{ p.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                </tbody>
                                <tfoot v-if="calcularTotalesPitcheo(j.historial_picheo).carrera" class="border-t-2 border-[#161616] font-mono bg-[#F4F4F2]">
                                  <tr v-for="tot in calcularTotalesPitcheo(j.historial_picheo).porLiga" :key="tot.etiqueta" class="border-b border-[#D4D4D8]">
                                    <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-[#1E3A5F]">{{ tot.etiqueta }}</td>
                                    <td class="py-1.5 px-2.5 font-sans text-[#71717A]">{{ tot.temporadas }} temp.</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.ji }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.w }}-{{ tot.l }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.sv }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.ip }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.er ?? '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.hr }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.so }}</td>
                                    <td class="py-1.5 px-2 text-right font-bold">{{ tot.era != null ? tot.era.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right">{{ tot.whip != null ? tot.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.fip != null ? tot.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.k9 != null ? tot.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.bb9 != null ? tot.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-1.5 px-2 text-right text-[#1E3A5F]">{{ tot.kbb >= 0 ? '+' : '' }}{{ tot.kbb.toFixed(2) }}%</td>
                                    <td class="py-1.5 px-2.5 text-right font-bold text-[#B84A39]">{{ tot.kbb_eq >= 0 ? '+' : '' }}{{ tot.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                  <tr class="bg-[#161616] text-white font-bold">
                                    <td colspan="2" class="py-2 px-2.5 font-sans">TOTAL CARRERA</td>
                                    <td class="py-2 px-2.5 font-sans text-[#A1A1AA]">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.temporadas }} reg.</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.jj || '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.ji }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.w }}-{{ calcularTotalesPitcheo(j.historial_picheo).carrera.l }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.sv }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.ip }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.h }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.er ?? '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.hr }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.so }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.era != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.era.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.whip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.whip.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.fip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.fip.toFixed(2) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.k9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.k9.toFixed(1) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.bb9.toFixed(1) : '—' }}</td>
                                    <td class="py-2 px-2 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb.toFixed(2) }}%</td>
                                    <td class="py-2 px-2.5 text-right">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq.toFixed(2) }}%</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </template>
    </main>

    <!-- FOOTER EDITORIAL -->
    <footer class="bg-[#161616] text-[#A1A1AA] border-t border-[#27272A] mt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
        <div>
          <div class="text-white font-black tracking-tighter text-base uppercase">TIBUMÉTRICO</div>
          <p class="mt-2 leading-relaxed">
            Plataforma independiente de analítica sabermétrica para la Liga Venezolana de Béisbol Profesional y las ligas invernales del Caribe.
          </p>
        </div>
        <div>
          <div class="text-white font-bold uppercase tracking-wider mb-2">Secciones</div>
          <ul class="space-y-1.5">
            <li><button @click="cambiarVista('editorial')" class="hover:text-white cursor-pointer">Editorial & Análisis</button></li>
            <li><button @click="cambiarVista('lvbp')" class="hover:text-white cursor-pointer">Power Ranking & Expedientes LVBP</button></li>
            <li><button @click="cambiarVista('caribe')" class="hover:text-white cursor-pointer">Caribe 4 Ligas & Simulador</button></li>
          </ul>
        </div>
        <div>
          <div class="text-white font-bold uppercase tracking-wider mb-2">Comunidad & Datos</div>
          <p>X / Twitter: <strong class="text-white">@tibumetricoAI</strong></p>
          <p class="mt-1 font-mono text-[11px]">Actualización automatizada · MLB Stats API & DuckDB</p>
        </div>
      </div>
    </footer>
  </div>
</template>
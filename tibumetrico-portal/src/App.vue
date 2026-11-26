<script setup>
import { ref, computed, onMounted } from 'vue'

const vistaActiva = ref('lvbp') // 'lvbp' | 'caribe'
const cargando = ref(true)
const error = ref(null)

// Datos LVBP
const metaLvbp = ref({ season: 2026, fecha_corte: '', total_activos: 0, total_anunciados: 0 })
const jugadoresLvbp = ref([])

// Datos Caribe
const metaCaribe = ref({ season: 2026, total_equipos: 0, total_jugadores: 0 })
const equiposCaribe = ref([])
const jugadoresCaribe = ref([])

// Filtros LVBP
const busqueda = ref('')
const filtroEquipo = ref('TODOS')
const filtroRol = ref('TODOS')
const filtroEstado = ref('TODOS')
const soloMuestraMinima = ref(false)
const expandidoId = ref(null)

// Filtros Caribe
const busquedaCaribe = ref('')
const filtroLigaCaribe = ref('TODAS')
const filtroEquipoCaribe = ref('TODOS')
const filtroRolCaribe = ref('TODOS')
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
    }
    jugadoresLvbp.value = dataLvbp.jugadores || []

    if (resCaribe && resCaribe.ok) {
      const dataCaribe = await resCaribe.json()
      metaCaribe.value = {
        season: dataCaribe.season,
        total_equipos: dataCaribe.total_equipos,
        total_jugadores: dataCaribe.total_jugadores,
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

// --- Calculo de Totales por Liga y Carrera (estilo Baseball-Reference) ---
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
  return jugadoresLvbp.value.filter((j) => {
    if (filtroEquipo.value !== 'TODOS' && j.equipo !== filtroEquipo.value) return false
    if (filtroRol.value !== 'TODOS' && j.rol !== filtroRol.value) return false
    if (filtroEstado.value !== 'TODOS' && j.estado !== filtroEstado.value) return false
    if (soloMuestraMinima.value) {
      const vol = j.rol === 'Lanzador' ? j.bf_4y : j.pa_4y
      if (vol < 100) return false
    }
    if (q && !j.nombre.toLowerCase().includes(q) && !j.equipo.toLowerCase().includes(q)) return false
    return true
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
  if (val >= 78) return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  if (val >= 66) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (val >= 56) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  return 'bg-slate-800 text-slate-300 border-slate-700'
}

function badgeLiga(liga) {
  const map = {
    LVBP: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    LIDOM: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    LMP: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    LBPRC: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  return map[liga] || 'bg-slate-800 text-slate-300 border-slate-700'
}

function headshotUrl(pid) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${pid}/headshot/67/current`
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Tibumétrico Sabermetrics
            </span>
            <span class="text-xs text-slate-400">Temporada {{ metaLvbp.season }}</span>
          </div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
            {{ vistaActiva === 'lvbp' ? 'LVBP · Power Ranking & Expedientes Multi-Liga' : 'Serie del Caribe · Ranking Unificado (4 Ligas)' }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              @click="vistaActiva = 'lvbp'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                vistaActiva === 'lvbp' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white',
              ]"
            >
              LVBP ({{ metaLvbp.total_activos + metaLvbp.total_anunciados }})
            </button>
            <button
              v-if="equiposCaribe.length > 0"
              @click="vistaActiva = 'caribe'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5',
                vistaActiva === 'caribe' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white',
              ]"
            >
              <span>Caribe · 4 Ligas</span>
              <span class="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 text-cyan-300">
                {{ metaCaribe.total_equipos }} eq
              </span>
            </button>
          </div>

          <div class="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            Corte: <strong>{{ metaLvbp.fecha_corte || 'Hoy' }}</strong>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div v-if="cargando" class="text-center py-20 text-slate-400">Cargando base multi-liga...</div>
      <div v-else-if="error" class="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-sm">{{ error }}</div>

      <!-- ========================================================= -->
      <!-- VISTA 1: PORTAL LVBP                                      -->
      <!-- ========================================================= -->
      <template v-else-if="vistaActiva === 'lvbp'">
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Power Ranking LVBP (Top 9 Bateadores + Top 8 Lanzadores)
            </h2>
            <button v-if="filtroEquipo !== 'TODOS'" @click="filtroEquipo = 'TODOS'" class="text-xs text-cyan-400 hover:underline">
              Ver toda la liga
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <button
              v-for="(eq, idx) in rankingEquiposLvbp"
              :key="eq.equipo"
              @click="seleccionarEquipo(eq.equipo)"
              :class="[
                'text-left p-3 rounded-xl border transition cursor-pointer',
                filtroEquipo === eq.equipo
                  ? 'bg-cyan-950/50 border-cyan-400 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700',
              ]"
            >
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span class="font-bold text-slate-300">#{{ idx + 1 }}</span>
                <span v-if="eq.anunciados > 0" class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  +{{ eq.anunciados }} anun.
                </span>
              </div>
              <div class="font-semibold text-xs text-white truncate mt-1" :title="eq.equipo">{{ eq.equipo }}</div>
              <div class="text-lg font-extrabold text-cyan-300 mt-1">{{ eq.power.toFixed(1) }}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Bat {{ eq.pBat }} · Pit {{ eq.pPit }}</div>
            </button>
          </div>
        </section>

        <!-- Barra de Filtros LVBP -->
        <section class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div class="flex-1">
            <input
              v-model="busqueda"
              type="text"
              placeholder="Buscar pelotero LVBP por nombre o equipo..."
              class="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select v-model="filtroEquipo" class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-400">
              <option value="TODOS">Todos los equipos</option>
              <option v-for="eq in equiposUnicos" :key="eq" :value="eq">{{ eq }}</option>
            </select>

            <div class="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                v-for="r in ['TODOS', 'Bateador', 'Lanzador']"
                :key="r"
                @click="filtroRol = r"
                :class="['px-2.5 py-1 rounded-md font-medium transition cursor-pointer', filtroRol === r ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white']"
              >
                {{ r === 'TODOS' ? 'Todos' : r + 'es' }}
              </button>
            </div>

            <div class="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                v-for="est in ['TODOS', 'Activo', 'Anunciado']"
                :key="est"
                @click="filtroEstado = est"
                :class="['px-2.5 py-1 rounded-md font-medium transition cursor-pointer', filtroEstado === est ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white']"
              >
                {{ est === 'TODOS' ? 'Todos estados' : est + 's' }}
              </button>
            </div>

            <label class="inline-flex items-center gap-2 text-xs text-slate-300 px-2 cursor-pointer select-none">
              <input v-model="soloMuestraMinima" type="checkbox" class="rounded accent-cyan-400" />
              Mín. 100 PA/BF (4 años)
            </label>
          </div>
        </section>

        <!-- Tabla Principal LVBP -->
        <section class="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div class="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando <strong class="text-white">{{ jugadoresFiltrados.length }}</strong> peloteros</span>
            <span>Haz clic en un jugador para desplegar su historial y totales por liga</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <th class="py-3 px-4 w-12">#</th>
                  <th class="py-3 px-4">Pelotero</th>
                  <th class="py-3 px-4">Equipo</th>
                  <th class="py-3 px-4">Rol</th>
                  <th class="py-3 px-4">Estado</th>
                  <th class="py-3 px-4 text-right">Power (0-100)</th>
                  <th class="py-3 px-4 text-right">Métrica Eq. LVBP</th>
                  <th class="py-3 px-4 text-right">Volumen 4a</th>
                  <th class="py-3 px-4 text-right">JJ {{ metaLvbp.season }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80 text-sm">
                <template v-for="(j, index) in jugadoresFiltrados" :key="j.player_id">
                  <tr @click="toggleExpandir(j.player_id)" class="hover:bg-slate-800/50 transition cursor-pointer">
                    <td class="py-3 px-4 font-mono text-xs text-slate-500">{{ index + 1 }}</td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img :src="headshotUrl(j.player_id)" :alt="j.nombre" class="w-9 h-9 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0" loading="lazy" />
                        <div>
                          <div class="font-semibold text-white leading-tight">{{ j.nombre }}</div>
                          <div class="text-[11px] text-slate-500 font-mono">ID {{ j.player_id }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-300 text-xs">{{ j.equipo }}</td>
                    <td class="py-3 px-4 text-xs text-slate-300">{{ j.rol }}</td>
                    <td class="py-3 px-4">
                      <span :class="['px-2 py-0.5 rounded-full text-[11px] font-semibold border', j.estado === 'Activo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30']">
                        {{ j.estado }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span :class="['inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-sm border', colorRating(j.power_ranking)]">
                        {{ j.power_ranking.toFixed(1) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right font-mono text-xs text-slate-200">
                      <template v-if="j.rol === 'Lanzador'">
                        {{ j.kbb_eq >= 0 ? '+' : '' }}{{ j.kbb_eq.toFixed(2) }}% <span class="text-slate-500">K-BB%</span>
                      </template>
                      <template v-else>
                        {{ j.ops_eq.toFixed(3) }} <span class="text-slate-500">OPS</span>
                      </template>
                    </td>
                    <td class="py-3 px-4 text-right font-mono text-xs text-slate-400">
                      {{ j.rol === 'Lanzador' ? `${j.bf_4y} BF` : `${j.pa_4y} PA` }}
                    </td>
                    <td class="py-3 px-4 text-right font-mono text-xs text-slate-300">{{ j.juegos_lvbp }}</td>
                  </tr>

                  <!-- Ficha Expandida LVBP -->
                  <tr v-if="expandidoId === j.player_id" class="bg-slate-950/95">
                    <td colspan="9" class="p-4 md:p-6 border-t border-slate-800">
                      <div class="space-y-5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <h3 class="text-sm font-bold text-cyan-300">Expediente Multi-Liga de {{ j.nombre }}</h3>
                          <span class="text-xs text-slate-400">
                            Rating Bateo: <strong class="text-white">{{ j.rating_bateo }}</strong> ·
                            Rating Pitcheo: <strong class="text-white">{{ j.rating_picheo }}</strong>
                          </span>
                        </div>

                        <!-- Historial Bateo + Totales por Liga -->
                        <div v-if="j.historial_bateo && j.historial_bateo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial Ofensivo por Temporada y Totales por Liga
                          </h4>
                          <div class="overflow-x-auto rounded-lg border border-slate-800">
                            <table class="w-full text-xs text-left whitespace-nowrap">
                              <thead class="bg-slate-900 text-slate-400 uppercase text-[10px]">
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
                                  <th class="py-2 px-2 text-right text-cyan-300">ISO</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">BB%</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K%</th>
                                  <th class="py-2 px-2.5 text-right text-emerald-300">OPS Eq.</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-800/70 font-mono">
                                <tr v-for="(h, idxH) in j.historial_bateo" :key="idxH" class="hover:bg-slate-900/60">
                                  <td class="py-1.5 px-2.5 text-slate-300">{{ h.season }}</td>
                                  <td class="py-1.5 px-2.5 font-sans font-semibold text-cyan-200">{{ h.liga }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ h.equipo || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ h.pa }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.ab || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.h ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.d2 ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.d3 ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-white font-semibold">{{ h.hr ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.rbi ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.bb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.so ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.sb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.avg ? h.avg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.obp ? h.obp.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.slg ? h.slg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ h.ops.toFixed(3) }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.iso != null ? h.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.bb_pct ? h.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.k_pct ? h.k_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ h.ops_eq.toFixed(3) }}</td>
                                </tr>
                              </tbody>
                              <!-- Totales por Liga + Carrera (Baseball-Reference) -->
                              <tfoot v-if="calcularTotalesBateo(j.historial_bateo).carrera" class="border-t-2 border-slate-700 font-mono bg-slate-900/90">
                                <tr v-for="tot in calcularTotalesBateo(j.historial_bateo).porLiga" :key="tot.etiqueta" class="border-b border-slate-800/80 text-slate-200">
                                  <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-cyan-300">{{ tot.etiqueta }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ tot.temporadas }} temp.</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold">{{ tot.pa }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.d2 }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.d3 }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.hr }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.rbi }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.so }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.sb }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.avg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.pa > 0 ? tot.obp.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.slg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.ops.toFixed(3) }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.ab > 0 ? tot.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.pa > 0 ? tot.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.pa > 0 ? tot.k_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ tot.ops_eq.toFixed(3) }}</td>
                                </tr>
                                <tr class="bg-slate-800/80 text-white font-bold">
                                  <td colspan="2" class="py-2 px-2.5 font-sans text-amber-300">TOTAL CARRERA</td>
                                  <td class="py-2 px-2.5 font-sans text-slate-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.temporadas }} reg.</td>
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
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb_pct.toFixed(1) }}%</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.k_pct.toFixed(1) }}%</td>
                                  <td class="py-2 px-2.5 text-right text-emerald-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops_eq.toFixed(3) }}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        <!-- Historial Pitcheo + Totales por Liga -->
                        <div v-if="j.historial_picheo && j.historial_picheo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial de Pitcheo por Temporada y Totales por Liga
                          </h4>
                          <div class="overflow-x-auto rounded-lg border border-slate-800">
                            <table class="w-full text-xs text-left whitespace-nowrap">
                              <thead class="bg-slate-900 text-slate-400 uppercase text-[10px]">
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
                                  <th class="py-2 px-2 text-right text-cyan-300">FIP</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K/9</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">BB/9</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K-BB%</th>
                                  <th class="py-2 px-2.5 text-right text-emerald-300">K-BB% Eq.</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-800/70 font-mono">
                                <tr v-for="(p, idxP) in j.historial_picheo" :key="idxP" class="hover:bg-slate-900/60">
                                  <td class="py-1.5 px-2.5 text-slate-300">{{ p.season }}</td>
                                  <td class="py-1.5 px-2.5 font-sans font-semibold text-cyan-200">{{ p.liga }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ p.equipo || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.ji ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ p.w ?? 0 }}-{{ p.l ?? 0 }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ p.sv ?? 0 }}</td>
                                  <td class="py-1.5 px-2 text-right text-white font-semibold">{{ p.ip || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.h ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.er ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.hr ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.bb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ p.so ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ p.era != null ? p.era.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ p.whip != null ? p.whip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.fip != null ? p.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.k9 ? p.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.bb9 ? p.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.kbb >= 0 ? '+' : '' }}{{ p.kbb.toFixed(2) }}%</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ p.kbb_eq >= 0 ? '+' : '' }}{{ p.kbb_eq.toFixed(2) }}%</td>
                                </tr>
                              </tbody>
                              <!-- Totales por Liga + Carrera (Baseball-Reference) -->
                              <tfoot v-if="calcularTotalesPitcheo(j.historial_picheo).carrera" class="border-t-2 border-slate-700 font-mono bg-slate-900/90">
                                <tr v-for="tot in calcularTotalesPitcheo(j.historial_picheo).porLiga" :key="tot.etiqueta" class="border-b border-slate-800/80 text-slate-200">
                                  <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-cyan-300">{{ tot.etiqueta }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ tot.temporadas }} temp.</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ji }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.w }}-{{ tot.l }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.sv }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.ip }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.er ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.hr }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.so }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.era != null ? tot.era.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.whip != null ? tot.whip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.fip != null ? tot.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.k9 != null ? tot.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.bb9 != null ? tot.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.kbb >= 0 ? '+' : '' }}{{ tot.kbb.toFixed(2) }}%</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ tot.kbb_eq >= 0 ? '+' : '' }}{{ tot.kbb_eq.toFixed(2) }}%</td>
                                </tr>
                                <tr class="bg-slate-800/80 text-white font-bold">
                                  <td colspan="2" class="py-2 px-2.5 font-sans text-amber-300">TOTAL CARRERA</td>
                                  <td class="py-2 px-2.5 font-sans text-slate-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.temporadas }} reg.</td>
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
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.fip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.k9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb.toFixed(2) }}%</td>
                                  <td class="py-2 px-2.5 text-right text-emerald-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq.toFixed(2) }}%</td>
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
      </template>

      <!-- ========================================================= -->
      <!-- VISTA 2: POWER RANKING CARIBE (4 LIGAS + SIMULADOR)       -->
      <!-- ========================================================= -->
      <template v-else-if="vistaActiva === 'caribe'">
        <!-- Simulador Serie del Caribe -->
        <section v-if="resultadoSimulacion" class="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Simulador Serie del Caribe · Terreno Neutral (PF 1.00)
              </span>
              <h2 class="text-base font-bold text-white">Proyección de Duelo Interligas (Modelo Logístico + Poisson xR)</h2>
            </div>
            <span class="text-xs text-slate-400">{{ metaCaribe.total_jugadores }} peloteros activos en escala unificada</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
            <div class="lg:col-span-4 space-y-2">
              <select v-model="simEquipoA" class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400">
                <option v-for="e in equiposCaribe" :key="e.equipo" :value="e.equipo">[{{ e.liga }}] {{ e.equipo }} ({{ e.power }})</option>
              </select>
              <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-xs text-slate-400">Probabilidad Victoria</div>
                  <div class="text-2xl font-black text-cyan-300">{{ resultadoSimulacion.probA }}%</div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-slate-400">Carreras xR</div>
                  <div class="text-2xl font-black text-white">{{ resultadoSimulacion.xrA }}</div>
                </div>
              </div>
            </div>

            <div class="lg:col-span-3 text-center space-y-1">
              <div class="inline-block px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-300">VS NEUTRAL</div>
              <div class="text-xs text-slate-400 pt-1">Total Proyectado: <strong class="text-emerald-300">{{ resultadoSimulacion.xrTotal }} carreras</strong></div>
              <div class="text-[11px] text-slate-500">
                Bat {{ resultadoSimulacion.eqA.p_bat }} vs {{ resultadoSimulacion.eqB.p_bat }} ·
                Pit {{ resultadoSimulacion.eqA.p_pit }} vs {{ resultadoSimulacion.eqB.p_pit }}
              </div>
            </div>

            <div class="lg:col-span-4 space-y-2">
              <select v-model="simEquipoB" class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400">
                <option v-for="e in equiposCaribe" :key="e.equipo" :value="e.equipo">[{{ e.liga }}] {{ e.equipo }} ({{ e.power }})</option>
              </select>
              <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-xs text-slate-400">Probabilidad Victoria</div>
                  <div class="text-2xl font-black text-amber-300">{{ resultadoSimulacion.probB }}%</div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-slate-400">Carreras xR</div>
                  <div class="text-2xl font-black text-white">{{ resultadoSimulacion.xrB }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Ranking Franquicias del Caribe -->
        <section>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
              <button
                v-for="lg in ['TODAS', 'LVBP', 'LIDOM', 'LMP', 'LBPRC']"
                :key="lg"
                @click="filtroLigaCaribe = lg; filtroEquipoCaribe = 'TODOS'"
                :class="['px-3 py-1 rounded-md font-bold transition cursor-pointer', filtroLigaCaribe === lg ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white']"
              >
                {{ lg }}
              </button>
            </div>
            <button v-if="filtroEquipoCaribe !== 'TODOS'" @click="filtroEquipoCaribe = 'TODOS'" class="text-xs text-cyan-400 hover:underline">
              Limpiar filtro de equipo ({{ filtroEquipoCaribe }})
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <button
              v-for="(eq, idx) in equiposCaribeFiltrados"
              :key="eq.equipo"
              @click="seleccionarEquipoCaribe(eq.equipo)"
              :class="[
                'text-left p-3 rounded-xl border transition cursor-pointer',
                filtroEquipoCaribe === eq.equipo
                  ? 'bg-cyan-950/50 border-cyan-400 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700',
              ]"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-400">#{{ idx + 1 }}</span>
                <span :class="['px-1.5 py-0.2 rounded text-[10px] font-bold border', badgeLiga(eq.liga)]">{{ eq.liga }}</span>
              </div>
              <div class="font-semibold text-xs text-white truncate mt-1.5" :title="eq.equipo">{{ eq.equipo }}</div>
              <div class="text-lg font-extrabold text-cyan-300 mt-1">{{ eq.power.toFixed(1) }}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Bat {{ eq.p_bat }} · Pit {{ eq.p_pit }}</div>
            </button>
          </div>
        </section>

        <!-- Top Peloteros del Caribe con Ficha Expandible -->
        <section class="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div class="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <input
              v-model="busquedaCaribe"
              type="text"
              placeholder="Buscar entre los 1,440 peloteros del Caribe (clic en un jugador para ver su expediente)..."
              class="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <div class="flex flex-wrap items-center gap-2">
              <div class="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  v-for="r in ['TODOS', 'Bateador', 'Lanzador']"
                  :key="r"
                  @click="filtroRolCaribe = r"
                  :class="['px-2.5 py-1 rounded-md font-medium transition cursor-pointer', filtroRolCaribe === r ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white']"
                >
                  {{ r === 'TODOS' ? 'Todos' : r + 'es' }}
                </button>
              </div>
              <label class="inline-flex items-center gap-2 text-xs text-slate-300 px-2 cursor-pointer select-none">
                <input v-model="soloMuestraCaribe" type="checkbox" class="rounded accent-cyan-400" />
                Mín. 100 PA/BF
              </label>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
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
              <tbody class="divide-y divide-slate-800/80 text-sm">
                <template v-for="(j, index) in jugadoresCaribeFiltrados" :key="`${j.liga}-${j.player_id}`">
                  <tr @click="toggleExpandirCaribe(`${j.liga}-${j.player_id}`)" class="hover:bg-slate-800/40 transition cursor-pointer">
                    <td class="py-2.5 px-4 font-mono text-xs text-slate-500">{{ index + 1 }}</td>
                    <td class="py-2.5 px-4">
                      <div class="flex items-center gap-3">
                        <img :src="headshotUrl(j.player_id)" :alt="j.nombre" class="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0" loading="lazy" />
                        <span class="font-semibold text-white">{{ j.nombre }}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-4">
                      <span :class="['px-2 py-0.5 rounded text-[11px] font-bold border', badgeLiga(j.liga)]">{{ j.liga }}</span>
                    </td>
                    <td class="py-2.5 px-4 text-xs text-slate-300">{{ j.equipo }}</td>
                    <td class="py-2.5 px-4 text-xs text-slate-400">{{ j.rol }}</td>
                    <td class="py-2.5 px-4 text-right">
                      <span :class="['inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-sm border', colorRating(j.power_ranking)]">
                        {{ j.power_ranking.toFixed(1) }}
                      </span>
                    </td>
                    <td class="py-2.5 px-4 text-right font-mono text-xs text-slate-200">
                      <template v-if="j.rol === 'Lanzador'">
                        {{ j.kbb_eq >= 0 ? '+' : '' }}{{ j.kbb_eq.toFixed(2) }}% <span class="text-slate-500">K-BB%</span>
                      </template>
                      <template v-else>
                        {{ j.ops_eq.toFixed(3) }} <span class="text-slate-500">OPS</span>
                      </template>
                    </td>
                    <td class="py-2.5 px-4 text-right font-mono text-xs text-slate-400">
                      {{ j.rol === 'Lanzador' ? `${j.bf_4y} BF` : `${j.pa_4y} PA` }}
                    </td>
                  </tr>

                  <!-- Ficha Expandida Caribe -->
                  <tr v-if="expandidoCaribeKey === `${j.liga}-${j.player_id}`" class="bg-slate-950/95">
                    <td colspan="8" class="p-4 md:p-6 border-t border-slate-800">
                      <div class="space-y-5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <h3 class="text-sm font-bold text-cyan-300">Expediente Multi-Liga de {{ j.nombre }} ({{ j.liga }})</h3>
                          <span class="text-xs text-slate-400">
                            Rating Bateo: <strong class="text-white">{{ j.rating_bateo }}</strong> ·
                            Rating Pitcheo: <strong class="text-white">{{ j.rating_picheo }}</strong>
                          </span>
                        </div>

                        <!-- Historial Bateo Caribe -->
                        <div v-if="j.historial_bateo && j.historial_bateo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial Ofensivo por Temporada y Totales por Liga
                          </h4>
                          <div class="overflow-x-auto rounded-lg border border-slate-800">
                            <table class="w-full text-xs text-left whitespace-nowrap">
                              <thead class="bg-slate-900 text-slate-400 uppercase text-[10px]">
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
                                  <th class="py-2 px-2 text-right text-cyan-300">ISO</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">BB%</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K%</th>
                                  <th class="py-2 px-2.5 text-right text-emerald-300">OPS Eq.</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-800/70 font-mono">
                                <tr v-for="(h, idxH) in j.historial_bateo" :key="idxH" class="hover:bg-slate-900/60">
                                  <td class="py-1.5 px-2.5 text-slate-300">{{ h.season }}</td>
                                  <td class="py-1.5 px-2.5 font-sans font-semibold text-cyan-200">{{ h.liga }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ h.equipo || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ h.pa }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.ab || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.h ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.d2 ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.d3 ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-white font-semibold">{{ h.hr ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ h.rbi ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.bb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.so ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ h.sb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.avg ? h.avg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.obp ? h.obp.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ h.slg ? h.slg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ h.ops.toFixed(3) }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.iso != null ? h.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.bb_pct ? h.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ h.k_pct ? h.k_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ h.ops_eq.toFixed(3) }}</td>
                                </tr>
                              </tbody>
                              <tfoot v-if="calcularTotalesBateo(j.historial_bateo).carrera" class="border-t-2 border-slate-700 font-mono bg-slate-900/90">
                                <tr v-for="tot in calcularTotalesBateo(j.historial_bateo).porLiga" :key="tot.etiqueta" class="border-b border-slate-800/80 text-slate-200">
                                  <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-cyan-300">{{ tot.etiqueta }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ tot.temporadas }} temp.</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold">{{ tot.pa }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.d2 }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.d3 }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.hr }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.rbi }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.so }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.sb }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.avg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.pa > 0 ? tot.obp.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ab > 0 ? tot.slg.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.ops.toFixed(3) }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.ab > 0 ? tot.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.pa > 0 ? tot.bb_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.pa > 0 ? tot.k_pct.toFixed(1) + '%' : '—' }}</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ tot.ops_eq.toFixed(3) }}</td>
                                </tr>
                                <tr class="bg-slate-800/80 text-white font-bold">
                                  <td colspan="2" class="py-2 px-2.5 font-sans text-amber-300">TOTAL CARRERA</td>
                                  <td class="py-2 px-2.5 font-sans text-slate-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.temporadas }} reg.</td>
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
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.ab > 0 ? calcularTotalesBateo(j.historial_bateo).carrera.iso.toFixed(3) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.bb_pct.toFixed(1) }}%</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.k_pct.toFixed(1) }}%</td>
                                  <td class="py-2 px-2.5 text-right text-emerald-300">{{ calcularTotalesBateo(j.historial_bateo).carrera.ops_eq.toFixed(3) }}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        <!-- Historial Pitcheo Caribe -->
                        <div v-if="j.historial_picheo && j.historial_picheo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial de Pitcheo por Temporada y Totales por Liga
                          </h4>
                          <div class="overflow-x-auto rounded-lg border border-slate-800">
                            <table class="w-full text-xs text-left whitespace-nowrap">
                              <thead class="bg-slate-900 text-slate-400 uppercase text-[10px]">
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
                                  <th class="py-2 px-2 text-right text-cyan-300">FIP</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K/9</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">BB/9</th>
                                  <th class="py-2 px-2 text-right text-cyan-300">K-BB%</th>
                                  <th class="py-2 px-2.5 text-right text-emerald-300">K-BB% Eq.</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-800/70 font-mono">
                                <tr v-for="(p, idxP) in j.historial_picheo" :key="idxP" class="hover:bg-slate-900/60">
                                  <td class="py-1.5 px-2.5 text-slate-300">{{ p.season }}</td>
                                  <td class="py-1.5 px-2.5 font-sans font-semibold text-cyan-200">{{ p.liga }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ p.equipo || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.ji ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ p.w ?? 0 }}-{{ p.l ?? 0 }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-300">{{ p.sv ?? 0 }}</td>
                                  <td class="py-1.5 px-2 text-right text-white font-semibold">{{ p.ip || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.h ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.er ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.hr ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-400">{{ p.bb ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ p.so ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ p.era != null ? p.era.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-slate-200">{{ p.whip != null ? p.whip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.fip != null ? p.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.k9 ? p.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.bb9 ? p.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ p.kbb >= 0 ? '+' : '' }}{{ p.kbb.toFixed(2) }}%</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ p.kbb_eq >= 0 ? '+' : '' }}{{ p.kbb_eq.toFixed(2) }}%</td>
                                </tr>
                              </tbody>
                              <tfoot v-if="calcularTotalesPitcheo(j.historial_picheo).carrera" class="border-t-2 border-slate-700 font-mono bg-slate-900/90">
                                <tr v-for="tot in calcularTotalesPitcheo(j.historial_picheo).porLiga" :key="tot.etiqueta" class="border-b border-slate-800/80 text-slate-200">
                                  <td colspan="2" class="py-1.5 px-2.5 font-sans font-bold text-cyan-300">{{ tot.etiqueta }}</td>
                                  <td class="py-1.5 px-2.5 font-sans text-slate-400">{{ tot.temporadas }} temp.</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.jj || '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.ji }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.w }}-{{ tot.l }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.sv }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.ip }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.h }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.er ?? '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.hr }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.bb }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.so }}</td>
                                  <td class="py-1.5 px-2 text-right font-semibold text-white">{{ tot.era != null ? tot.era.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right">{{ tot.whip != null ? tot.whip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.fip != null ? tot.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.k9 != null ? tot.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.bb9 != null ? tot.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-1.5 px-2 text-right text-cyan-300">{{ tot.kbb >= 0 ? '+' : '' }}{{ tot.kbb.toFixed(2) }}%</td>
                                  <td class="py-1.5 px-2.5 text-right font-bold text-emerald-300">{{ tot.kbb_eq >= 0 ? '+' : '' }}{{ tot.kbb_eq.toFixed(2) }}%</td>
                                </tr>
                                <tr class="bg-slate-800/80 text-white font-bold">
                                  <td colspan="2" class="py-2 px-2.5 font-sans text-amber-300">TOTAL CARRERA</td>
                                  <td class="py-2 px-2.5 font-sans text-slate-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.temporadas }} reg.</td>
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
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.fip != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.fip.toFixed(2) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.k9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.k9.toFixed(1) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.bb9 != null ? calcularTotalesPitcheo(j.historial_picheo).carrera.bb9.toFixed(1) : '—' }}</td>
                                  <td class="py-2 px-2 text-right text-cyan-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb.toFixed(2) }}%</td>
                                  <td class="py-2 px-2.5 text-right text-emerald-300">{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq >= 0 ? '+' : '' }}{{ calcularTotalesPitcheo(j.historial_picheo).carrera.kbb_eq.toFixed(2) }}%</td>
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
      </template>
    </main>
  </div>
</template>
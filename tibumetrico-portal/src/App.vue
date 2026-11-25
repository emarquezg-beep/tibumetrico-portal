<script setup>
import { ref, computed, onMounted } from 'vue'

const cargando = ref(true)
const error = ref(null)
const meta = ref({
  season: 2026,
  fecha_corte: '',
  generado_utc: '',
  total_jugadores: 0,
  total_activos: 0,
  total_anunciados: 0,
})
const jugadores = ref([])

// Filtros UI
const busqueda = ref('')
const filtroEquipo = ref('TODOS')
const filtroRol = ref('TODOS') // TODOS | Bateador | Lanzador
const filtroEstado = ref('TODOS') // TODOS | Activo | Anunciado
const soloMuestraMinima = ref(false)
const expandidoId = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/data/portal_jugadores.json', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    meta.value = {
      season: data.season,
      fecha_corte: data.fecha_corte,
      generado_utc: data.generado_utc,
      total_jugadores: data.total_jugadores,
      total_activos: data.total_activos,
      total_anunciados: data.total_anunciados,
    }
    jugadores.value = data.jugadores || []
  } catch (e) {
    error.value = `No se pudo cargar portal_jugadores.json: ${e.message}`
  } finally {
    cargando.value = false
  }
})

const equiposUnicos = computed(() => {
  const set = new Set(jugadores.value.map((j) => j.equipo).filter(Boolean))
  return Array.from(set).sort()
})

// Power Ranking por franquicia (Top 9 Bateadores + Top 8 Lanzadores)
const rankingEquipos = computed(() => {
  const mapa = {}
  for (const j of jugadores.value) {
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
  return jugadores.value.filter((j) => {
    if (filtroEquipo.value !== 'TODOS' && j.equipo !== filtroEquipo.value) return false
    if (filtroRol.value !== 'TODOS' && j.rol !== filtroRol.value) return false
    if (filtroEstado.value !== 'TODOS' && j.estado !== filtroEstado.value) return false
    if (soloMuestraMinima.value) {
      const vol = j.rol === 'Lanzador' ? j.bf_4y : j.pa_4y
      if (vol < 100) return false
    }
    if (q && !j.nombre.toLowerCase().includes(q) && !j.equipo.toLowerCase().includes(q)) {
      return false
    }
    return true
  })
})

function toggleExpandir(pid) {
  expandidoId.value = expandidoId.value === pid ? null : pid
}

function seleccionarEquipo(eq) {
  filtroEquipo.value = filtroEquipo.value === eq ? 'TODOS' : eq
}

function colorRating(val) {
  if (val >= 78) return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  if (val >= 66) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (val >= 56) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  return 'bg-slate-800 text-slate-300 border-slate-700'
}

function headshotUrl(pid) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${pid}/headshot/67/current`
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Tibumétrico LVBP
            </span>
            <span class="text-xs text-slate-400">Temporada {{ meta.season }}</span>
          </div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
            Power Ranking Multi-Liga &amp; Expediente de Jugadores
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <span class="text-slate-400">Activos:</span>
            <strong class="text-emerald-400 ml-1">{{ meta.total_activos }}</strong>
          </div>
          <div class="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <span class="text-slate-400">Anunciados:</span>
            <strong class="text-amber-400 ml-1">{{ meta.total_anunciados }}</strong>
          </div>
          <div class="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
            Corte: <strong>{{ meta.fecha_corte || 'Hoy' }}</strong>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div v-if="cargando" class="text-center py-20 text-slate-400">
        Cargando base multi-liga LVBP...
      </div>

      <div v-else-if="error" class="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-sm">
        {{ error }}
      </div>

      <template v-else>
        <!-- Power Ranking por Franquicia -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Power Ranking por Franquicia (Top 9 Bateadores + Top 8 Lanzadores)
            </h2>
            <button
              v-if="filtroEquipo !== 'TODOS'"
              @click="filtroEquipo = 'TODOS'"
              class="text-xs text-cyan-400 hover:underline"
            >
              Ver toda la liga
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <button
              v-for="(eq, idx) in rankingEquipos"
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
                <span
                  v-if="eq.anunciados > 0"
                  class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]"
                >
                  +{{ eq.anunciados }} anun.
                </span>
              </div>
              <div class="font-semibold text-xs text-white truncate mt-1" :title="eq.equipo">
                {{ eq.equipo }}
              </div>
              <div class="text-lg font-extrabold text-cyan-300 mt-1">
                {{ eq.power.toFixed(1) }}
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                Bat {{ eq.pBat }} · Pit {{ eq.pPit }}
              </div>
            </button>
          </div>
        </section>

        <!-- Barra de Filtros -->
        <section class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div class="flex-1">
            <input
              v-model="busqueda"
              type="text"
              placeholder="Buscar pelotero por nombre o equipo..."
              class="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="filtroEquipo"
              class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="TODOS">Todos los equipos</option>
              <option v-for="eq in equiposUnicos" :key="eq" :value="eq">{{ eq }}</option>
            </select>

            <div class="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                v-for="r in ['TODOS', 'Bateador', 'Lanzador']"
                :key="r"
                @click="filtroRol = r"
                :class="[
                  'px-2.5 py-1 rounded-md font-medium transition cursor-pointer',
                  filtroRol === r ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white',
                ]"
              >
                {{ r === 'TODOS' ? 'Todos' : r + 'es' }}
              </button>
            </div>

            <div class="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                v-for="est in ['TODOS', 'Activo', 'Anunciado']"
                :key="est"
                @click="filtroEstado = est"
                :class="[
                  'px-2.5 py-1 rounded-md font-medium transition cursor-pointer',
                  filtroEstado === est ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white',
                ]"
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

        <!-- Tabla Principal -->
        <section class="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div class="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando <strong class="text-white">{{ jugadoresFiltrados.length }}</strong> peloteros</span>
            <span>Haz clic en un jugador para desplegar su historial multi-liga</span>
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
                  <th class="py-3 px-4 text-right">JJ {{ meta.season }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80 text-sm">
                <template v-for="(j, index) in jugadoresFiltrados" :key="j.player_id">
                  <tr
                    @click="toggleExpandir(j.player_id)"
                    class="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td class="py-3 px-4 font-mono text-xs text-slate-500">{{ index + 1 }}</td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img
                          :src="headshotUrl(j.player_id)"
                          :alt="j.nombre"
                          class="w-9 h-9 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0"
                          loading="lazy"
                        />
                        <div>
                          <div class="font-semibold text-white leading-tight">{{ j.nombre }}</div>
                          <div class="text-[11px] text-slate-500 font-mono">ID {{ j.player_id }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-300 text-xs">{{ j.equipo }}</td>
                    <td class="py-3 px-4 text-xs text-slate-300">{{ j.rol }}</td>
                    <td class="py-3 px-4">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                          j.estado === 'Activo'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                        ]"
                      >
                        {{ j.estado }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span
                        :class="[
                          'inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-sm border',
                          colorRating(j.power_ranking),
                        ]"
                      >
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
                    <td class="py-3 px-4 text-right font-mono text-xs text-slate-300">
                      {{ j.juegos_lvbp }}
                    </td>
                  </tr>

                  <!-- Ficha Expandida: Historial Temporada por Temporada -->
                  <tr v-if="expandidoId === j.player_id" class="bg-slate-950/95">
                    <td colspan="9" class="p-4 md:p-6 border-t border-slate-800">
                      <div class="space-y-5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <h3 class="text-sm font-bold text-cyan-300">
                            Expediente Multi-Liga de {{ j.nombre }}
                          </h3>
                          <span class="text-xs text-slate-400">
                            Rating Bateo: <strong class="text-white">{{ j.rating_bateo }}</strong> ·
                            Rating Pitcheo: <strong class="text-white">{{ j.rating_picheo }}</strong>
                          </span>
                        </div>

                        <!-- Historial de Bateo -->
                        <div v-if="j.historial_bateo && j.historial_bateo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial Ofensivo por Temporada (Convencional + Sabermetría)
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
                            </table>
                          </div>
                        </div>

                        <!-- Historial de Pitcheo -->
                        <div v-if="j.historial_picheo && j.historial_picheo.length > 0">
                          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Historial de Pitcheo por Temporada (Convencional + Sabermetría)
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
<script setup>
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['volver'])

const password = ref('')
const destino = ref('principal')
const modoJson = ref(false)
const jsonCrudo = ref('')
const errorJson = ref('')

const titulo = ref('')
const slug = ref('')
const slugEditadoManual = ref(false)
const categoria = ref('INVESTIGACI?N ? LVBP 2026-27')
const autor = ref('Ernesto M?rquez ? Tibum?trico Research')
const bajada = ref('')
const seoDescription = ref('')
const keywords = ref('')
const cifraDestacada = ref('')
const etiquetaDestacada = ref('')
const acentoArte = ref('navy')
const cuerpoTexto = ref('')

const enviando = ref(false)
const resultado = ref(null)
const errorEnvio = ref('')

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

watch(titulo, (val) => {
  if (!slugEditadoManual.value) {
    slug.value = slugify(val)
  }
})

watch(bajada, (val) => {
  if (!seoDescription.value || seoDescription.value.length < 20) {
    seoDescription.value = val.slice(0, 160)
  }
})

const bloquesContenido = computed(() => {
  const lineas = cuerpoTexto.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  return lineas.map((linea) => {
    if (linea.startsWith('## ')) {
      return { tipo: 'subtitulo', texto: linea.replace(/^##\s+/, '') }
    }
    if (linea.startsWith('> ')) {
      return { tipo: 'cita', texto: linea.replace(/^>\s+/, '') }
    }
    return { tipo: 'parrafo', texto: linea }
  })
})

const minutosLectura = computed(() => {
  const palabras = cuerpoTexto.value.trim().split(/\s+/).filter(Boolean).length
  const mins = Math.max(2, Math.round(palabras / 200))
  return `${mins} min de lectura`
})

function fechaActualFormateada() {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const hoy = new Date()
  const d = String(hoy.getDate()).padStart(2, '0')
  const m = meses[hoy.getMonth()]
  const y = hoy.getFullYear()
  const iso = `${y}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${d}`
  return { texto: `${d} ${m} ${y}`, iso }
}

function importarDesdeJsonSkill() {
  errorJson.value = ''
  try {
    const limpio = jsonCrudo.value
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
    const obj = JSON.parse(limpio)

    if (obj.titulo) titulo.value = obj.titulo
    if (obj.slug) {
      slug.value = slugify(obj.slug)
      slugEditadoManual.value = true
    }
    if (obj.categoria) categoria.value = obj.categoria
    if (obj.autor) autor.value = obj.autor
    if (obj.bajada) bajada.value = obj.bajada
    if (obj.seoDescription) seoDescription.value = obj.seoDescription
    if (obj.keywords) keywords.value = obj.keywords
    if (obj.datoDestacado) {
      cifraDestacada.value = obj.datoDestacado.cifra || ''
      etiquetaDestacada.value = obj.datoDestacado.etiqueta || ''
    } else if (obj.metricaArte) {
      cifraDestacada.value = obj.metricaArte.valor || ''
      etiquetaDestacada.value = obj.metricaArte.sub || ''
      acentoArte.value = obj.metricaArte.acento || 'navy'
    }

    if (Array.isArray(obj.contenido)) {
      cuerpoTexto.value = obj.contenido
        .map((b) => {
          if (b.tipo === 'subtitulo') return `## ${b.texto}`
          if (b.tipo === 'cita') return `> ${b.texto}`
          return b.texto
        })
        .join('\n\n')
    } else if (typeof obj.cuerpo === 'string') {
      cuerpoTexto.value = obj.cuerpo
    }

    modoJson.value = false
  } catch (e) {
    errorJson.value = 'JSON inv?lido: ' + e.message
  }
}

async function publicarArticulo() {
  errorEnvio.value = ''
  resultado.value = null

  if (!password.value) {
    errorEnvio.value = 'Ingresa tu clave de editor.'
    return
  }
  if (!titulo.value.trim() || !slug.value.trim() || bloquesContenido.value.length === 0) {
    errorEnvio.value = 'Completa al menos t?tulo, slug y cuerpo del art?culo.'
    return
  }

  const fecha = fechaActualFormateada()
  const slugFinal = slugify(slug.value)

  const payloadArticulo = {
    id: slugFinal,
    slug: slugFinal,
    categoria: categoria.value.trim() || 'AN?LISIS ? LVBP',
    fecha: fecha.texto,
    fechaISO: fecha.iso,
    autor: autor.value.trim() || 'Ernesto M?rquez ? Tibum?trico Research',
    lectura: minutosLectura.value,
    titulo: titulo.value.trim(),
    seoDescription: (seoDescription.value || bajada.value).trim().slice(0, 165),
    keywords: keywords.value.trim(),
    bajada: bajada.value.trim(),
    datoDestacado: {
      cifra: cifraDestacada.value.trim() || 'LVBP 2026',
      etiqueta: etiquetaDestacada.value.trim() || 'An?lisis saberm?trico Tibum?trico',
    },
    metricaArte: {
      valor: cifraDestacada.value.trim() || 'LVBP',
      sub: etiquetaDestacada.value.trim() || 'An?lisis Tibum?trico',
      acento: acentoArte.value,
    },
    contenido: bloquesContenido.value,
  }

  enviando.value = true
  try {
    const resp = await fetch('/api/publicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password.value,
        destino: destino.value,
        articulo: payloadArticulo,
      }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new Error(data.error || 'No se pudo publicar')
    }
    resultado.value = data
  } catch (err) {
    errorEnvio.value = err.message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    <!-- Barra superior del editor -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#D4D4D8]">
      <div>
        <span class="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-[#161616] text-white">
          REDACCI?N ? CMS GIT-OPS
        </span>
        <h1 class="text-2xl font-extrabold text-[#161616] mt-2">
          Publicar nuevo an?lisis en Tibum?trico
        </h1>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="modoJson = !modoJson"
          class="px-3 py-2 text-xs font-mono font-bold border border-[#161616] bg-white hover:bg-[#161616] hover:text-white transition cursor-pointer"
        >
          {{ modoJson ? '? Volver al formulario' : '{ } Pegar JSON del Skill' }}
        </button>
        <button
          @click="$emit('volver')"
          class="px-3 py-2 text-xs font-bold text-[#52525B] hover:text-[#161616] cursor-pointer"
        >
          Cerrar editor ?
        </button>
      </div>
    </div>

    <!-- Panel Pegar JSON del Skill -->
    <div v-if="modoJson" class="mt-6 bg-white border-2 border-[#1E3A5F] p-6">
      <h2 class="text-sm font-extrabold uppercase tracking-wider text-[#1E3A5F]">
        Importar salida directa del Skill de Gemini
      </h2>
      <p class="text-xs text-[#52525B] mt-1">
        Pega aqu? el bloque JSON generado por tu Skill saberm?trico para rellenar autom?ticamente el art?culo, slug, SEO y citas.
      </p>
      <textarea
        v-model="jsonCrudo"
        rows="10"
        placeholder='{"titulo": "...", "slug": "...", "seoDescription": "...", "keywords": "...", "contenido": [...]}'
        class="w-full mt-3 p-3 font-mono text-xs bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
      ></textarea>
      <p v-if="errorJson" class="text-xs font-bold text-[#B84A39] mt-2">{{ errorJson }}</p>
      <button
        @click="importarDesdeJsonSkill"
        class="mt-3 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#161616] transition cursor-pointer"
      >
        Cargar datos en el formulario ?
      </button>
    </div>

    <!-- Ret?cula Editor + Vista Previa -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
      <!-- Formulario (7 cols) -->
      <div class="lg:col-span-7 space-y-5 bg-white border border-[#D4D4D8] p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Clave de Editor *
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="????????????"
              class="w-full px-3 py-2 text-sm bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
            />
          </div>

          <div>
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Ubicaci?n en Portada
            </label>
            <select
              v-model="destino"
              class="w-full px-3 py-2 text-sm bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
            >
              <option value="principal">Portada Principal (Hero)</option>
              <option value="destacado">Art?culos Destacados</option>
              <option value="fijado_02">Pilar Fijado #02 (WPA)</option>
              <option value="fijado_03">Pilar Fijado #03 (oWAR/fWAR)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
            Titular del Art?culo *
          </label>
          <input
            v-model="titulo"
            type="text"
            placeholder="Ej: El efecto real de los importados en la LVBP..."
            class="w-full px-3 py-2 text-sm font-bold bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Slug URL (/articulo/...)
            </label>
            <input
              v-model="slug"
              @input="slugEditadoManual = true"
              type="text"
              class="w-full px-3 py-2 text-xs font-mono bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
            />
          </div>

          <div>
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Antet?tulo / Categor?a
            </label>
            <input
              v-model="categoria"
              type="text"
              class="w-full px-3 py-2 text-xs font-mono bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
            Bajada / Entradilla *
          </label>
          <textarea
            v-model="bajada"
            rows="2"
            placeholder="Resumen ejecutivo de 2 l?neas que engancha al lector..."
            class="w-full px-3 py-2 text-sm bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
          ></textarea>
        </div>

        <!-- Bloque SEO -->
        <div class="p-4 bg-[#F4F4F2] border border-[#D4D4D8] space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-mono font-bold uppercase text-[#1E3A5F]">
              Metadatos SEO &amp; Long-Tail
            </span>
            <span class="text-[11px] font-mono text-[#52525B]">
              {{ seoDescription.length }}/160 caracteres
            </span>
          </div>
          <input
            v-model="seoDescription"
            type="text"
            placeholder="Meta description para Google y tarjetas de X/WhatsApp..."
            class="w-full px-3 py-1.5 text-xs bg-white border border-[#D4D4D8] outline-none"
          />
          <input
            v-model="keywords"
            type="text"
            placeholder="Palabras clave separadas por coma (LVBP, WPA, sabermetr?a...)"
            class="w-full px-3 py-1.5 text-xs bg-white border border-[#D4D4D8] outline-none"
          />
        </div>

        <!-- Dato Destacado -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Cifra Destacada
            </label>
            <input
              v-model="cifraDestacada"
              type="text"
              placeholder="Ej: +4.39 WPA"
              class="w-full px-3 py-2 text-sm font-mono font-bold bg-[#F4F4F2] border border-[#D4D4D8] outline-none"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-mono font-bold uppercase text-[#52525B] mb-1">
              Explicaci?n de la Cifra
            </label>
            <input
              v-model="etiquetaDestacada"
              type="text"
              placeholder="Contexto breve del dato clave..."
              class="w-full px-3 py-2 text-sm bg-[#F4F4F2] border border-[#D4D4D8] outline-none"
            />
          </div>
        </div>

        <!-- Cuerpo -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-[11px] font-mono font-bold uppercase text-[#52525B]">
              Cuerpo del Art?culo *
            </label>
            <span class="text-[11px] font-mono text-[#52525B]">
              Usa <strong>##</strong> para subt?tulos y <strong>&gt;</strong> para citas ? {{ minutosLectura }}
            </span>
          </div>
          <textarea
            v-model="cuerpoTexto"
            rows="14"
            placeholder="Escribe cada p?rrafo separado por una l?nea en blanco.&#10;&#10;## 1. Primer subt?tulo&#10;&#10;Texto del an?lisis con cifras exactas...&#10;&#10;> ?Cita destacada del estudio.?"
            class="w-full px-3 py-2.5 text-sm leading-relaxed bg-[#F4F4F2] border border-[#D4D4D8] focus:border-[#161616] outline-none"
          ></textarea>
        </div>

        <!-- Alertas y Bot?n Publicar -->
        <div v-if="errorEnvio" class="p-3 bg-[#B84A39]/10 border border-[#B84A39] text-xs font-bold text-[#9A3425]">
          {{ errorEnvio }}
        </div>

        <div v-if="resultado" class="p-4 bg-[#1E3A5F] text-white text-xs space-y-1">
          <p class="font-bold">? Art?culo enviado a GitHub (commit {{ resultado.commit }})</p>
          <p class="opacity-90">
            Vercel est? generando el HTML est?tico y actualizando el sitemap.xml. Estar? en vivo en ~35 segundos en:
            <a :href="resultado.url" class="underline font-mono font-bold">{{ resultado.url }}</a>
          </p>
        </div>

        <button
          @click="publicarArticulo"
          :disabled="enviando"
          class="w-full py-3.5 bg-[#161616] text-white text-xs font-extrabold uppercase tracking-widest hover:bg-[#1E3A5F] disabled:opacity-50 transition cursor-pointer"
        >
          {{ enviando ? 'Publicando en GitHub y generando SEO...' : 'Publicar Art?culo en Tibum?trico.com ?' }}
        </button>
      </div>

      <!-- Vista Previa en Vivo (5 cols) -->
      <div class="lg:col-span-5">
        <div class="sticky top-6 bg-white border border-[#D4D4D8] p-6">
          <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B84A39]">
            VISTA PREVIA EN VIVO
          </span>

          <div class="mt-4 pt-4 border-t border-[#E4E4E7]">
            <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1E3A5F]">
              {{ categoria || 'CATEGOR?A' }}
            </span>
            <h2 class="text-xl font-extrabold text-[#161616] mt-2 leading-tight">
              {{ titulo || 'El titular de tu art?culo aparecer? aqu?' }}
            </h2>
            <p class="text-xs text-[#52525B] mt-2 leading-relaxed">
              {{ bajada || 'La bajada o resumen editorial se mostrar? aqu? debajo del titular.' }}
            </p>

            <div v-if="cifraDestacada" class="mt-4 p-3 bg-[#F4F4F2] border-l-4 border-[#1E3A5F]">
              <div class="font-mono text-lg font-black text-[#161616]">{{ cifraDestacada }}</div>
              <div class="text-[11px] text-[#52525B]">{{ etiquetaDestacada }}</div>
            </div>

            <div class="mt-5 space-y-3 text-xs text-[#27272A] leading-relaxed max-h-[420px] overflow-y-auto pr-1">
              <template v-for="(bloque, i) in bloquesContenido" :key="i">
                <h3 v-if="bloque.tipo === 'subtitulo'" class="text-sm font-extrabold text-[#161616] pt-2">
                  {{ bloque.texto }}
                </h3>
                <blockquote
                  v-else-if="bloque.tipo === 'cita'"
                  class="pl-3 border-l-2 border-[#B84A39] italic font-medium text-[#161616]"
                >
                  {{ bloque.texto }}
                </blockquote>
                <p v-else>{{ bloque.texto }}</p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

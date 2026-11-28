import editorial from './editorial.json'

export const ARTICULOS_FIJADOS = editorial.fijados || []
export const ARTICULO_PRINCIPAL = editorial.principal
export const ARTICULOS_DESTACADOS = editorial.destacados || []
export const NOTAS_BREVES = editorial.notas || []

export const TODOS_LOS_ARTICULOS = [
  ...ARTICULOS_FIJADOS.filter((a) => a.publicado),
  ...(ARTICULO_PRINCIPAL ? [ARTICULO_PRINCIPAL] : []),
  ...ARTICULOS_DESTACADOS,
]

export function buscarArticuloPorSlug(slug) {
  return TODOS_LOS_ARTICULOS.find((a) => a.slug === slug || a.id === slug) || null
}

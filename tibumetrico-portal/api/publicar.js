export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { password, destino, articulo, notaBreve } = req.body || {}
  const expectedPassword = process.env.EDITOR_PASSWORD

  if (!expectedPassword || password !== expectedPassword) {
    return res.status(401).json({ error: 'Clave de editor incorrecta' })
  }

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER || 'emarquezg-beep'
  const repo = process.env.GITHUB_REPO || 'tibumetrico-portal'
  const branch = 'main'
  const filePath = 'src/data/editorial.json'

  if (!token) {
    return res.status(500).json({ error: 'Falta configurar GITHUB_TOKEN en Vercel' })
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  try {
    // 1. Obtener archivo actual y su SHA desde GitHub
    const getResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: ghHeaders }
    )
    if (!getResp.ok) {
      const errTxt = await getResp.text()
      return res.status(502).json({ error: `Error leyendo GitHub: ${errTxt}` })
    }
    const fileData = await getResp.json()
    const currentJsonStr = Buffer.from(fileData.content, 'base64').toString('utf-8')
    const editorial = JSON.parse(currentJsonStr)

    let commitMsg = ''

    if (destino === 'nota_breve') {
      if (!notaBreve || !notaBreve.titulo || !notaBreve.resumen) {
        return res.status(400).json({ error: 'Faltan campos de la nota breve' })
      }
      editorial.notas = [notaBreve, ...(editorial.notas || [])].slice(0, 6)
      commitMsg = `Publicar nota breve: ${notaBreve.titulo.slice(0, 50)}`
    } else {
      if (!articulo || !articulo.titulo || !articulo.slug || !Array.isArray(articulo.contenido)) {
        return res.status(400).json({ error: 'El artículo está incompleto' })
      }

      if (destino === 'principal') {
        // Mover el principal anterior a destacados si existe
        if (editorial.principal) {
          const anterior = {
            ...editorial.principal,
            metricaArte: editorial.principal.metricaArte || {
              valor: editorial.principal.datoDestacado?.cifra || 'LVBP',
              sub: 'Investigación previa',
              acento: 'navy',
            },
          }
          editorial.destacados = [
            anterior,
            ...(editorial.destacados || []).filter((a) => a.slug !== anterior.slug && a.slug !== articulo.slug),
          ]
        }
        editorial.principal = articulo
        commitMsg = `Publicar portada: ${articulo.slug}`
      } else if (destino === 'fijado_02' || destino === 'fijado_03') {
        const num = destino === 'fijado_02' ? '02' : '03'
        editorial.fijados = (editorial.fijados || []).map((f) =>
          f.numero === num
            ? {
                ...f,
                ...articulo,
                numero: num,
                estadoBadge: 'FIJADO · METODOLOGÍA ACTIVA',
                publicado: true,
              }
            : f
        )
        commitMsg = `Publicar guía metodológica #${num}: ${articulo.slug}`
      } else {
        // Destacados por defecto
        editorial.destacados = [
          articulo,
          ...(editorial.destacados || []).filter((a) => a.slug !== articulo.slug),
        ]
        commitMsg = `Publicar artículo: ${articulo.slug}`
      }
    }

    // 2. Guardar nuevo JSON en GitHub (dispara deploy automatico en Vercel)
    const updatedBase64 = Buffer.from(JSON.stringify(editorial, null, 2) + '
', 'utf-8').toString('base64')
    const putResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: commitMsg,
          content: updatedBase64,
          sha: fileData.sha,
          branch,
        }),
      }
    )

    if (!putResp.ok) {
      const errPut = await putResp.text()
      return res.status(502).json({ error: `Error escribiendo en GitHub: ${errPut}` })
    }

    const putData = await putResp.json()
    return res.status(200).json({
      ok: true,
      commit: putData.commit?.sha?.slice(0, 7),
      url: destino === 'nota_breve' ? '/' : `/articulo/${articulo.slug}`,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}

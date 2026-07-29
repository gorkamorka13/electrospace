function renderKaTeX(math, displayMode = false) {
  if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
    try {
      return window.katex.renderToString(math, { displayMode, throwOnError: false })
    } catch {
      return math
    }
  }
  return math
}

export function InlineMath({ math }) {
  const html = renderKaTeX(math, false)
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function BlockMath({ math }) {
  const html = renderKaTeX(math, true)
  return <div className="gw-katex-block" dangerouslySetInnerHTML={{ __html: html }} />
}

// Composant pour mélanger du texte normal et des formules LaTeX entre $...$
export function TextWithMath({ text }) {
  if (!text) return null
  const parts = text.split('$')
  return (
    <span>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return <InlineMath key={index} math={part} />
        }
        return part
      })}
    </span>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'

export function CustomSelect({ value, options, onChange, className, placeholder, triggerStyle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [open])

  const handleSelect = useCallback((val) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  const displayValue = placeholder && (value === '' || value == null)
    ? placeholder
    : (options.find(o => o.key === value)?.label ?? value)

  return (
    <div className={`cs-container ${className || ''}`} ref={ref}>
      <button className="cs-trigger" onClick={() => setOpen(v => !v)} type="button" style={triggerStyle}>
        <span className={`cs-label${placeholder && (value === '' || value == null) ? ' cs-label--placeholder' : ''}`}>{displayValue}</span>
        <span className="cs-arrow">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="cs-dropdown">
          {options.map(opt => (
            <button
              key={opt.key}
              className={`cs-option ${opt.key === value ? 'cs-option--selected' : ''}`}
              onClick={() => handleSelect(opt.key)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useStore } from '../store/useStore'

const SHORTCUTS = [
  ['Flèches / A/W/S/D/Q', 'Déplacer l\'objet sélectionné (plan XZ)'],
  ['PageUp / E', 'Monter l\'objet sélectionné (Y+)'],
  ['PageDown / C', 'Descendre l\'objet sélectionné (Y-)'],
  ['Suppr', 'Supprimer la charge sélectionnée'],
  ['Échap', 'Fermer le menu contextuel / l\'aide'],
  ['Ctrl+Z', 'Annuler la dernière action'],
  ['Ctrl+Maj+Z', 'Rétablir l\'action annulée'],
  ['?', 'Afficher/cacher cette aide'],
  ['Maj+H', 'Afficher/cacher le point M'],
]

export function HelpModal() {
  const showHelp = useStore((s) => s.showHelp)
  const setShowHelp = useStore((s) => s.setShowHelp)

  if (!showHelp) return null

  return (
    <div className="help-overlay" onClick={() => setShowHelp(false)}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h3>Raccourcis clavier</h3>
          <button onClick={() => setShowHelp(false)} className="help-close">&times;</button>
        </div>
        <table className="help-table">
          <tbody>
            {SHORTCUTS.map(([key, desc]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="help-footer">
          Cliquez ailleurs ou appuyez sur Échap pour fermer
        </p>
      </div>
    </div>
  )
}

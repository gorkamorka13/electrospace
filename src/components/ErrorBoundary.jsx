import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Une erreur est survenue</h2>
          <pre className="error-message">
            {this.state.error?.message}
          </pre>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="error-reload-btn">
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

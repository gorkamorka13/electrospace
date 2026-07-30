import { useRef, useEffect, useCallback } from 'react'

let nextId = 1

export function useFieldWorker() {
  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/fieldWorker.js', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { id, result, error } = e.data
      const pending = pendingRef.current
      const resolve = pending.get(id)
      if (resolve) {
        pending.delete(id)
        if (error) resolve.reject(new Error(error))
        else resolve.resolve(result)
      }
    }

    worker.onerror = (err) => {
      // Reject all pending on worker error
      pendingRef.current.forEach(({ reject }) => reject(err))
      pendingRef.current.clear()
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      pendingRef.current.clear()
    }
  }, [])

  const compute = useCallback((type, payload) => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) {
        reject(new Error('Worker not available'))
        return
      }
      const id = nextId++
      pendingRef.current.set(id, { resolve, reject })
      worker.postMessage({ type, id, payload })
    })
  }, [])

  const computeField = useCallback((charges, targetPos, distributions, ke, rMin) => {
    return compute('totalField', { charges, targetPos, ke, rMin, distributions })
  }, [compute])

  const computePotential = useCallback((charges, targetPos, distributions, ke, rMin) => {
    return compute('totalPotential', { charges, targetPos, ke, rMin, distributions })
  }, [compute])

  const computeFieldGrid = useCallback((charges, positions, distributions, ke, rMin) => {
    return compute('fieldGrid', { charges, positions, ke, rMin, distributions })
  }, [compute])

  const computePotentialGrid = useCallback((charges, positions, distributions, ke, rMin) => {
    return compute('potentialGrid', { charges, positions, ke, rMin, distributions })
  }, [compute])

  const traceFieldLines = useCallback((seeds, charges, opts) => {
    return compute('traceFieldLines', { seeds, charges, ...opts })
  }, [compute])

  const sample3DGrid = useCallback((bounds, res, charges, ke, rMin, distributions) => {
    return compute('sample3DGrid', { bounds, res, charges, ke, rMin, distributions })
  }, [compute])

  return { compute, computeField, computePotential, computeFieldGrid, computePotentialGrid, traceFieldLines, sample3DGrid }
}

import { useState, useRef, useEffect, useCallback } from 'react'
import './TwoDSlider.css'
import type { BlendPosition } from '../types'

interface TwoDSliderProps {
  position: BlendPosition
  onChange: (position: BlendPosition) => void
  disabled?: boolean
}

function TwoDSlider({ position, onChange, disabled = false }: TwoDSliderProps): JSX.Element {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback((e: MouseEvent | React.MouseEvent): void => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = 0.5

    onChange({ x, y })
  }, [onChange])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    updatePosition(e)
  }, [disabled, updatePosition])

  const handleHandleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    updatePosition(e)
  }, [disabled, updatePosition])

  const handleMouseMove = useCallback((e: MouseEvent): void => {
    if (!isDragging || disabled) return
    updatePosition(e)
  }, [isDragging, disabled, updatePosition])

  const handleMouseUp = useCallback((): void => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleStyle: React.CSSProperties = {
    left: `${position.x * 100}%`,
  }

  return (
    <div className="one-d-slider-container">
      <div
        ref={containerRef}
        className={`one-d-slider ${disabled ? 'disabled' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="slider-track">
          <div className="track-fill" style={{ width: `${position.x * 100}%` }} />
        </div>
        <div
          className="slider-handle"
          style={handleStyle}
          onMouseDown={handleHandleMouseDown}
        />
        <div className="slider-labels">
          <span className="label-left">Voice 1</span>
          <span className="label-right">Voice 2</span>
        </div>
      </div>
    </div>
  )
}

export default TwoDSlider


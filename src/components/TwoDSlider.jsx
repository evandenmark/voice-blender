import { useState, useRef, useEffect } from 'react'
import './TwoDSlider.css'

function TwoDSlider({ position, onChange, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const handleMouseDown = (e) => {
    if (disabled) return
    e.preventDefault() // Prevent text selection and other default behaviors
    setIsDragging(true)
    updatePosition(e)
  }

  const handleHandleMouseDown = (e) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation() // Prevent container from also handling this
    setIsDragging(true)
    updatePosition(e)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || disabled) return
    updatePosition(e)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const updatePosition = (e) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    // Keep y at 0.5 (middle) for 1D slider
    const y = 0.5

    onChange({ x, y })
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const handleStyle = {
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


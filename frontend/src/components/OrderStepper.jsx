import React from 'react'

const STAGES = [
  { key: 'confirmed', label: 'Confirmed', icon: '📝' },
  { key: 'preparing', label: 'Preparing', icon: '🍳' },
  { key: 'almost', label: 'Almost Ready', icon: '🍽️' },
  { key: 'ready', label: 'Ready for Pickup', icon: '🔔' },
  { key: 'collected', label: 'Collected', icon: '🎉' }
]

export default function OrderStepper({ status }) {
  const currentIndex = status === 'collected' ? 4 : STAGES.findIndex(s => s.key === status)
  const activeIdx = currentIndex >= 0 ? currentIndex : 0

  // Calculate percentage fill of progress bar
  const progressPct = (activeIdx / (STAGES.length - 1)) * 100

  return (
    <div style={{ padding: '10px 0', width: '100%' }}>
      {/* Horizontal Continuous Progress Bar Container */}
      <div style={{ position: 'relative', margin: '14px 10px 24px' }}>
        {/* Background Track */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: 0,
          right: 0,
          height: '6px',
          backgroundColor: '#e2e8f0',
          borderRadius: '99px',
          zIndex: 1
        }} />

        {/* Animated Active Progress Fill Bar */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: 0,
          width: `${progressPct}%`,
          height: '6px',
          background: 'linear-gradient(90deg, #ea580c, #10b981)',
          borderRadius: '99px',
          zIndex: 2,
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />

        {/* Stage Milestone Nodes */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 3
        }}>
          {STAGES.map((stg, i) => {
            const isCompleted = i < activeIdx || status === 'collected'
            const isCurrent = i === activeIdx && status !== 'collected'

            return (
              <div 
                key={stg.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '64px'
                }}
              >
                {/* Milestone Node Circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted 
                    ? '#10b981' 
                    : (isCurrent ? '#ea580c' : '#ffffff'),
                  border: isCurrent 
                    ? '3px solid #ffedd5' 
                    : (isCompleted ? '2px solid #10b981' : '2px solid #cbd5e1'),
                  color: isCompleted || isCurrent ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(234,88,12,0.2)' : '0 2px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted ? '✓' : (i + 1)}
                </div>

                {/* Stage Label Underneath */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? '800' : '600',
                  color: isCurrent ? '#ea580c' : (isCompleted ? '#0f172a' : '#94a3b8'),
                  marginTop: '8px',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {stg.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

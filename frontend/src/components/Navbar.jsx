import React from 'react'

export default function Navbar() {
  return (
    <header style={{ padding: '16px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ margin: 0 }}>GoDaddy Hackathon Prototype</h2>
      <span style={{ fontSize: '14px', color: '#64748b' }}>Status: Ready</span>
    </header>
  )
}

import React from 'react'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Home() {
  return (
    <div>
      <Navbar />
      <main style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Project Dashboard</h1>
        <p>Awaiting problem statement configuration. Ready for prototype development.</p>
      </main>
      <Footer />
    </div>
  )
}

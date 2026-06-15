'use client';

import { motion } from 'framer-motion';

/**
 * Fondo inmersivo: imagen de alta resolución de una instalación solar con un
 * overlay degradado para legibilidad, además de capas animadas sutiles
 * (resplandores) que aportan sensación de movimiento sin distraer.
 *
 * TODO(Hugo): si tienes fotografías propias de instalaciones GG Electrics,
 * reemplaza la URL de Unsplash por tus propios assets optimizados (WebP/AVIF).
 */
export function ImmersiveBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: 'linear-gradient(160deg, #dbeafe 0%, #eff6ff 35%, #f0fdf4 65%, #fef9c3 100%)' }}>
      {/* Foto de instalación solar — bien visible */}
      <motion.div
        initial={{ scale: 1.06, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2400&auto=format&fit=crop')",
        }}
      />
      {/* Overlay mínimo — solo para que el texto del header sea legible */}
      <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.18)' }} />

      {/* Resplandores flotantes suaves */}
      <motion.div
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full blur-[120px]"
        style={{ background: 'rgba(147, 197, 253, 0.35)' }}
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-24 top-1/3 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: 'rgba(253, 230, 138, 0.35)' }}
        animate={{ y: [0, -40, 0], x: [0, -25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Cuadrícula muy tenue */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.8) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

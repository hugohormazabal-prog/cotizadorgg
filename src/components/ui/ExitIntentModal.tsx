'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useCotizadorStore } from '@/lib/store';

// Se muestra UNA sola vez por dispositivo (persistido). No vuelve a aparecer.
const SEEN_KEY = 'gg-exit-intent-seen';

export function ExitIntentModal() {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [armed, setArmed] = useState(false); // se activa tras unos segundos, no de inmediato
  const step = useCotizadorStore((s) => s.step);
  const status = useCotizadorStore((s) => s.status);
  const contacto = useCotizadorStore((s) => s.data.contacto);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const markSeen = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* noop */ }
  }, []);

  const alreadySeen = () => {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  };

  // Se arma recién a los 8 s, para no interrumpir apenas entran.
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // Solo en pasos avanzados (5+), una vez, y si aún no lo vieron.
  const canShow =
    armed && step >= 5 && status === 'editing' && !dismissed && !shown && !alreadySeen();

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 10 && canShow) {
      setShown(true);
      markSeen();
    }
  }, [canShow, markSeen]);

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  // Pre-fill email if already entered
  useEffect(() => {
    if (contacto?.email) setEmail(contacto.email);
  }, [contacto?.email]);

  const handleSave = () => {
    // En producción: llamar a API para guardar lead
    setSaved(true);
    setTimeout(() => {
      setDismissed(true);
      setShown(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {shown && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => { setShown(false); setDismissed(true); }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div
              className="relative rounded-2xl p-6 text-center shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.65)',
              }}
            >
              <button
                type="button"
                onClick={() => { setShown(false); setDismissed(true); }}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-3 text-3xl">☀️</div>

              {!saved ? (
                <>
                  <h3 className="text-lg font-bold text-slate-900">¿Te guardamos el avance?</h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Si quieres, te enviamos tu estimación al correo para retomarla cuando te acomode. Sin compromiso.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="flex-1 rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!email.includes('@')}
                      className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-40 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setShown(false); setDismissed(true); }}
                    className="mt-3 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    No gracias, prefiero salir
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="mb-2 text-2xl">✅</div>
                  <h3 className="font-bold text-slate-900">¡Listo!</h3>
                  <p className="mt-1 text-sm text-slate-600">Te enviamos el link para continuar.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

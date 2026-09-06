import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlertStatus } from '../../types';
import { cn } from '../../lib/theme';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAlertId: string;
  targetStatus: AlertStatus;
  onConfirm: (officerId: string) => Promise<void>;
}

export function AdminAuthModal({
  isOpen,
  onClose,
  targetAlertId,
  targetStatus,
  onConfirm,
}: AdminAuthModalProps) {
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Status visual label
  const statusLabel =
    targetStatus === 'resolved'
      ? 'Resolved (Theek Ho Gaya)'
      : targetStatus === 'acknowledged'
      ? 'Acknowledged (Karyawahi Shuru)'
      : 'Open (Reopened)';

  const statusColor =
    targetStatus === 'resolved'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : targetStatus === 'acknowledged'
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-rose-400 border-rose-500/40 bg-rose-500/10';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verification check:
    // Allows demo credentials like admin / admin123, PWD-ADMIN-01 / bel2026, or any valid officer format
    const validIds = ['admin', 'pwd-officer-01', 'pwd-admin-01', 'mcd-officer-07', 'officer', 'bel'];
    const validPasswords = ['admin123', 'admin', 'bel2026', 'admin@2026', 'pwd123', '123456'];

    const cleanId = officerId.trim().toLowerCase();
    const cleanPass = password.trim();

    const isIdValid = validIds.includes(cleanId) || cleanId.startsWith('pwd') || cleanId.startsWith('mcd');
    const isPassValid = validPasswords.includes(cleanPass) || cleanPass.length >= 4;

    if (!isIdValid || !isPassValid) {
      setError('? Galat ID ya Password! Use demo: admin / admin123');
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(officerId.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOfficerId('');
        setPassword('');
        onClose();
      }, 1000);
    } catch {
      setError('Server update failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAutofill = () => {
    setOfficerId('PWD-OFFICER-01');
    setPassword('admin123');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="w-full max-w-md bg-[#0d121c] border border-white/[0.12] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-black via-zinc-950 to-black">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#4ef2bb]/10 border border-[#4ef2bb]/30 flex items-center justify-center text-xl text-[#4ef2bb]">
                ???
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Officer Authorization Required
                </h3>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Action audit logged under Civic Integrity Protocol
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              ?
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Target Action Info Box */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-white/40 uppercase font-semibold block">Target Issue ID</span>
                <span className="font-mono text-white font-bold text-xs">{targetAlertId}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/40 uppercase font-semibold block mb-0.5">Changing Status To</span>
                <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border', statusColor)}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Error or Success feedback */}
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center animate-shake">
                {error}
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center">
                ? Officer Authorized! Status Updated Successfully.
              </div>
            )}

            {/* Input 1: Officer ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">
                Civic Officer / Admin ID
              </label>
              <input
                type="text"
                required
                autoFocus
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="e.g. PWD-OFFICER-01 or admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] focus:border-[#4ef2bb] focus:outline-none text-white text-xs font-mono placeholder:text-white/25 transition-colors"
              />
            </div>

            {/* Input 2: Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/70">
                  Officer Security PIN / Password
                </label>
                <button
                  type="button"
                  onClick={handleDemoAutofill}
                  className="text-[10px] text-[#4ef2bb] hover:underline cursor-pointer"
                >
                  ? Auto-fill Demo Credentials
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. admin123)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/[0.12] focus:border-[#4ef2bb] focus:outline-none text-white text-xs font-mono placeholder:text-white/25 transition-colors"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || success}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black bg-[#4ef2bb] hover:bg-[#3cdca8] transition-all cursor-pointer shadow-[0_0_20px_rgba(78,242,187,0.3)] disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : success ? '? Verified!' : 'Authorize & Update'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

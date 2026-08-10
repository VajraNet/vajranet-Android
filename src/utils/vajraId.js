/**
 * VajraNet Persistent Device/User Unique ID Utility
 * 
 * Flow Specification:
 * - One device / download = One permanent Unique Vajra ID.
 * - Format: VAJRA-USR<3-LETTERS>-<5-DIGITS> (e.g. VAJRA-USR-DEL-89241 or VAJRA-USR-KRN-50284)
 * - Persisted in localStorage ('vajranet_unique_id') so it remains permanent whether
 *   the user is a Guest, logs in with Phone number, or logs in via Vajra ID directly.
 */

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '0123456789';

export function generateVajraId() {
  let letterPart = '';
  for (let i = 0; i < 3; i++) {
    letterPart += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  }
  let numberPart = '';
  for (let i = 0; i < 5; i++) {
    numberPart += DIGITS.charAt(Math.floor(Math.random() * DIGITS.length));
  }
  return `VAJRA-USR-${letterPart}-${numberPart}`;
}

export function getOrCreateVajraId() {
  try {
    let existingId = localStorage.getItem('vajranet_unique_id');
    if (!existingId || !existingId.startsWith('VAJRA-USR')) {
      existingId = generateVajraId();
      localStorage.setItem('vajranet_unique_id', existingId);
    }
    return existingId;
  } catch (e) {
    return generateVajraId();
  }
}

export function isValidVajraId(id) {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim().toUpperCase();
  // Matches VAJRA-USR-ABC-12345 or VAJRA-USRABC-12345 or VAJRA-USR-12345
  return /^VAJRA-USR(-?[A-Z]{2,4})?-?\d{4,6}$/i.test(clean);
}

export function normalizeVajraId(id) {
  if (!id) return '';
  return id.trim().toUpperCase();
}

import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'jal-satark-secure-super-secret-jwt-key-2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Normalizes role strings to standard canonical identifiers:
 * - 'district_admin' (District Health Admin)
 * - 'health_worker' (ASHA Worker)
 * - 'citizen' (Citizen / Volunteer)
 */
export function normalizeRole(role) {
  if (!role) return 'citizen';
  const r = role.toString().trim().toLowerCase();
  if (['district_admin', 'district_health_admin', 'admin', 'government', 'health_admin'].includes(r)) {
    return 'district_admin';
  }
  if (['health_worker', 'asha_worker', 'asha', 'field_worker', 'nurse'].includes(r)) {
    return 'health_worker';
  }
  return 'citizen';
}

/**
 * Middleware that requires a valid JWT Bearer token.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please sign in again.'
    });
  }
}

/**
 * Middleware that restricts access to specific user roles.
 * Normalizes input roles so 'district_admin', 'district_health_admin', 'admin' all grant access.
 */
export function requireRole(...allowedRoles) {
  const flatRoles = allowedRoles.flat().map((r) => r.toLowerCase());
  const normalizedAllowed = flatRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const userNormalized = normalizeRole(userRole);

    const hasAccess =
      flatRoles.includes(userRole) ||
      normalizedAllowed.includes(userNormalized) ||
      (normalizedAllowed.includes('district_admin') && userNormalized === 'district_admin') ||
      (normalizedAllowed.includes('health_worker') && userNormalized === 'health_worker');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Action authorized for District Health Admins Only (Current role: ${req.user.role}).`
      });
    }

    next();
  };
}

/**
 * Optional auth middleware: extracts user details if token is valid, but does not block if omitted.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  }
  next();
}

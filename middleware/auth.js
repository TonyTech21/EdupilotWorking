// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Role-based authentication middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    
    const userRole = req.session.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).render('pages/error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        error: {}
      });
    }
    
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
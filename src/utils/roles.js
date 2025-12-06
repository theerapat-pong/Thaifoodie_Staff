// ========================================
// Role Utilities
// ========================================

const ADMIN_ROLES = new Set(['ADMIN', 'DEV']);

function hasAdminPrivileges(role) {
    return role ? ADMIN_ROLES.has(role) : false;
}

function hasDevPrivileges(role) {
    return role === 'DEV';
}

function isDevRole(role) {
    return role === 'DEV';
}

module.exports = {
    hasAdminPrivileges,
    hasDevPrivileges,
    isDevRole,
};

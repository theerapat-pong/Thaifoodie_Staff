// ========================================
// LIFF Authentication Service
// ========================================

const LIFF_CHANNEL_ID = process.env.LIFF_CHANNEL_ID || process.env.LIFF_ID;
const DEV_BYPASS_ALLOWED = (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.VERCEL_ENV === 'development'
);

/**
 * Verify LIFF Access Token
 * @param {string} accessToken - LIFF Access Token
 * @returns {Promise<Object>} - Verification result { valid, userId, error }
 */
async function verifyAccessToken(accessToken) {
    if (!accessToken) {
        return { valid: false, error: 'Access token is required' };
    }

    try {
        // Call LINE API to verify token
        const response = await fetch(
            `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('[LIFF Auth] Token verification failed:', error);
            return { 
                valid: false, 
                error: error.error_description || 'Invalid access token' 
            };
        }

        const data = await response.json();
        
        // Verify channel ID matches
        if (LIFF_CHANNEL_ID && data.client_id !== LIFF_CHANNEL_ID) {
            console.error('[LIFF Auth] Channel ID mismatch:', data.client_id);
            return { 
                valid: false, 
                error: 'Invalid channel' 
            };
        }

        // Check if token is expired
        if (data.expires_in <= 0) {
            return { 
                valid: false, 
                error: 'Token expired' 
            };
        }

        return { 
            valid: true, 
            clientId: data.client_id,
            expiresIn: data.expires_in,
            scope: data.scope 
        };

    } catch (error) {
        console.error('[LIFF Auth] Verification error:', error);
        return { 
            valid: false, 
            error: 'Failed to verify token' 
        };
    }
}

/**
 * Get user profile from LINE
 * @param {string} accessToken - LIFF Access Token
 * @returns {Promise<Object>} - User profile or error
 */
async function getLineProfile(accessToken) {
    try {
        const response = await fetch('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get profile');
        }

        return await response.json();

    } catch (error) {
        console.error('[LIFF Auth] Get profile error:', error);
        throw error;
    }
}

/**
 * Get header value from request (compatible with both Node.js and Web API)
 * @param {Object} req
 * @param {string} name
 * @returns {string|null}
 */
function getHeader(req, name) {
    // Try Web API style first (req.headers.get)
    if (req.headers && typeof req.headers.get === 'function') {
        return req.headers.get(name);
    }
    // Fall back to Node.js style (req.headers[name])
    if (req.headers) {
        return req.headers[name.toLowerCase()] || req.headers[name] || null;
    }
    return null;
}

/**
 * Middleware to verify LIFF request
 * @param {Request} req
 * @returns {Promise<Object>} - { valid, userId, error }
 */
async function verifyLiffRequest(req) {
    // Get authorization header
    const authHeader = getHeader(req, 'authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { 
            valid: false, 
            error: 'Authorization header missing or invalid' 
        };
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify token
    const verification = await verifyAccessToken(accessToken);
    if (!verification.valid) {
        return verification;
    }

    // Get user profile to get userId
    try {
        const profile = await getLineProfile(accessToken);
        return {
            valid: true,
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Failed to get user profile'
        };
    }
}

/**
 * Helper to extract userId from request
 * - First tries to verify from access token
 * - Falls back to userId in query/body (for development)
 * @param {Request} req
 * @returns {Promise<Object>} - { valid, userId, error }
 */
async function authenticateRequest(req) {
    const authHeader = getHeader(req, 'authorization');
    
    // 1. ถ้ามี Token จริงมา ให้ตรวจสอบตามปกติ
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const result = await verifyLiffRequest(req);
        if (result.valid) {
            return result;
        }
    }

    // 2. Development fallback: allow supplying userId only in dev/test environments
    if (DEV_BYPASS_ALLOWED) {
        try {
            const url = new URL(req.url, 'http://localhost');
            let userId = url.searchParams.get('userId');

            if (!userId && req.body) {
                userId = req.body.userId;
            }

            if (userId) {
                console.warn('[LIFF Auth] Using development bypass for userId:', userId);
                return { valid: true, userId };
            }
        } catch (error) {
            console.error('[LIFF Auth] Development bypass error:', error);
        }
    }

    return { 
        valid: false, 
        error: 'Authentication required' 
    };
}

/**
 * Send error response
 * @param {number} status
 * @param {string} message
 * @returns {Response}
 */
function errorResponse(status, message) {
    return new Response(
        JSON.stringify({ error: message, success: false }),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    );
}

/**
 * Send success response
 * @param {Object} data
 * @returns {Response}
 */
function successResponse(data) {
    return new Response(
        JSON.stringify({ ...data, success: true }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    );
}

module.exports = {
    verifyAccessToken,
    getLineProfile,
    verifyLiffRequest,
    authenticateRequest,
    errorResponse,
    successResponse
};
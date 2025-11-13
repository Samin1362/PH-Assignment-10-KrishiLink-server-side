const { isFirebaseReady, getFirebaseAdmin } = require("../config/firebase");

/**
 * Middleware to verify Firebase JWT tokens
 * Supports both production (Firebase) and development modes
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    // Check if Firebase is initialized
    if (!isFirebaseReady()) {
      // Development mode: Allow requests with mock authentication
      console.warn("⚠️  Development mode: Bypassing Firebase authentication");

      // Use headers or mock data for development
      req.user = {
        email: req.headers["user-email"] || "dev@example.com",
        uid: req.headers["user-uid"] || "dev-user-id",
        name: req.headers["user-name"] || "Dev User",
        isDevelopment: true,
      };

      return next();
    }

    // Production mode: Verify actual Firebase token
    try {
      const admin = getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Attach verified user data to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email,
        picture: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        isDevelopment: false,
      };

      console.log(`✅ User authenticated: ${req.user.email}`);
      next();
    } catch (firebaseError) {
      console.error(
        "Firebase token verification failed:",
        firebaseError.message
      );

      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or expired token",
        error:
          process.env.NODE_ENV === "development"
            ? firebaseError.message
            : undefined,
      });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = verifyToken;

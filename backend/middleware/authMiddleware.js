import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // expecting "Bearer <token>"

  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decoded.userId }; // attach decoded user info to req
    next();
 } catch (err) {
  console.error("JWT verification failed:", err);
  res.status(401).json({ message: "Token is not valid" });
}
}

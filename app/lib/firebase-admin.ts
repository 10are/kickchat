import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: "kickchat-ef955",
      clientEmail: "firebase-adminsdk-fbsvc@kickchat-ef955.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoSnI9a3HeWGST\nJmrbpvfuRpQGj2aYszrKc1sKHOG+Z7VEv21v9DiZEW0sm6kLE+mMtqS64KBzeQCV\nss8lL/1yLq7/QlpbmNJYEYiFwjKT8DsplIuykZSwBilLZ6ZWTJ3lGE9fCfJUSpFa\n17sxXTTLmRTHGcn4e4QMZ05WbTyiYZ9OtjMwqYacCbHExq7+fj1zDW1PtibrOzVz\nvLKHXJHAnN7wK/a5sQ5vWve8tyLQ+AINUorlucL7pnapByGsutt/Igi4BM5yWVYO\nFHdQDb/hNl7cDMBZnPKSJeTnyqcD72y7MM8srGK8x/jo7UzceXG0rEvteBJVn6Nm\nvY4YeOXnAgMBAAECggEABKysLts7f+IfKAI/vUAswMFFLPqexxeNk9G4H8nOqye9\nc0Q3k2dX6jtPtfRDSxib/GZtMIuLqbc3e/ZiCm60TCNvXG39O9b6nftrAry9NX1B\n8NzEkOkyvktpclMu0DwbeKbsFflbxIwkRQPkCE1xXgrXFbNJqAlIR32etcjd+FXd\nGTqqAZjiHCh6SBHUrY1EZmJPZTM4S5S4S85qjlsT+H3IoG9H1XHNZgtRXEjHsrmf\ndmxeZ6yLQmpPFFDisL5iK60WJ/M8S7vG8Wl0bWHrDXYHtH03IBnpu7zSrqG8iPnk\nYeZhwbmm43pDa/N1uKSfMwC3I8eyEGZyWRFgMBmeNQKBgQD7k11RUx6nFbTIqvuY\nn4IhkVLEh8Ns//WuqWcv7RjJ6/Kt0sUg5JSIb9ul3gl0iGHCv4fGBOJaD7SZEWUa\ndTwKFkcOxZhiBe7pZI15tGJs9S6/0vOXxw5LW6wvY/IqL8+zSdldAOQ+jgquPjp4\nPOqZGAgiCquV0kxDUVHH4SDZXQKBgQDsYEIX3+Ssh7z3OrSm4Ig76b50d1Ze624v\nLTE89gVXyGs2WIbHdPe8zKm4HTg2+BDKuzTRvvqfHm7G6/sftuHtpCOCZlx1bF6E\nXyuYebrVQjLwwKVIzFSERqPxmeSemFHM1FoA84HiKOL3/6UlB6oNYsfJo9/EFsiB\nZzpKgeuUEwKBgHHyiW3wbA3Z8wyBBXxXoyV5ITgLFiUkui7mY+p9RaEP0deRg+Am\nKHCz2ZUDQN0beMww3FqAk9WfD3nVOyoEt7EJ7h1uulqLvW7RMJNTdNFNLGOONO8m\nJf9UAmVkq6cYCMd4R4+se7UpuQS7Ati7HrdA/04L7zPpEMnc52HVQn+xAoGAKWi/\ni2EstVDeOM1vAmEJXL2ZINwbJGvIFLmtC4np67PvnEir69tA3zFXdiqgQ3j3sBxV\np3z2eNOjAnQqvSaTs8bydZCrF+MRN81YXNDOezeqpuSI0BUDpVyesd+M3n++rMxy\nrAH8ufsBsAJ4EuGh19B7QYbU14xKOek0nALgm0MCgYEAzUkTMjCZqYgtwbr9Oxkb\nb79+bqBO/I/nR94KIhsgPu0BNV8dqsbocELQGAE+hUX1OXWrFCVpLI9iohSf3Rk7\nrPKG5sCjMryujir2AsGyveW2G1tBTQ0NpMFOgVkxX/hAiK5U5srmXQKKUDY3GlLn\n931her2XkjL8oPcX75/5QJM=\n-----END PRIVATE KEY-----\n",
    }),
  });
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp());
  return _db;
}

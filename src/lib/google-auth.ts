import { GoogleAuthProvider } from "firebase/auth";

/**
 * Google OAuth: fuerza el selector de cuenta y pide email explícito.
 * Sin `prompt: select_account`, a veces el popup se ciere al instante si hay sesión ambigua.
 */
export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({
    prompt: "select_account",
  });
  return provider;
}

/** Mensajes legibles para la consola de Firebase Auth (debug / UI). */
export function firebaseAuthMessageEs(code: string): string {
  const messages: Record<string, string> = {
    "auth/popup-closed-by-user":
      "Ventana cerrada antes de terminar el inicio de sesión.",
    "auth/popup-blocked":
      "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.",
    "auth/unauthorized-domain":
      "Este dominio no está en la lista de dominios autorizados de Firebase. Ve a Firebase Console → Authentication → Settings → Authorized domains y añade el host que ves en la barra de direcciones (p. ej. localhost o tu dominio).",
    "auth/operation-not-allowed":
      "El proveedor Google no está habilitado. En Firebase Console → Authentication → Sign-in method, activa Google.",
    "auth/network-request-failed":
      "Error de red. Comprueba tu conexión y vuelve a intentarlo.",
    "auth/cancelled-popup-request":
      "Solo puede abrirse un inicio de sesión a la vez. Espera un momento e inténtalo de nuevo.",
    "auth/internal-error":
      "Error interno de autenticación. Prueba otro navegador o más tarde.",
  };
  return messages[code] ?? `Error de Firebase (${code}). Revisa la consola del navegador (F12).`;
}

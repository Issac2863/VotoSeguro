import { Injectable } from '@angular/core';
import forge from 'node-forge';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {

  // Cargamos la llave pública desde el environment
  // Se usa atob() si la guardaste como Base64 para que no parezca una llave a simple vista
  private readonly publicKeyPem: string;

  constructor() {
    try {
      this.publicKeyPem = atob(environment.GATEWAY_PUBLIC_KEY_B64);
    } catch (e) {
      console.error('Error al decodificar la llave pública. Asegúrate de que esté en Base64.', e);
      this.publicKeyPem = '';
    }
  }

  /**
   * Cifra cualquier tipo de dato (objeto o string) usando RSA-OAEP con SHA-256.
   * @param payload El dato a cifrar.
   * @returns El string cifrado resultante en formato Base64.
   */
  encrypt(payload: any): string {
    if (!this.publicKeyPem) {
      throw new Error('Llave pública no disponible para el cifrado.');
    }

    try {
      // 1. Convertir el dato a string JSON y normalizarlo (quitar espacios)
      const plainText = JSON.stringify(payload || {}).replace(/\s+/g, '');

      // 2. Convertir la llave PEM a un objeto de clave pública de forge
      const publicKey = forge.pki.publicKeyFromPem(this.publicKeyPem);

      // 3. Cifrar usando el estándar RSA-OAEP (SHA-256)
      const encrypted = publicKey.encrypt(plainText, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        }
      });

      // 4. Retornar el resultado codificado en Base64 para el envío por HTTP
      return forge.util.encode64(encrypted);
    } catch (error) {
      console.error('Error durante el proceso de cifrado:', error);
      throw new Error('No se pudo cifrar la información.');
    }
  }
}
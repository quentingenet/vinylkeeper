import { BaseApiService } from "./BaseApiService";

class EncryptionService extends BaseApiService {
  private publicKey: CryptoKey | null = null;
  private encryptionAvailable: boolean | null = null;

  async isEncryptionAvailable(): Promise<boolean> {
    if (this.encryptionAvailable !== null) {
      return this.encryptionAvailable;
    }

    try {
      await this.get<{ public_key: string }>("/encryption/public-key");
      this.encryptionAvailable = true;
      return true;
    } catch (error) {
      console.info("🔐 Encryption service not available, using fallback mode");
      this.encryptionAvailable = false;
      return false;
    }
  }

  async getPublicKey(): Promise<CryptoKey> {
    if (this.publicKey) {
      return this.publicKey;
    }

    try {
      const response = await this.get<{ public_key: string }>(
        "/encryption/public-key"
      );
      const publicKeyPem = response.public_key;

      // Convert PEM to ArrayBuffer
      const binaryDer = this.convertPemToBinary(publicKeyPem);

      // Import the public key
      this.publicKey = await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
          name: "RSA-OAEP",
          hash: { name: "SHA-256" },
        },
        false,
        ["encrypt"]
      );

      return this.publicKey;
    } catch (error) {
      console.error("Failed to get public key:", error);
      throw new Error("Failed to get public key");
    }
  }

  async encryptPassword(password: string): Promise<string> {
    try {
      // Check if encryption is available
      const isAvailable = await this.isEncryptionAvailable();

      if (!isAvailable) {
        // Fallback: return password as-is for backward compatibility
        console.info("🔐 Using fallback mode - encryption not available");
        return password;
      }

      const publicKey = await this.getPublicKey();

      // Convert password to ArrayBuffer
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      // Encrypt the password
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicKey,
        passwordBuffer
      );

      // Convert to base64
      const encryptedArray = new Uint8Array(encryptedBuffer);
      return btoa(String.fromCharCode.apply(null, Array.from(encryptedArray)));
    } catch (error) {
      console.error("Failed to encrypt password:", error);
      // Fallback: return password as-is
      console.info("🔐 Falling back to unencrypted password");
      return password;
    }
  }

  private convertPemToBinary(pem: string): ArrayBuffer {
    // Remove the PEM header and footer
    const lines = pem.split("\n");
    const base64 = lines
      .filter((line) => !line.includes("-----"))
      .join("")
      .replace(/\s/g, "");

    // Convert base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const encryptionService = new EncryptionService();

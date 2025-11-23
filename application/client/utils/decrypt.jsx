import CryptoJS from "crypto-js";

export const decryptData = (encryptedData) => {
  try {
    // same key and IV as backend
    const secretKey = CryptoJS.SHA256("iecc@2025");
    const iv = CryptoJS.enc.Utf8.parse("1234567890abcdef");

    // decrypt using AES-256-CBC and Base64 input
    const decrypted = CryptoJS.AES.decrypt(encryptedData, secretKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

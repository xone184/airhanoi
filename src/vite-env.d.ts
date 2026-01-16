/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  // thêm các biến môi trường khác nếu cần
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declarations for third-party libraries without TypeScript types
declare module 'jspdf';
declare module 'html2canvas';
declare module 'docx';
declare module 'file-saver';


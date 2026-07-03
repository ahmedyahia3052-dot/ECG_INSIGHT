declare module "adm-zip" {
  type ZipEntry = {
    entryName: string;
    getData(): Buffer;
    header: { size: number };
    isDirectory: boolean;
  };

  export default class AdmZip {
    constructor(bufferOrPath?: string | Buffer);
    getEntries(): ZipEntry[];
  }
}

declare module "pdf-parse" {
  function pdfParse(buffer: Buffer): Promise<{ numpages: number; text: string }>;
  export default pdfParse;
}

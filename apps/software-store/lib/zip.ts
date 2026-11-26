import "server-only";
import yauzl from "yauzl";
export function inspectRelease(buffer: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip) return reject(new Error("INVALID_ZIP"));
        let total = 0;
        const files: string[] = [];
        zip.on("error", reject);
        zip.on("entry", (entry) => {
          const n: string = entry.fileName;
          const segments = n.toLowerCase().split("/");
          const unsafeFile = segments.some(
            (part) =>
              (part.startsWith(".env") &&
                ![".env.example", ".env.test.example"].includes(part)) ||
              part.endsWith(".env") ||
              [
                ".git",
                ".svn",
                ".hg",
                ".vercel",
                "id_rsa",
                "id_ed25519",
              ].includes(part),
          );
          total += entry.uncompressedSize;
          const mode = (entry.externalFileAttributes >>> 16) & 0o170000;
          if (
            n.startsWith("/") ||
            /^[a-z]:/i.test(n) ||
            n.includes("\\") ||
            n.split("/").includes("..") ||
            mode === 0o120000 ||
            total > 300 * 1024 * 1024 ||
            files.length >= 5000 ||
            unsafeFile
          ) {
            zip.close();
            return reject(new Error("UNSAFE_ZIP"));
          }
          files.push(n);
          zip.readEntry();
        });
        zip.on("end", () => {
          const required = [
            "README.md",
            "DEPLOY-TH.md",
            "LICENSE.md",
            "CHANGELOG.md",
            "package.json",
          ];
          if (
            required.some(
              (x) => !files.some((n) => n === x || n.endsWith("/" + x)),
            ) ||
            !files.some((n) => n.includes("supabase/") && n.endsWith(".sql")) ||
            !files.some((n) => n.includes("tests/")) ||
            !files.some((n) => n.includes("app/") && n.endsWith(".tsx"))
          ) {
            return reject(new Error("MISSING_DELIVERABLES"));
          }
          resolve(files);
        });
        zip.readEntry();
      },
    );
  });
}

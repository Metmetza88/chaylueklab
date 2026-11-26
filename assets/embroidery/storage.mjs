const DB = "woramet-embroidery-v1";
function database() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("jobs", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new Error("เปิดพื้นที่เก็บงานไม่ได้ โปรดใช้ดาวน์โหลดไฟล์แบบแทน"));
  });
}
async function transaction(mode, callback) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("jobs", mode),
        req = callback(tx.objectStore("jobs"));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () =>
        reject(
          new Error("บันทึกไม่ได้ พื้นที่เครื่องอาจเต็ม โปรดดาวน์โหลดไฟล์แบบ"),
        );
    });
  } finally {
    db.close();
  }
}
export const saveJob = (record) =>
  transaction("readwrite", (store) => store.put(record));
export const allJobs = async () =>
  (await transaction("readonly", (store) => store.getAll())).sort(
    (a, b) => b.updated - a.updated,
  );
export const deleteJob = (id) =>
  transaction("readwrite", (store) => store.delete(id));

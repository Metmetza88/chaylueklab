"use server";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/shop";
import { uuid } from "@/lib/security";
import { inspectRelease } from "@/lib/zip";
import type { State } from "@/app/actions";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export async function uploadRelease(_s: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const id = uuid.parse(text(f, "product_id"));
    const version = z
      .string()
      .regex(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/)
      .parse(text(f, "version"));
    const changelog = z.string().min(20).max(10000).parse(text(f, "changelog"));
    const file = f.get("file");
    if (
      !(file instanceof File) ||
      file.size > 7 * 1024 * 1024 ||
      !file.name.endsWith(".zip")
    )
      return { error: "ใช้ ZIP ไม่เกิน 7 MB สำหรับช่องอัปโหลดนี้" };
    const buffer = Buffer.from(await file.arrayBuffer());
    await inspectRelease(buffer);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const storage_path = `${id}/${version}/${randomUUID()}.zip`;
    const { error: uploadError } = await db.storage
      .from("store-releases")
      .upload(storage_path, buffer, {
        contentType: "application/zip",
        upsert: false,
      });
    if (uploadError) return { error: "อัปโหลดไม่สำเร็จ" };
    const { error } = await db.rpc("store_register_release", {
      p_actor: user.id,
      p_product: id,
      p_version: version,
      p_path: storage_path,
      p_sha: sha256,
      p_changelog: changelog,
    });
    if (error) {
      await db.storage.from("store-releases").remove([storage_path]);
      return { error: "เวอร์ชันซ้ำหรือบันทึกไม่สำเร็จ" };
    }
    revalidatePath("/admin");
    return {
      success: `อัปโหลดแล้ว SHA-256 ${sha256} ยังไม่เปิดขายจนตรวจผลทดสอบและอนุมัติ`,
    };
  } catch {
    return {
      error:
        "ZIP ไม่ปลอดภัย หรือขาด source/database/tests/คู่มือ/LICENSE/CHANGELOG",
    };
  }
}
export async function attestRelease(_s: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const id = uuid.parse(text(f, "release_id"));
    const hash = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(text(f, "sha256"));
    const evidence = z.string().min(30).max(2000).parse(text(f, "evidence"));
    if (f.get("reviewed") !== "on")
      return { error: "ต้องตรวจหลักฐานของ ZIP เวอร์ชันนี้ก่อน" };
    const { error } = await db.rpc("store_attest_release", {
      p_actor: user.id,
      p_release: id,
      p_sha: hash,
      p_evidence: evidence,
    });
    if (error) return { error: "รหัส release หรือ SHA-256 ไม่ตรง" };
    revalidatePath("/admin");
    return {
      success:
        "บันทึกการตรวจรับผลทดสอบแล้ว ยังต้องเปลี่ยนสถานะสินค้าเป็นพร้อมจำหน่ายแยกต่างหาก",
    };
  } catch {
    return { error: "บันทึกไม่สำเร็จ" };
  }
}
export async function provisionSchool(_s: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const slug = z
      .string()
      .regex(/^[a-z0-9-]{3,60}$/)
      .parse(text(f, "slug"));
    const name = z.string().min(3).max(150).parse(text(f, "name"));
    const owner = uuid.parse(text(f, "owner_id"));
    const { data, error } = await db.rpc("school_provision", {
      p_actor: user.id,
      p_owner: owner,
      p_slug: slug,
      p_name: name,
    });
    if (error)
      return {
        error: "สร้างโรงเรียนไม่สำเร็จ ตรวจ UUID ของเจ้าของและ slug ที่ไม่ซ้ำ",
      };
    revalidatePath("/admin");
    return {
      success: `สร้างโรงเรียน ${slug} แล้ว (${data}) เจ้าของเข้าจัดการได้ที่ /school-admin/${slug}`,
    };
  } catch {
    return { error: "ข้อมูลหรือสิทธิ์ไม่ถูกต้อง" };
  }
}

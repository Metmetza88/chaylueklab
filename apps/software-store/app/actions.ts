"use server";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/shop";
import { paymentMode, configured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { uuid, safeNext } from "@/lib/security";
import { cleanImage } from "@/lib/uploads";
import { redirect } from "next/navigation";
export type State = { error?: string; success?: string; id?: string };
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const fail = (): State => ({
  error: "ดำเนินการไม่สำเร็จ ตรวจสอบข้อมูลและสิทธิ์ หรือลองใหม่ภายหลัง",
});
export async function checkout(
  ids: string[],
  key: string,
  coupon = "",
): Promise<State> {
  try {
    const user = await requireUser();
    const mode = paymentMode();
    if (mode === "disabled")
      return { error: "ร้านยังไม่เปิดรับคำสั่งซื้อและการชำระเงิน" };
    const parsed = z
      .object({
        ids: z.array(uuid).min(1).max(15),
        key: uuid,
        coupon: z
          .string()
          .max(32)
          .regex(/^[A-Z0-9_-]*$/),
      })
      .parse({ ids, key, coupon: coupon.toUpperCase() });
    await rateLimit("checkout", user.id, 10);
    const { data, error } = await createAdmin().rpc("store_create_order", {
      p_user: user.id,
      p_ids: parsed.ids,
      p_key: parsed.key,
      p_coupon: parsed.coupon,
      p_mode: mode,
    });
    if (error)
      return {
        error:
          "สินค้ายังไม่พร้อมจำหน่าย คูปองไม่ถูกต้อง หรือรายการซ้ำ กรุณาตรวจสอบคำสั่งซื้อ",
      };
    revalidatePath("/orders");
    return { id: data };
  } catch {
    return fail();
  }
}
export async function authenticate(_prev: State, f: FormData): Promise<State> {
  if (!configured())
    return { error: "ยังไม่ได้เชื่อมระบบสมาชิก กรุณารอการเปิดให้บริการ" };
  const mode = text(f, "mode");
  try {
    const email = z.email().max(254).parse(text(f, "email"));
    const password = z.string().min(12).max(128).parse(text(f, "password"));
    const h = await headers();
    await rateLimit(
      "auth-ip",
      h.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      30,
      300,
    );
    await rateLimit(
      "auth",
      `${h.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${email.toLowerCase()}`,
      6,
      300,
    );
    const db = await createClient();
    if (mode === "signup") {
      if (f.get("consent") !== "on")
        return { error: "กรุณายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว" };
      const { error } = await db.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${process.env.APP_URL}/auth/confirm` },
      });
      if (error)
        return {
          error: "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือลองใหม่ภายหลัง",
        };
      return {
        success:
          "หากอีเมลนี้สมัครได้ ระบบจะส่งอีเมลยืนยัน กรุณาตรวจกล่องข้อความก่อนเข้าสู่ระบบ",
      };
    }
    const { data: login, error } = await db.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && login.user)
      await createAdmin()
        .from("store_profiles")
        .upsert(
          { id: login.user.id },
          { onConflict: "id", ignoreDuplicates: true },
        );
    if (error)
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล" };
  } catch {
    return fail();
  }
  redirect(safeNext(text(f, "next")));
}
export async function resetPassword(_prev: State, f: FormData): Promise<State> {
  try {
    const email = z.email().parse(text(f, "email"));
    await rateLimit("reset", email.toLowerCase(), 3, 3600);
    const db = await createClient();
    await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/auth/confirm?next=/reset-password`,
    });
    return { success: "หากมีบัญชีนี้ ระบบจะส่งอีเมลตั้งรหัสผ่านใหม่" };
  } catch {
    return fail();
  }
}
export async function updatePassword(
  _prev: State,
  f: FormData,
): Promise<State> {
  try {
    await requireUser();
    const password = z.string().min(12).max(128).parse(text(f, "password"));
    const { error } = await (
      await createClient()
    ).auth.updateUser({ password });
    if (error) return fail();
    return { success: "เปลี่ยนรหัสผ่านแล้ว" };
  } catch {
    return fail();
  }
}
export async function supportTicket(_prev: State, f: FormData): Promise<State> {
  try {
    const user = await requireUser();
    await rateLimit("support", user.id, 5, 3600);
    const v = z
      .object({
        subject: z.string().min(3).max(150),
        message: z.string().min(10).max(5000),
      })
      .parse({ subject: text(f, "subject"), message: text(f, "message") });
    const db = createAdmin();
    const { error } = await db.rpc("store_create_support", {
      p_user: user.id,
      p_subject: v.subject,
      p_message: v.message,
    });
    if (error) return fail();
    revalidatePath("/support");
    return { success: "ส่งคำขอช่วยเหลือแล้ว" };
  } catch {
    return fail();
  }
}
export async function uploadSlip(_prev: State, f: FormData): Promise<State> {
  try {
    const user = await requireUser();
    if (paymentMode() === "disabled")
      return { error: "ยังไม่เปิดรับการชำระเงิน" };
    await rateLimit("slip", user.id, 5, 3600);
    const id = uuid.parse(text(f, "order_id"));
    const file = f.get("file");
    if (!(file instanceof File)) return fail();
    const image = await cleanImage(file);
    const db = createAdmin();
    const { data: order } = await db
      .from("store_orders")
      .select("id,mode,status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!order || order.status !== "pending" || order.mode !== paymentMode())
      return fail();
    const path = `${user.id}/${id}/${randomUUID()}.png`;
    const { error: uploadError } = await db.storage
      .from("store-slips")
      .upload(path, image.data, {
        contentType: "image/png",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) return fail();
    const { error } = await db.rpc("store_register_slip", {
      p_order: id,
      p_user: user.id,
      p_hash: image.canonicalHash,
      p_path: path,
    });
    if (error) {
      await db.storage.from("store-slips").remove([path]);
      return { error: "สลิปนี้ถูกใช้แล้ว หรือคำสั่งซื้อไม่อยู่ในสถานะรับสลิป" };
    }
    revalidatePath("/orders");
    return {
      success:
        "อัปโหลดแล้ว กำลังรอตรวจสอบยอดเงินจริง การอัปโหลดสลิปยังไม่ถือว่าชำระสำเร็จ",
    };
  } catch {
    return { error: "อัปโหลดไม่สำเร็จ ใช้ภาพ PNG/JPEG ไม่เกิน 5 MB" };
  }
}
export async function verifyManualPayment(
  _prev: State,
  f: FormData,
): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const mode = paymentMode();
    if (mode === "disabled") return { error: "ระบบรับเงินปิดอยู่" };
    const id = uuid.parse(text(f, "id"));
    const ref = z.string().min(6).max(150).parse(text(f, "reference"));
    const amount = z.coerce
      .number()
      .int()
      .positive()
      .parse(text(f, "amount_cents"));
    if (f.get("bank_verified") !== "on")
      return { error: "ต้องตรวจสอบรายการเข้าจริงจากธนาคารก่อนอนุมัติ" };
    const hash = createHash("sha256")
      .update(`${id}:${ref}:${amount}:${mode}`)
      .digest("hex");
    const { error } = await db.rpc("store_confirm_payment", {
      p_order: id,
      p_event: `manual:${id}`,
      p_ref: ref,
      p_hash: hash,
      p_amount: amount,
      p_mode: mode,
      p_actor: user.id,
    });
    if (error)
      return {
        error:
          "ไม่สามารถยืนยันได้ ยอดเงิน/เลขอ้างอิง/สถานะไม่ตรง หรือถูกใช้แล้ว",
      };
    revalidatePath("/admin");
    revalidatePath("/orders");
    return { success: "ยืนยันและเปิดสิทธิ์ดาวน์โหลดแล้ว" };
  } catch {
    return fail();
  }
}
export async function refundOrder(_prev: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    if (f.get("confirmed") !== "on")
      return { error: "ยืนยันว่าได้คืนเงินภายนอกระบบแล้ว" };
    const { error } = await db.rpc("store_refund", {
      p_actor: user.id,
      p_order: uuid.parse(text(f, "id")),
    });
    if (error) return fail();
    revalidatePath("/admin");
    return { success: "บันทึกการคืนเงินและถอนสิทธิ์แล้ว" };
  } catch {
    return fail();
  }
}
export async function saveProduct(_prev: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const data = z
      .object({
        slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
        name: z.string().min(3).max(150),
        tagline: z.string().min(3).max(200),
        description: z.string().max(5000),
        category: z.string().min(2).max(80),
        price_cents: z.coerce.number().int().min(0).max(100000000),
        status: z.enum(["coming_soon", "archived", "ready"]),
      })
      .parse(
        Object.fromEntries(
          [
            "slug",
            "name",
            "tagline",
            "description",
            "category",
            "price_cents",
            "status",
          ].map((k) => [k, text(f, k)]),
        ),
      );
    const id = text(f, "id");
    if (data.status === "ready") {
      if (!id)
        return {
          error:
            "เพิ่มสินค้าสถานะ Coming Soon ก่อน แล้วอัปโหลด release ที่ผ่านการทดสอบ",
        };
      const { data: p } = await db
        .from("store_products")
        .select("latest_release_id")
        .eq("id", uuid.parse(id))
        .single();
      const { data: r } = await db
        .from("store_releases")
        .select("tested_at")
        .eq("id", p?.latest_release_id ?? "")
        .maybeSingle();
      if (!r?.tested_at)
        return { error: "ต้องมี release และหลักฐานทดสอบก่อนเปิดขาย" };
    }
    const value = { ...data, vip_free: f.get("vip_free") === "on" };
    const result = id
      ? await db.from("store_products").update(value).eq("id", uuid.parse(id))
      : await db.from("store_products").insert(value);
    if (result.error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "product.saved",
      target_id: id || data.slug,
    });
    revalidatePath("/products");
    revalidatePath("/admin");
    return { success: "บันทึกสินค้าแล้ว" };
  } catch {
    return fail();
  }
}
export async function saveCoupon(_prev: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const c = z
      .object({
        code: z.string().regex(/^[A-Z0-9_-]{3,32}$/),
        percent: z.coerce.number().int().min(1).max(100),
        max_uses: z.coerce.number().int().min(1),
        expires_at: z.iso.datetime(),
      })
      .parse({
        code: text(f, "code").toUpperCase(),
        percent: text(f, "percent"),
        max_uses: text(f, "max_uses"),
        expires_at: new Date(text(f, "expires_at") + "+07:00").toISOString(),
      });
    const { error } = await db.from("store_coupons").insert(c);
    if (error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "coupon.created",
      target_id: c.code,
    });
    revalidatePath("/admin");
    return { success: "สร้างคูปองแล้ว" };
  } catch {
    return fail();
  }
}
export async function replySupport(_prev: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const id = uuid.parse(text(f, "id"));
    const reply = z.string().min(3).max(5000).parse(text(f, "reply"));
    const status = z
      .enum(["open", "in_progress", "resolved"])
      .parse(text(f, "status"));
    const { error } = await db
      .from("store_support")
      .update({ reply, status })
      .eq("id", id);
    if (error) return fail();
    await db
      .from("store_audit")
      .insert({ actor_id: user.id, action: "support.replied", target_id: id });
    revalidatePath("/admin");
    revalidatePath("/support");
    return { success: "บันทึกคำตอบแล้ว" };
  } catch {
    return fail();
  }
}
export async function setVip(_prev: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const id = uuid.parse(text(f, "user_id"));
    const until = text(f, "vip_until");
    const { error } = await db.from("store_profiles").upsert({
      id,
      vip_until: until ? new Date(until + "+07:00").toISOString() : null,
    });
    if (error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "membership.changed",
      target_id: id,
      details: { reason: text(f, "reason").slice(0, 200) },
    });
    revalidatePath("/admin");
    return { success: "ปรับสิทธิ์ VIP แล้ว" };
  } catch {
    return fail();
  }
}

export async function rejectOrder(_s: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const { error } = await db.rpc("store_reject_order", {
      p_actor: user.id,
      p_order: uuid.parse(text(f, "id")),
      p_reason: z.string().min(3).max(2000).parse(text(f, "reason")),
    });
    if (error) return fail();
    revalidatePath("/admin");
    revalidatePath("/orders");
    return { success: "บันทึกการปฏิเสธแล้ว" };
  } catch {
    return fail();
  }
}
export async function revokeGrant(_s: State, f: FormData): Promise<State> {
  try {
    const { user, db } = await requireAdmin();
    const id = uuid.parse(text(f, "id"));
    const reason = z.string().min(3).max(200).parse(text(f, "reason"));
    const { error } = await db
      .from("store_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "download.grant-revoked",
      target_id: id,
      details: { reason },
    });
    revalidatePath("/admin");
    return { success: "ถอนสิทธิ์แล้ว" };
  } catch {
    return fail();
  }
}

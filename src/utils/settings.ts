import { db } from "../db/db";

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const msg = await db.messages.where("subject").equals(`setting_${key}`).first();
    return msg ? msg.content : null;
  } catch (e) {
    console.error("Error getting system setting:", e);
    return null;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  try {
    const msg = await db.messages.where("subject").equals(`setting_${key}`).first();
    if (msg) {
      await db.messages.update(msg.id!, { content: value });
    } else {
      await db.messages.add({
        senderId: 0,
        senderName: "System",
        senderRole: "Super Admin",
        receiverId: "system",
        subject: `setting_${key}`,
        content: value,
        date: new Date().toISOString(),
        read: true,
        type: "system"
      });
    }
  } catch (e) {
    console.error("Error setting system setting:", e);
  }
}

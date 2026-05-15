// Fixed Mongolian welcome message sent on the first contact (or when the user types "11").
// Not AI-generated — keeps latency low and the greeting consistent.
export const WELCOME_MESSAGE = [
  "Сайн байна уу! Zaisan High Land luxury residence-д тавтай морилно уу.",
  "Та ямар мэдээлэл сонирхож байна вэ? Жишээ нь:",
  "• Төслийн ерөнхий мэдээлэл",
  "• Байршил",
  "• Барилгын хийцлэл",
  "• Төлбөрийн нөхцөл",
  "• Өрөөний зохион байгуулалт",
  "• Борлуулалтын алба",
].join("\n");

// Trigger payloads: empty conversation history OR user typed exactly one of these.
const WELCOME_TRIGGER_TEXTS = new Set(["11"]);

export function isWelcomeTriggerText(text: string): boolean {
  return WELCOME_TRIGGER_TEXTS.has(text.trim());
}

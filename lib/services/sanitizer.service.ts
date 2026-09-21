import sanitizeHtml from "sanitize-html";

export const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "sub",
  "sup",
  "p",
  "br",
  "span",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
];

export const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  span: ["class", "style"],
  p: ["class", "style"],
  code: ["class"],
  img: ["src", "alt", "width", "height", "class"],
  table: ["class", "border"],
  th: ["class", "colspan", "rowspan"],
  td: ["class", "colspan", "rowspan"],
};

/**
 * Sanitizes rich text question content, option texts, and explanations.
 * Completely strips malicious scripts, iframes, and dangerous event handlers.
 */
export function sanitizeQuestionHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  return sanitizeHtml(dirtyHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "data"],
    disallowedTagsMode: "discard",
  });
}

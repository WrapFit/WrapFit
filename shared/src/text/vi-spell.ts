/**
 * Vietnamese spell check (docs-old/23 S22) without a dictionary: every written Vietnamese syllable follows a small grammar
 * (onset, rhyme, one tone mark, spelling rules of c/k, g/gh, ng/ngh, and the stop endings that take only the sắc or
 * nặng tone). A syllable outside that grammar is almost always a typo: "chúcc", "Têt" (no) – but "đep", "tiê", "nghă",
 * "cảmm", "thnàh" are caught.
 *
 * Only words that carry a Vietnamese letter or tone mark are checked, so English words, brand names and numbers in a
 * design are never flagged; a toneless Vietnamese typo that is a valid syllable ("chuc") is not caught either.
 */

const TONES: Record<string, "huyen" | "sac" | "nga" | "hoi" | "nang"> = {
  "̀": "huyen",
  "́": "sac",
  "̃": "nga",
  "̉": "hoi",
  "̣": "nang",
};

const VIETNAMESE = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;
const LETTERS = /^[a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+$/;

/** Onsets, longest first. */
const ONSETS = ["ngh", "ng", "gh", "gi", "kh", "nh", "ph", "th", "tr", "ch", "qu", "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x"];
const FINALS = ["ng", "nh", "ch", "c", "m", "n", "p", "t"];

/** Vowel groups that end the syllable (their last letter is a glide): no final consonant after them. */
const OPEN = new Set([
  "a", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "y",
  "ai", "ao", "au", "ay", "âu", "ây", "eo", "êu", "ia", "iu", "oi", "ôi", "ơi", "ui", "ưi", "ưu", "ua", "ưa", "ya",
  "oa", "oe", "uy", "uê", "uơ", "oo",
  "oai", "oay", "oao", "oeo", "iêu", "yêu", "uôi", "ươi", "ươu", "uây", "uyu", "uya",
]);
/** Vowel groups that need a final consonant. */
const CLOSED = new Set(["ă", "â", "iê", "yê", "uô", "ươ", "oă", "uâ", "uyê"]);
/** Vowel groups that may take a final consonant (the closed ones and the plain vowels). */
const CAN_CLOSE = new Set(["a", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "y", "oa", "oe", "uy", "uê", "oo", "uơ", ...CLOSED]);
/** -nh and -ch follow only these. */
const BEFORE_NH_CH = new Set(["a", "ê", "i", "y", "oa", "uy", "uê"]);

const FRONT = /^[ieêy]/; // k, gh, ngh go before these; c, g, ng do not

/** Is one written syllable (letters only) a possible Vietnamese syllable? */
export function isVietnameseSyllable(word: string): boolean {
  const lower = word.normalize("NFC").toLowerCase();
  if (!LETTERS.test(lower)) return false;
  // Tone: at most one mark; then the toneless spelling.
  const decomposed = lower.normalize("NFD");
  const marks = [...decomposed].filter((c) => c in TONES);
  if (marks.length > 1) return false;
  const tone = marks.length ? TONES[marks[0]] : "ngang";
  const plain = [...decomposed].filter((c) => !(c in TONES)).join("").normalize("NFC");

  let onset = ONSETS.find((o) => plain.startsWith(o)) ?? "";
  let rest = plain.slice(onset.length);
  // "gi" is g + i when nothing or only a final follows ("gì", "gìn").
  if (onset === "gi" && (rest === "" || FINALS.includes(rest))) {
    onset = "g";
    rest = plain.slice(1);
  }
  if (rest === "") return false;
  if (onset === "qu" && !/^[aăâeêioơy]/.test(rest)) return false;
  // Spelling of the onset before front vowels.
  const front = FRONT.test(rest);
  if ((onset === "k" || onset === "gh" || onset === "ngh") && !front) return false;
  if ((onset === "c" || onset === "ng") && front) return false;
  if (onset === "g" && front && plain !== "gi" && !plain.startsWith("gi")) return false;

  const final = FINALS.find((f) => rest.endsWith(f) && rest.length > f.length) ?? "";
  const nucleus = rest.slice(0, rest.length - final.length);
  if (!/^[aăâeêioôơuưy]+$/.test(nucleus)) return false;
  if (final) {
    if (!CAN_CLOSE.has(nucleus)) return false;
    if ((final === "nh" || final === "ch") && !BEFORE_NH_CH.has(nucleus)) return false;
    // Stop endings take only the sắc or nặng tone.
    if (["c", "ch", "p", "t"].includes(final) && tone !== "sac" && tone !== "nang") return false;
  } else if (!OPEN.has(nucleus) || CLOSED.has(nucleus)) {
    return false;
  }
  return true;
}

/** Words of a text that look misspelt, each once, in order (only words with a Vietnamese letter or tone mark). */
export function misspelledWords(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of text.normalize("NFC").split(/[^\p{L}]+/u)) {
    // f, j, w, z are not Vietnamese letters: a loanword or a name ("Café"), never checked.
    if (!word || !VIETNAMESE.test(word) || /[fjwz]/i.test(word) || isVietnameseSyllable(word)) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

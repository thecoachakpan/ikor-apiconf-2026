export const calculateWordDeduction = (item: {
  type?: string;
  mode?: string;
  duration?: string;
  wordsSpoken?: number;
  words?: number | null;
  highlightedChars?: number;
  isQuickMessage?: boolean;
  content?: string;
}): number => {
  const content = item.content || "";
  const spoken = typeof item.wordsSpoken === 'number' 
    ? item.wordsSpoken 
    : (typeof item.words === 'number' ? item.words : (content ? content.split(/\s+/).filter(Boolean).length : 0));
  const type = item.type || "Dictation";
  const mode = item.mode || "Fast";
  
  // Parse duration e.g. "3.2m" -> Seconds
  let durationSec = 0;
  if (item.duration && item.duration !== "—") {
    const minMatch = item.duration.match(/([\d.]+)\s*m/);
    if (minMatch) {
       durationSec = parseFloat(minMatch[1]) * 60;
    }
  }

  let val = spoken;

  if (type === "ScribePro" || type === "Text Editing") {
    // ScribePro Specific calculations (not smart polishing)
    if (typeof item.highlightedChars === 'number' && item.highlightedChars > 2000) {
      val = spoken + Math.floor(item.highlightedChars / 50);
    } else if (
      item.isQuickMessage || 
      content.toLowerCase().includes("reply") || 
      content.toLowerCase().includes("email") || 
      content.toLowerCase().includes("slack") || 
      content.toLowerCase().includes("message")
    ) {
      val = spoken + 150; // flat thread rate
    } else {
      // Standard rate
      val = spoken;
    }
  } else {
    // Dictation speed modes
    if (mode === "Ultrafast" || mode === "ultra-fast") {
      val = spoken + (durationSec * 2);
    } else if (mode === "Queued" || mode === "queued") {
      val = Math.max(0, spoken - (durationSec * 0.5));
    } else {
      // Fast mode: standard 1-to-1 conversion
      val = spoken;
    }
  }

  const finalVal = typeof val === 'number' && !isNaN(val) ? val : 0;
  return parseFloat(finalVal.toFixed(1));
};

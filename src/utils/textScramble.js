/**
 * Text scrambling utility for creating Claude-style animated text transitions
 * Based on the scramble effect where characters jumble before settling into the final text
 */

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";

/**
 * Scrambles from one text to another with animation
 * @param {Object} options - Configuration object
 * @param {string} options.oldText - The current text to transition from
 * @param {string} options.newText - The target text to transition to
 * @param {Function} options.onUpdate - Callback called on each frame with the current scrambled text
 * @param {number} options.duration - Duration of the scramble effect in milliseconds (default: 600)
 * @returns {Promise} Resolves when the scramble animation is complete
 */
export function scrambleText({ oldText, newText, onUpdate, duration = 600 }) {
  const chars = newText.split("");
  const oldChars = oldText.split("");
  const length = Math.max(chars.length, oldChars.length);
  let frame = 0;
  const queue = [];

  // Build the animation queue for each character
  for (let i = 0; i < length; i++) {
    const from = oldChars[i] || "";
    const to = chars[i] || "";
    const start = Math.floor(Math.random() * 20);
    const end = start + Math.floor(Math.random() * 20);
    queue.push({ from, to, start, end });
  }

  return new Promise((resolve) => {
    function update() {
      let output = "";
      let complete = 0;

      for (let i = 0; i < queue.length; i++) {
        let { from, to, start, end, char } = queue[i];

        if (frame >= end) {
          complete++;
          output += to;
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char =
              SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            queue[i].char = char;
          }
          output += char;
        } else {
          output += from;
        }
      }

      onUpdate(output);

      if (complete === queue.length) {
        resolve();
      } else {
        frame++;
        requestAnimationFrame(update);
      }
    }

    update();
  });
}

/**
 * Array of action words for the typing indicator
 */
export const TYPING_WORDS = [
  "thinking",
  "analyzing",
  "processing",
  "drafting",
  "responding",
  "refining",
  "reflecting",
  "finalizing",
  "contemplating",
  "reasoning",
  "evaluating",
  "formulating",
  "interpreting",
  "understanding",
  "structuring",
  "summarizing",
  "synthesizing",
  "exploring",
  "composing",
  "calculating",
  "inferring",
  "reviewing",
  "adjusting",
  "optimizing",
  "rewriting",
  "debugging",
  "decoding",
  "translating",
  "predicting",
  "compiling",
  "constructing",
  "improvising",
  "imagining",
  "deliberating",
  "pondering",
  "revising",
  "curating",
  "assembling",
  "testing",
  "deducing",
  "connecting",
  "articulating",
  "evaluating",
  "rephrasing",
  "clarifying",
  "expanding",
  "streamlining",
  "polishing",
  "generating",
  "reacting",
  "abrupting",
];

/**
 * React hook for cycling through words with scramble effect
 * @param {Array<string>} words - Array of words to cycle through
 * @param {number} interval - Time between word changes in milliseconds
 * @returns {string} The current scrambled/stable word
 */
export function useScrambleText(words, interval = 3000) {
  // This will be implemented in the component
  // Exported as a helper for component usage
  return null;
}

import { useEffect, useState } from "react";

/**
 * Sparkle
 * - Pass a boolean trigger that flips true when you want sparkles.
 * - It auto-hides after 900ms.
 */
export default function Sparkle({ trigger }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;

  return (
    <>
      <span className="lifeos-sparkle left-1/2 -translate-x-1/2 top-2">✨</span>
      <span className="lifeos-sparkle left-[46%] top-3 [animation-delay:90ms]">✨</span>
      <span className="lifeos-sparkle left-[54%] top-1 [animation-delay:160ms]">✨</span>
    </>
  );
}

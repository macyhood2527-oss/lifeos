import { useEffect, useState } from "react";

export default function Sparkles({ trigger }) {
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

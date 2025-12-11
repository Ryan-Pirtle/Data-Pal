import { useState, useRef, useEffect } from "react";

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-2">
        <div className="font-semibold text-lg">Data Pal</div>
        <button className="text-gray-600 text-sm">▼</button>
      </div>

      <div className="flex items-center gap-3">
        <button className="text-gray-600 hover:text-black text-sm">Star</button>

        <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100">
          Get Plus
        </button>

        <button className="text-gray-600 hover:text-black text-sm">Share</button>

        <button className="text-gray-600 hover:text-black text-sm">Add</button>

        <div className="relative" ref={menuRef}>
          <button
            className="text-gray-600 hover:text-black text-lg"
            onClick={() => setMenuOpen(p => !p)}
          >
            ...
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow">
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">
                Settings
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">
                Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

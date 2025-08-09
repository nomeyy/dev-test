import type { IDropdownInput, IDropdownInputOption } from "@/types/sse";
import { useEffect, useRef, useState } from "react";

const DropdownInput = (props: IDropdownInput) => {
  const { options, selected, onSelect, className = "" } = props;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block w-[480px] ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <span className="text-black">{selected?.label}</span>
        <svg
          className={`h-5 w-5 text-black transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
          {options.map((option: IDropdownInputOption) => (
            <li
              key={option.id}
              className={`cursor-pointer px-4 py-2 text-black hover:bg-blue-100 ${selected?.id === option.id ? "bg-blue-100 font-bold" : ""}`}
              onClick={() => {
                setIsOpen(false);
                onSelect(option);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownInput;

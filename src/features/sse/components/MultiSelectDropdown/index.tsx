import type { IDropdownInputOption, IMultiSelectDropdown } from "@/types/sse";
import { useEffect, useRef, useState } from "react";

const MultiSelectDropdown = (props: IMultiSelectDropdown) => {
  const { options, setSelected, className = "", placeHolder, selected } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState("");
  const [allSelected, setAllSelected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: IDropdownInputOption) => {
    if (selected.find((sel) => sel.id === option.id)) {
      // Remove option if already selected
      setSelected(selected.filter((sel) => sel.id !== option.id));
    } else {
      // Add option if not selected
      setSelected([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    setAllSelected(true);
    setSelected(options);
  };

  const handleDeselectAll = () => {
    setAllSelected(false);
    setSelected([]);
  };

  useEffect(() => {
    const selectedList: string[] = [];
    selected.forEach((option: IDropdownInputOption) => {
      selectedList.push(option.label);
    });
    setList(selectedList.join(", "));

    if (selected.length === options.length) setAllSelected(true);
    else setAllSelected(false);
  }, [selected, options]);

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
        <span className="text-black">{list || placeHolder}</span>
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
          <li>
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              className="cursor-pointer gap-[6px] px-4 py-2 text-black"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </li>
          {options.map((option: IDropdownInputOption) => {
            const isSelected = selected.find(
              (opt: IDropdownInputOption) => opt.id === option.id,
            )
              ? true
              : false;
            return (
              <li
                key={option.id}
                className={`flex cursor-pointer gap-[6px] px-4 py-2 text-black hover:bg-blue-100 ${isSelected ? "bg-blue-100 font-bold" : ""}`}
              >
                <input
                  id={option.id}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelect(option)}
                />
                <label htmlFor={option.id}>{option.label}</label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MultiSelectDropdown;

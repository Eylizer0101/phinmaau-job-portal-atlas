import React, { useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const moreTabs = [
  { key: 'certifications', label: 'Certifications' },
  { key: 'projects', label: 'Projects' },
  { key: 'seminars', label: 'Seminars and Trainings' },
  { key: 'awards', label: 'Awards and Achievements' },
  { key: 'affiliations', label: 'Affiliations' },
  { key: 'cocurricular', label: 'Co-curricular Activities' },
  { key: 'references', label: 'References' },
];

const ProfileMoreDropdown = ({ activeTab, onChange }) => {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const isMoreActive = moreTabs.some((tab) => tab.key === activeTab);
  const selectedLabel = moreTabs.find((tab) => tab.key === activeTab)?.label;

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 256;
    const viewportWidth = window.innerWidth;
    const left = Math.min(rect.left, viewportWidth - dropdownWidth - 12);

    setDropdownPosition({
      top: rect.bottom + 12,
      left: Math.max(12, left),
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !dropdownRef.current?.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    updateDropdownPosition();

    const handleWindowChange = () => {
      updateDropdownPosition();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          role="tab"
          aria-selected={isMoreActive}
          aria-expanded={open}
          onClick={() => {
            updateDropdownPosition();
            setOpen((prev) => !prev);
          }}
          className={`relative h-11 inline-flex items-center gap-2 px-2 sm:px-3 text-sm font-medium whitespace-nowrap transition-colors ${
            isMoreActive ? 'text-[#1658d3]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{selectedLabel || 'More'}</span>
          <FaChevronDown className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className={`absolute left-0 right-0 -bottom-[11px] h-[2px] ${isMoreActive ? 'bg-[#1658d3]' : 'bg-transparent'}`} />
        </button>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          {moreTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                onChange(tab.key);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-50 text-[#1658d3]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ProfileMoreDropdown;

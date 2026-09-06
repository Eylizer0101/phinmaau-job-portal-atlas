import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmployerLayout from '../../../layouts/EmployerLayout';
import { BuildingIcon, JobDetailsSvgIcon } from '../../../components/shared/JobseekerIcons';
import {
  JOB_TYPES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  WILLING_TO_RELOCATE_OPTIONS,
  PERKS_AND_BENEFITS_OPTIONS
} from '../../../constants/postJobDropdownOptions';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaListOl,
  FaListUl,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaChevronDown,
} from 'react-icons/fa';

const Alert = ({ type, children }) => {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div
      className={`mb-5 rounded-xl border p-4 text-sm font-medium ${styles}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {children}
    </div>
  );
};

const Field = ({ id, label, required, hint, error, children }) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const childWithA11y =
    React.isValidElement(children)
      ? React.cloneElement(children, {
          'aria-describedby': describedBy,
        })
      : children;

  const showHint = Boolean(hint) && !Boolean(error);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900">
        {label}
      </label>

      {childWithA11y}

      {showHint && (
        <p id={hintId} className="text-xs text-gray-500 leading-5">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs font-medium text-red-600 leading-5">
          {error}
        </p>
      )}
    </div>
  );
};



const normalizeRichTextValue = (value = '') => {
  const clean = String(value || '');
  if (!clean) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(clean)) return clean;

  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
};

const getRichTextPlainText = (value = '') => {
  const clean = String(value || '');
  if (!clean) return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return clean.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(clean, 'text/html');
  return String(doc.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const JOB_TEXT_MIN = 1000;
const JOB_TEXT_MAX = 2000;
const MAX_SALARY = 999999;
const INVALID_JOB_TITLE_WORDS = [
  'iloveyou', 'i love you', 'love you', 'mahal kita', 'fuck', 'shit', 'bitch',
  'sex', 'sexy', 'porn', 'xxx', 'test', 'asdf', 'qwerty', 'sample', 'random',
];
const normalizeSingleLine = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const getJobTitleError = (value = '') => {
  const title = normalizeSingleLine(value);
  const lower = title.toLowerCase();
  if (!title) return 'Job title is required.';
  if (title.length > 100) return 'Job title must not exceed 100 characters.';
  if (/\d/.test(title)) return 'Job title must not contain numbers.';
  if (!/^[a-zA-ZÀ-ÿ&/().,'’+\-\s]+$/.test(title)) return 'Enter a valid job title using letters only.';
  if (INVALID_JOB_TITLE_WORDS.some((word) => lower.includes(word))) return 'Enter a professional, job-related title.';
  if (/(.)\1{3,}/i.test(title) || !/[aeiou]/i.test(title.replace(/\b(hr|it)\b/gi, ''))) return 'Enter a valid, recognizable job title.';
  return '';
};

const addMonthsLocalISO = (date, months) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return getLocalISODate(result);
};

const RichTextToolbarButton = ({
  title,
  children,
  onMouseDown,
  className = '',
  active = false,
  ariaExpanded,
  ariaHaspopup,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-expanded={ariaExpanded}
    aria-haspopup={ariaHaspopup}
    onMouseDown={(event) => {
      event.preventDefault();
      onMouseDown?.();
    }}
    className={[
      'flex h-8 min-w-8 items-center justify-center rounded px-2',
      'text-[15px] font-semibold text-gray-700 transition hover:bg-gray-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]/30',
      active ? 'bg-[#eaf2fb] text-[#2e66a6]' : '',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const RICH_TEXT_ALIGNMENT_OPTIONS = [
  { command: 'justifyLeft', label: 'Align left', icon: <FaAlignLeft /> },
  { command: 'justifyCenter', label: 'Align center', icon: <FaAlignCenter /> },
  { command: 'justifyRight', label: 'Align right', icon: <FaAlignRight /> },
  { command: 'justifyFull', label: 'Justify', icon: <FaAlignJustify /> },
];

const RichTextEditor = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = '',
  rows = 6,
  error = false,
  disabled = false,
}) => {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const alignmentMenuRef = useRef(null);
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = normalizeRichTextValue(value);
    if (document.activeElement !== editor && editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    if (!alignmentOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (alignmentMenuRef.current && !alignmentMenuRef.current.contains(event.target)) {
        setAlignmentOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setAlignmentOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [alignmentOpen]);

  const emitChange = () => {
    const nextValue = editorRef.current?.innerHTML || '';

    onChange?.({
      target: {
        id,
        name,
        type: 'text',
        value: nextValue,
      },
    });
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();

    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const commonContainer =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (commonContainer && editor.contains(commonContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const placeCaretAtEnd = () => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();
    if (!editor || !selection) return;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();
    if (!editor || !selection) return;

    editor.focus();

    const savedRange = savedRangeRef.current;
    if (savedRange) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
        return;
      } catch (selectionError) {
        // The saved DOM range may no longer exist after an external value update.
      }
    }

    placeCaretAtEnd();
  };

  const runCommand = (command, commandValue = null) => {
    if (disabled) return;

    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const formatHeading = (tagName) => {
    if (disabled) return;

    restoreSelection();
    document.execCommand('formatBlock', false, `<${String(tagName).toLowerCase()}>`);
    saveSelection();
    emitChange();
  };

  const minHeight = Math.max(140, Number(rows || 6) * 24);
  const empty = !getRichTextPlainText(value);

  return (
    <div className={disabled ? 'opacity-60' : ''}>
      <div
        className={`flex min-h-12 flex-wrap items-center gap-1 rounded-t-xl border border-b-0 bg-white px-3 py-1.5 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <RichTextToolbarButton title="Bold" onMouseDown={() => runCommand('bold')}>
          <FaBold className="text-[14px]" />
        </RichTextToolbarButton>

        <RichTextToolbarButton title="Italic" onMouseDown={() => runCommand('italic')}>
          <FaItalic className="text-[14px]" />
        </RichTextToolbarButton>

        <RichTextToolbarButton title="Underline" onMouseDown={() => runCommand('underline')}>
          <FaUnderline className="text-[14px]" />
        </RichTextToolbarButton>

        <span className="mx-1 h-7 border-l border-gray-300" aria-hidden="true" />

        <RichTextToolbarButton title="Numbered list" onMouseDown={() => runCommand('insertOrderedList')}>
          <FaListOl className="text-[16px]" />
        </RichTextToolbarButton>

        <RichTextToolbarButton title="Bulleted list" onMouseDown={() => runCommand('insertUnorderedList')}>
          <FaListUl className="text-[16px]" />
        </RichTextToolbarButton>

        <div ref={alignmentMenuRef} className="relative">
          <RichTextToolbarButton
            title="Text alignment"
            ariaExpanded={alignmentOpen}
            ariaHaspopup="menu"
            active={alignmentOpen}
            onMouseDown={() => {
              saveSelection();
              setAlignmentOpen((current) => !current);
            }}
            className="gap-1"
          >
            <FaAlignLeft className="text-[16px]" />
            <FaChevronDown className={`text-[9px] transition-transform ${alignmentOpen ? 'rotate-180' : ''}`} />
          </RichTextToolbarButton>

          {alignmentOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-[10050] mt-1 w-44 overflow-hidden rounded-[5px] border border-gray-200 bg-white py-1 shadow-xl"
            >
              {RICH_TEXT_ALIGNMENT_OPTIONS.map((option) => (
                <button
                  key={option.command}
                  type="button"
                  role="menuitem"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    runCommand(option.command);
                    setAlignmentOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-[#2e66a6]"
                >
                  <span className="flex w-5 items-center justify-center text-[16px]" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <span className="mx-1 h-7 border-l border-gray-300" aria-hidden="true" />

        <RichTextToolbarButton title="Heading 1" onMouseDown={() => formatHeading('H1')}>
          <span className="text-[15px] font-bold">H1</span>
        </RichTextToolbarButton>

        <RichTextToolbarButton title="Heading 2" onMouseDown={() => formatHeading('H2')}>
          <span className="text-[15px] font-bold">H2</span>
        </RichTextToolbarButton>
      </div>

      <div className="relative">
        {empty ? (
          <div className="pointer-events-none absolute left-4 top-3 text-gray-400">
            {placeholder}
          </div>
        ) : null}

        <div
          ref={editorRef}
          id={id}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-invalid={error}
          onInput={() => {
            emitChange();
            saveSelection();
          }}
          onFocus={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onSelect={saveSelection}
          onBlur={() => {
            saveSelection();
            emitChange();
            onBlur?.();
          }}
          className={[
            'w-full overflow-y-auto rounded-b-xl border bg-white px-4 py-3 text-gray-900 outline-none',
            'focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6]',
            '[&_p]:my-1',
            '[&_div]:my-1',
            '[&_h1]:my-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight',
            '[&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight',
            '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-7',
            '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-7',
            '[&_li]:my-1',
            '[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4',
            error ? 'border-red-300' : 'border-gray-300',
            disabled ? 'cursor-not-allowed bg-gray-50' : '',
          ].join(' ')}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
};

const DEFAULT_MAP_CENTER = { lat: 12.8797, lng: 121.7740 };
const PHILIPPINES_MAP_BOUNDS = L.latLngBounds(
  [4.2, 116.8],
  [21.3, 126.7]
);

const isInsidePhilippinesMapBounds = (lat, lng) => {
  const nextLat = Number(lat);
  const nextLng = Number(lng);

  return (
    Number.isFinite(nextLat) &&
    Number.isFinite(nextLng) &&
    PHILIPPINES_MAP_BOUNDS.contains([nextLat, nextLng])
  );
};

const toCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const createPinIcon = () => {
  return L.divIcon({
    className: 'agapay-leaflet-pin',
    html: '<div style="width:28px;height:28px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 6px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:999px;background:white;"></div></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

const LocationMapPicker = ({ value, latitude, longitude, onChange, disabled, error, placeholder }) => {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceRef = useRef(null);
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');

  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  const hasCoordinates =
    lat !== null &&
    lng !== null &&
    isInsidePhilippinesMapBounds(lat, lng);

  const updateMarker = useCallback((nextLat, nextLng, shouldZoom = true) => {
    if (!mapRef.current || !isInsidePhilippinesMapBounds(nextLat, nextLng)) return;

    const nextPoint = [nextLat, nextLng];

    if (!markerRef.current) {
      markerRef.current = L.marker(nextPoint, {
        draggable: !disabled,
        icon: createPinIcon(),
      }).addTo(mapRef.current);

      markerRef.current.on('dragend', async () => {
        const point = markerRef.current.getLatLng();
        await reverseLookup(point.lat, point.lng);
      });
    } else {
      markerRef.current.setLatLng(nextPoint);
    }

    if (shouldZoom) {
      mapRef.current.setView(nextPoint, 16);
    }
  }, [disabled]);

  const reverseLookup = useCallback(async (nextLat, nextLng) => {
    if (!isInsidePhilippinesMapBounds(nextLat, nextLng)) {
      setResults([]);
      setStatus('Please select a work location within the Philippines.');
      return;
    }

    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));

    setStatus('Getting address...');

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}&accept-language=en`;
      const response = await fetch(url);
      const data = await response.json();
      const countryCode = String(data?.address?.country_code || '').toLowerCase();

      if (countryCode && countryCode !== 'ph') {
        setResults([]);
        setStatus('Please select a work location within the Philippines.');
        return;
      }

      const address = data?.display_name || `${roundedLat}, ${roundedLng}`;

      setQuery(address);
      setResults([]);
      setStatus('Exact map location selected.');
      onChange({ address, lat: roundedLat, lng: roundedLng });
      updateMarker(roundedLat, roundedLng, false);
    } catch (err) {
      const fallbackAddress = `${roundedLat}, ${roundedLng}`;
      setQuery(fallbackAddress);
      setResults([]);
      setStatus('Location selected. Address lookup failed, but coordinates are saved.');
      onChange({ address: fallbackAddress, lat: roundedLat, lng: roundedLng });
      updateMarker(roundedLat, roundedLng, false);
    }
  }, [onChange, updateMarker]);

  const searchLocation = useCallback(async (searchText) => {
    const clean = String(searchText || '').trim();
    if (clean.length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    setStatus('Searching location...');

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ph&accept-language=en&q=${encodeURIComponent(clean)}`;
      const response = await fetch(url);
      const data = await response.json();
      const philippinesResults = (Array.isArray(data) ? data : []).filter((item) =>
        isInsidePhilippinesMapBounds(item?.lat, item?.lon)
      );
      setResults(philippinesResults);
      setStatus(philippinesResults.length ? 'Choose a Philippine result below or click the map.' : 'No Philippine result found. Try a more specific address.');
    } catch (err) {
      setResults([]);
      setStatus('Search failed. You can still click the map to set the pin.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handlePickResult = useCallback((item) => {
    const nextLat = Number(item.lat);
    const nextLng = Number(item.lon);
    if (
      !Number.isFinite(nextLat) ||
      !Number.isFinite(nextLng) ||
      !isInsidePhilippinesMapBounds(nextLat, nextLng)
    ) {
      setStatus('Please select a work location within the Philippines.');
      return;
    }

    const address = item.display_name || `${nextLat}, ${nextLng}`;
    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));

    setQuery(address);
    setResults([]);
    setStatus('Exact map location selected.');
    onChange({ address, lat: roundedLat, lng: roundedLng });
    updateMarker(roundedLat, roundedLng, true);
  }, [onChange, updateMarker]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    mapRef.current = L.map(mapElRef.current, {
      center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
      zoom: 5,
      minZoom: 5,
      maxBounds: PHILIPPINES_MAP_BOUNDS.pad(0.12),
      maxBoundsViscosity: 1,
      scrollWheelZoom: true,
      worldCopyJump: false,
      zoomControl: true,
    });

    const primaryTileLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        minZoom: 5,
        maxZoom: 19,
        noWrap: true,
        crossOrigin: true,
        attribution: '&copy; OpenStreetMap contributors',
      }
    );

    const fallbackTileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        minZoom: 5,
        maxZoom: 19,
        noWrap: true,
        crossOrigin: true,
        attribution:
          '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    );

    let fallbackAdded = false;

    primaryTileLayer.on('tileerror', () => {
      if (!fallbackAdded && mapRef.current) {
        fallbackAdded = true;
        mapRef.current.removeLayer(primaryTileLayer);
        fallbackTileLayer.addTo(mapRef.current);
      }
    });

    primaryTileLayer.addTo(mapRef.current);

    mapRef.current.on('click', async (e) => {
      if (disabled) return;
      await reverseLookup(e.latlng.lat, e.latlng.lng);
    });

    if (hasCoordinates) {
      updateMarker(lat, lng, false);
    }

    const fitPhilippinesMap = () => {
      const map = mapRef.current;
      if (!map) return;

      map.invalidateSize({ pan: false });
      map.fitBounds(PHILIPPINES_MAP_BOUNDS, {
        paddingTopLeft: [24, 18],
        paddingBottomRight: [24, 18],
        animate: false,
        maxZoom: 6,
      });
    };

    const firstRenderTimer = window.setTimeout(fitPhilippinesMap, 150);
    const secondRenderTimer = window.setTimeout(fitPhilippinesMap, 600);
    const thirdRenderTimer = window.setTimeout(fitPhilippinesMap, 1200);

    return () => {
      window.clearTimeout(firstRenderTimer);
      window.clearTimeout(secondRenderTimer);
      window.clearTimeout(thirdRenderTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasCoordinates) {
      updateMarker(lat, lng, false);
    }
  }, [hasCoordinates, lat, lng, updateMarker]);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      searchLocation(query);
    }, 550);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, searchLocation]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          id="location"
          name="location"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            onChange({ address: nextValue, lat: latitude || '', lng: longitude || '' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchLocation(query);
            }
          }}
          aria-invalid={!!error}
          className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${error ? 'border-red-300' : 'border-gray-300'} ${disabled ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
          placeholder={placeholder || 'Search address or place name'}
          autoComplete="off"
        />

        {results.length > 0 && !disabled && (
          <div className="absolute left-0 right-0 top-full z-[1000] mt-2 max-h-64 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
            {results.map((item) => (
              <button
                key={`${item.place_id}-${item.lat}-${item.lon}`}
                type="button"
                onClick={() => handlePickResult(item)}
                className="flex w-full items-start gap-2 border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 last:border-b-0"
              >
                <span className="mt-0.5 text-[#2e66a6]">●</span>
                <span>{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div ref={mapElRef} className="h-[310px] w-full" />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        Search a Philippine location, choose a result, or click/drag the pin within the Philippines to set the exact work location.
      </div>

    </div>
  );
};

const getLocalISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysLocalISO = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return getLocalISODate(d);
};

const normalizeExperienceLevel = (level) => {
  const clean = String(level || '').trim();
  const normalized = clean.toLowerCase();

  if (normalized === 'no experience required') return 'No experience required';
  if (
    normalized === 'less than 1 yr' ||
    normalized === 'less than 1 year' ||
    normalized === 'less than 1 yr exp' ||
    normalized === 'less than 1 year exp'
  ) return 'Less than 1 Yr Exp';
  if (
    normalized === '1 year' ||
    normalized === '1 years' ||
    normalized === '2 year' ||
    normalized === '2 years' ||
    normalized === '3 year' ||
    normalized === '3 years' ||
    normalized === '1-3 years' ||
    normalized === '1-3 years exp'
  ) return '1-3 Years Exp';
  if (
    normalized === '4 year' ||
    normalized === '4 years' ||
    normalized === '5 year' ||
    normalized === '5 years' ||
    normalized === '4-5 years' ||
    normalized === '4-5 years exp'
  ) return '4-5 Years Exp';
  if (
    normalized === '6+ year' ||
    normalized === '6+ years' ||
    normalized === '6+ year exp' ||
    normalized === '6+ years exp'
  ) return '6+ Years Exp';

  return clean;
};

const normalizeCategory = (industry) => {
  const v = String(industry || '').trim();
  if (!v) return 'Others';
  if (v === 'Other') return 'Others';
  if (v === 'Others') return 'Others';
  return v;
};


const hasUsableCoordinates = (latValue, lngValue) => {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
};

const geocodeAddressIfNeeded = async ({ address, lat, lng }) => {
  const cleanAddress = String(address || '').trim();

  if (hasUsableCoordinates(lat, lng)) {
    return { address: cleanAddress, lat, lng };
  }

  if (!cleanAddress) {
    return { address: cleanAddress, lat: '', lng: '' };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&accept-language=en&q=${encodeURIComponent(cleanAddress)}`;
    const response = await fetch(url);
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const nextLat = Number(first?.lat);
    const nextLng = Number(first?.lon);

    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      return {
        address: first?.display_name || cleanAddress,
        lat: Number(nextLat.toFixed(6)),
        lng: Number(nextLng.toFixed(6)),
      };
    }
  } catch {
    // Keep typed address even if lookup fails.
  }

  return { address: cleanAddress, lat: '', lng: '' };
};


const JOB_FORM_STEPS = [
  {
    id: 1,
    title: 'Job Details',
 
  },
  {
    id: 2,
    title: 'Requirements & Qualifications',

  },
  {
    id: 3,
    title: 'Skills & Benefits',

  },
  {
    id: 4,
    title: 'Work Location',

  },
];

const JobFormProgress = ({ activeStep, onStepChange, canOpenStep }) => (
  <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-center gap-2">
      {JOB_FORM_STEPS.map((step, index) => {
        const completed = step.id < activeStep;
        const active = step.id === activeStep;
        const canOpen = canOpenStep(step.id);

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepChange(step.id)}
              disabled={!canOpen}
              className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-[#e8f2ff] text-[#075fc8]'
                  : completed
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : canOpen
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  : 'cursor-not-allowed text-gray-400 opacity-60',
              ].join(' ')}
              aria-current={active ? 'step' : undefined}
              title={
                canOpen
                  ? `Go to ${step.title}`
                  : 'Complete the required fields in the previous step first.'
              }
            >
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  completed
                    ? 'bg-emerald-600 text-white'
                    : active
                    ? 'bg-[#075fc8] text-white'
                    : canOpen
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {completed ? '✓' : step.id}
              </span>
              <span>{step.title}</span>
            </button>

            {index < JOB_FORM_STEPS.length - 1 && (
              <span className="text-gray-300" aria-hidden="true">›</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);


const sanitizeSalaryInput = (value = '') =>
  String(value || '').replace(/[^0-9]/g, '');

const formatSalaryInput = (value = '') => {
  const clean = sanitizeSalaryInput(value);
  if (!clean) return '';
  return Number(clean).toLocaleString('en-PH');
};

const formatApplicationDeadline = (value = '') => {
  if (!value) return '';

  const parts = String(value).split('-').map(Number);
  const date =
    parts.length >= 3 && parts.every(Number.isFinite)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
};

const getRelocationDisplayLabel = (value = '') => {
  const cleanValue = String(value || '').trim();
  const normalized = cleanValue.toLowerCase();

  if (normalized === 'yes - willing to relocate') return 'Willing to relocate';
  if (normalized === 'no - position is fixed location') return 'Location Fixed';
  if (normalized === 'open to relocation if necessary') return 'Possible to relocate';

  return cleanValue;
};

const hasCompleteCompanyLocation = (value = '') => {
  const parts = String(value || '')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 3;
};

const normalizeExternalUrl = (value = '') => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue || cleanValue.toLowerCase() === 'n/a') return '';
  return /^https?:\/\//i.test(cleanValue) ? cleanValue : `https://${cleanValue}`;
};

const PostJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [savingCancelDraft, setSavingCancelDraft] = useState(false);
  const [pendingLeavePath, setPendingLeavePath] = useState('/employer/manage-jobs');
  const allowNavigationRef = useRef(false);

  const getStoredUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [storedUser, setStoredUser] = useState(() => getStoredUser());

  const fetchCurrentEmployer = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://phinmaau-job-portal-atlas.onrender.com/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        params: { profileRefresh: Date.now() },
      });

      const user = response.data?.user;
      if (response.data?.success && user) {
        localStorage.setItem('user', JSON.stringify(user));
        setStoredUser(user);
      }
    } catch (err) {
      console.error('Unable to refresh employer profile:', err);
      setStoredUser(getStoredUser());
    }
  }, [getStoredUser]);

  useEffect(() => {
    fetchCurrentEmployer();

    const refreshOnFocus = () => fetchCurrentEmployer();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchCurrentEmployer();
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchCurrentEmployer]);

  const missingCompanyProfileFields = useMemo(() => {
    const p = storedUser?.employerProfile || {};
    const galleryImages = Array.isArray(p.galleryImages) ? p.galleryImages : [];
    const hasSavedGalleryPhoto = galleryImages.some((item) => {
      const url = String(typeof item === 'string' ? item : item?.url || '').trim();
      return Boolean(url) && !/^(blob:|data:)/i.test(url);
    });
    return [
      !String(p.companyName || '').trim() ? 'Company Name' : null,
      !String(p.businessEmail || '').trim() ? 'Business Email' : null,
      !String(p.mobileNumber || '').trim() ? 'Mobile Number' : null,
      !hasCompleteCompanyLocation(p.regionCity) ? 'Region, Province, and City / Municipality' : null,
      !String(p.industry || '').trim() ? 'Industry' : null,
      !String(p.companyAddress || '').trim() ? 'Complete Office Address' : null,
      !String(p.companyDescription || '').trim() ? 'About the Company' : null,
      !String(p.companyLogo || '').trim() ? 'Company Logo' : null,
      !String(p.coverPhoto || '').trim() ? 'Cover Photo' : null,
      !hasSavedGalleryPhoto ? 'Gallery' : null,
    ].filter(Boolean);
  }, [storedUser]);

  const isCompanyProfileComplete = missingCompanyProfileFields.length === 0;

  const companyLocationFromProfile =
    String(storedUser?.employerProfile?.companyAddress || '').trim() || 'Company location';

  const companyCategoryDefault = normalizeCategory(storedUser?.employerProfile?.industry);

  const companyWebsite = useMemo(() => {
    const profile = storedUser?.employerProfile || {};
    return String(
      profile.companyWebsiteUrl ||
        profile.companyWebsite ||
        profile.website ||
        profile.websiteUrl ||
        profile.companyUrl ||
        profile.companyURL ||
        ''
    ).trim();
  }, [storedUser]);

  const verificationStatus =
    storedUser?.employerProfile?.verificationDocs?.overallStatus || 'unverified';
  const isEmployerVerified = verificationStatus === 'verified' || storedUser?.isVerified === true;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    jobType: '',
    salaryMin: '',
    salaryMax: '',
    hideSalary: false,
    isUrgent: false,
    workMode: '',
    applicationDeadline: '',
    vacancies: '',
    skillsRequired: '',
    experienceLevel: '',
    location: '',
    locationProvince: '',
    locationCity: '',
    educationLevel: '',

    openToFreshGraduates: false,
    perksAndBenefits: [],
    otherBenefits: '',
    willingToRelocate: '',
    locationLatitude: '',
    locationLongitude: '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [customBenefitInput, setCustomBenefitInput] = useState('');

  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState('');

  const hasJobPostProgress = useMemo(() => {
    return Boolean(
      String(formData.title || '').trim() ||
      String(formData.location || '').trim() ||
      getRichTextPlainText(formData.description) ||
      getRichTextPlainText(formData.requirements) ||
      String(formData.salaryMin || '').trim() ||
      String(formData.salaryMax || '').trim() ||
      String(formData.applicationDeadline || '').trim() ||
      String(formData.skillsRequired || '').trim() ||
      String(formData.otherBenefits || '').trim() ||
      String(formData.locationLatitude || '').trim() ||
      String(formData.locationLongitude || '').trim() ||
      formData.hideSalary ||
      formData.isUrgent ||
      formData.openToFreshGraduates ||
      (Array.isArray(formData.perksAndBenefits) && formData.perksAndBenefits.length > 0) ||
      String(formData.jobType || '').trim() ||
      String(formData.workMode || '').trim() ||
      String(formData.vacancies || '').trim() ||
      String(formData.experienceLevel || '').trim() ||
      String(formData.educationLevel || '').trim() ||
      String(formData.willingToRelocate || '').trim() ||
      Boolean(locationImageFile)
    );
  }, [formData, locationImageFile]);

  const jobTypes = JOB_TYPES;
  const workModes = ['On-site', 'Remote', 'Blended', 'Work from Home'];
  const experienceLevels = EXPERIENCE_LEVELS;
  const educationLevels = EDUCATION_LEVELS;
  const willingToRelocateOptions = WILLING_TO_RELOCATE_OPTIONS;
  const perksAndBenefitsOptions = PERKS_AND_BENEFITS_OPTIONS;

  const minDeadlineISO = useMemo(() => getLocalISODate(new Date()), []);
  const maxDeadlineISO = useMemo(() => addMonthsLocalISO(new Date(), 6), []);

  const markTouched = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'openToFreshGraduates') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'experienceLevel') {
      setFormData(prev => ({ ...prev, [name]: normalizeExperienceLevel(value) }));
    } else if (name === 'vacancies') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 2) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    setError('');
    setSuccess('');
  };

  const addRequiredSkill = useCallback((rawSkill) => {
    const cleanSkill = String(rawSkill || '').trim().replace(/^,+|,+$/g, '');
    if (!cleanSkill) return;
    if (cleanSkill.length > 100) {
      markTouched('skillsRequired');
      return;
    }

    const currentSkills = (formData.skillsRequired || '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const isDuplicate = currentSkills.some(
      (skill) => skill.toLowerCase() === cleanSkill.toLowerCase()
    );

    if (isDuplicate) {
      setSkillInput('');
      return;
    }

    if (currentSkills.length >= 10) {
      markTouched('skillsRequired');
      return;
    }

    const nextSkills = [...currentSkills, cleanSkill];

    setFormData((prev) => ({
      ...prev,
      skillsRequired: nextSkills.join(', '),
    }));
    setSkillInput('');
    markTouched('skillsRequired');
    setError('');
    setSuccess('');
  }, [formData.skillsRequired, markTouched]);

  const customBenefits = useMemo(() => String(formData.otherBenefits || '')
    .split(',').map((benefit) => benefit.trim()).filter(Boolean), [formData.otherBenefits]);

  const previewBenefits = useMemo(() => {
    const benefits = [
      ...(Array.isArray(formData.perksAndBenefits) ? formData.perksAndBenefits : []),
      ...customBenefits,
    ];

    return benefits.filter((benefit, index, list) => (
      list.findIndex((item) => item.toLowerCase() === benefit.toLowerCase()) === index
    ));
  }, [formData.perksAndBenefits, customBenefits]);

  const addCustomBenefit = useCallback((rawBenefit) => {
    const benefit = normalizeSingleLine(rawBenefit).replace(/^,+|,+$/g, '');
    if (!benefit || benefit.length > 80) return;
    if (customBenefits.some((item) => item.toLowerCase() === benefit.toLowerCase())) {
      setCustomBenefitInput('');
      return;
    }
    setFormData((prev) => ({ ...prev, otherBenefits: [...customBenefits, benefit].join(', ') }));
    setCustomBenefitInput('');
  }, [customBenefits]);

  const removeCustomBenefit = useCallback((indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      otherBenefits: customBenefits.filter((_, index) => index !== indexToRemove).join(', '),
    }));
  }, [customBenefits]);

  const removeRequiredSkill = useCallback((skillIndex) => {
    const currentSkills = (formData.skillsRequired || '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const nextSkills = currentSkills.filter((_, index) => index !== skillIndex);

    setFormData((prev) => ({
      ...prev,
      skillsRequired: nextSkills.join(', '),
    }));
    markTouched('skillsRequired');
    setError('');
    setSuccess('');
  }, [formData.skillsRequired, markTouched]);

  const handleSkillInputChange = (event) => {
    const nextValue = event.target.value;

    if (nextValue.includes(',')) {
      const parts = nextValue.split(',');
      const completedSkills = parts.slice(0, -1);
      const remainingText = parts[parts.length - 1] || '';

      completedSkills.forEach((skill) => addRequiredSkill(skill));
      setSkillInput(remainingText);
      return;
    }

    setSkillInput(nextValue);
  };

  const handleSkillInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addRequiredSkill(skillInput);
      return;
    }

    if (event.key === 'Backspace' && !skillInput && skills.length > 0) {
      event.preventDefault();
      removeRequiredSkill(skills.length - 1);
    }
  };

  const handlePerkToggle = (perk) => {
    setFormData((prev) => {
      const exists = prev.perksAndBenefits.includes(perk);
      return {
        ...prev,
        perksAndBenefits: exists
          ? prev.perksAndBenefits.filter((item) => item !== perk)
          : [...prev.perksAndBenefits, perk],
      };
    });
    setError('');
    setSuccess('');
  };

  const handleLocationImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Location image must be JPG, JPEG, or PNG only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Location image must not exceed 5MB.');
      return;
    }

    setLocationImageFile(file);
    setLocationImagePreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  const salaryValid = useMemo(() => {
    if (formData.hideSalary) return true;
    if (formData.salaryMin === '' || formData.salaryMax === '') return false;
    const min = Number(formData.salaryMin);
    const max = Number(formData.salaryMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return false;
    return Number.isInteger(min) && Number.isInteger(max) && min > 0 && max > 0 && min <= MAX_SALARY && max <= MAX_SALARY && min <= max;
  }, [formData.hideSalary, formData.salaryMin, formData.salaryMax]);

  const isDeadlineValid = useMemo(() => {
    if (!formData.applicationDeadline) return false;
    return formData.applicationDeadline >= minDeadlineISO && formData.applicationDeadline <= maxDeadlineISO;
  }, [formData.applicationDeadline, minDeadlineISO, maxDeadlineISO]);

  const skillsAll = useMemo(() => {
    return (formData.skillsRequired || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }, [formData.skillsRequired]);

  const skills = useMemo(() => skillsAll.slice(0, 10), [skillsAll]);
  const skillsCountValid = useMemo(() => skillsAll.length <= 10, [skillsAll.length]);

  const salaryRangeText = useMemo(() => {
    const min = formData.salaryMin ? Number(formData.salaryMin).toLocaleString() : '';
    const max = formData.salaryMax ? Number(formData.salaryMax).toLocaleString() : '';
    if (!min && !max) return 'Salary not specified';
    if (min && !max) return `₱${min}`;
    if (!min && max) return `Up to ₱${max}`;
    return `₱${min} – ₱${max}`;
  }, [formData.salaryMin, formData.salaryMax]);

  const requiredOk = useMemo(() => {
    return (
      formData.title.trim() &&
      !getJobTitleError(formData.title) &&
      String(formData.jobType || '').trim() &&
      String(formData.workMode || '').trim() &&
      Number.isInteger(Number(formData.vacancies)) && Number(formData.vacancies) >= 1 && Number(formData.vacancies) <= 50 &&
      getRichTextPlainText(formData.description).length >= JOB_TEXT_MIN && getRichTextPlainText(formData.description).length <= JOB_TEXT_MAX &&
      getRichTextPlainText(formData.requirements).length >= JOB_TEXT_MIN && getRichTextPlainText(formData.requirements).length <= JOB_TEXT_MAX &&
      formData.location.trim() &&
      EXPERIENCE_LEVELS.includes(String(formData.experienceLevel || '').trim()) &&
      String(formData.educationLevel || '').trim() &&
      WILLING_TO_RELOCATE_OPTIONS.includes(String(formData.willingToRelocate || '').trim()) &&
      isDeadlineValid &&
      salaryValid &&
      skillsCountValid
    );
  }, [formData, isDeadlineValid, salaryValid, skillsCountValid]);

  const stepReady = useMemo(() => ({
    1: Boolean(
      formData.title.trim() &&
      !getJobTitleError(formData.title) &&
      String(formData.jobType || '').trim() &&
      String(formData.workMode || '').trim() &&
      Number.isInteger(Number(formData.vacancies)) && Number(formData.vacancies) >= 1 && Number(formData.vacancies) <= 50 &&
      isDeadlineValid &&
      salaryValid
    ),
    2: Boolean(
      getRichTextPlainText(formData.description).length >= JOB_TEXT_MIN && getRichTextPlainText(formData.description).length <= JOB_TEXT_MAX &&
      getRichTextPlainText(formData.requirements).length >= JOB_TEXT_MIN && getRichTextPlainText(formData.requirements).length <= JOB_TEXT_MAX &&
      EXPERIENCE_LEVELS.includes(String(formData.experienceLevel || '').trim()) &&
      String(formData.educationLevel || '').trim()
    ),
    3: Boolean(skillsCountValid),
    4: Boolean(
      formData.location.trim() &&
      WILLING_TO_RELOCATE_OPTIONS.includes(String(formData.willingToRelocate || '').trim())
    ),
  }), [formData, isDeadlineValid, salaryValid, skillsCountValid]);

  const currentStep = JOB_FORM_STEPS[activeStep - 1];

  const canOpenStep = useCallback(
    (targetStep) => {
      if (targetStep <= 1) return true;

      for (let step = 1; step < targetStep; step += 1) {
        if (!stepReady[step]) return false;
      }

      return true;
    },
    [stepReady]
  );

  const handleStepChange = useCallback(
    (targetStep) => {
      if (targetStep === activeStep) return;

      if (!canOpenStep(targetStep)) {
        const blockedStep = JOB_FORM_STEPS.find(
          (step) => step.id < targetStep && !stepReady[step.id]
        );

        setSubmitted(true);
        setActiveStep(blockedStep?.id || activeStep);
        setError(
          blockedStep
            ? `Please complete all required fields in ${blockedStep.title} before continuing.`
            : 'Please complete the required fields before continuing.'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setError('');
      setActiveStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeStep, canOpenStep, stepReady]
  );

  const goToNextStep = () => {
    handleStepChange(Math.min(JOB_FORM_STEPS.length, activeStep + 1));
  };

  const goToPreviousStep = () => {
    handleStepChange(Math.max(1, activeStep - 1));
  };

  useEffect(() => {
    if (activeStep !== 4) return;
    const timer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    return () => window.clearTimeout(timer);
  }, [activeStep]);

  const fieldErrors = useMemo(() => {
    const errors = {};

    if (touched.title || submitted) {
      errors.title = getJobTitleError(formData.title);
      if (!errors.title) delete errors.title;
    }

    const descriptionText = getRichTextPlainText(formData.description);
    const requirementsText = getRichTextPlainText(formData.requirements);

    if ((touched.description || submitted) && descriptionText.length > 0 && descriptionText.length < JOB_TEXT_MIN) {
      errors.description = `Job description must be at least ${JOB_TEXT_MIN.toLocaleString()} characters.`;
    } else if ((touched.description || submitted) && descriptionText.length > JOB_TEXT_MAX) {
      errors.description = `Job description must not exceed ${JOB_TEXT_MAX.toLocaleString()} characters.`;
    }
    if ((touched.description || submitted) && submitted && !descriptionText) {
      errors.description = 'Job description is required.';
    }

    if ((touched.requirements || submitted) && requirementsText.length > 0 && requirementsText.length < JOB_TEXT_MIN) {
      errors.requirements = `Qualifications must be at least ${JOB_TEXT_MIN.toLocaleString()} characters.`;
    } else if ((touched.requirements || submitted) && requirementsText.length > JOB_TEXT_MAX) {
      errors.requirements = `Qualifications must not exceed ${JOB_TEXT_MAX.toLocaleString()} characters.`;
    }
    if ((touched.requirements || submitted) && submitted && !requirementsText) {
      errors.requirements = 'Job requirements are required.';
    }

    if ((touched.location || submitted) && !formData.location.trim()) {
      errors.location = 'Complete work address is required.';
    }

    if ((touched.jobType || submitted) && !String(formData.jobType || '').trim()) {
      errors.jobType = 'Employment type is required.';
    }

    if ((touched.workMode || submitted) && !String(formData.workMode || '').trim()) {
      errors.workMode = 'Work mode is required.';
    }

    if ((touched.vacancies || submitted) && (!/^\d+$/.test(String(formData.vacancies)) || Number(formData.vacancies) < 1 || Number(formData.vacancies) > 50)) {
      errors.vacancies = 'Vacancies must be a whole number from 1 to 50.';
    }

    if ((touched.experienceLevel || submitted) && !EXPERIENCE_LEVELS.includes(String(formData.experienceLevel || '').trim())) {
      errors.experienceLevel = 'Please select a valid experience requirement.';
    }

    if ((touched.educationLevel || submitted) && !String(formData.educationLevel || '').trim()) {
      errors.educationLevel = 'Education level is required.';
    }

    if ((touched.willingToRelocate || submitted) && !WILLING_TO_RELOCATE_OPTIONS.includes(String(formData.willingToRelocate || '').trim())) {
      errors.willingToRelocate = 'Please choose a relocation option.';
    }

    if (
      !formData.hideSalary &&
      (touched.salaryMin || touched.salaryMax || submitted) &&
      (formData.salaryMin === '' || formData.salaryMax === '')
    ) {
      errors.salary = 'Minimum and maximum salary are required unless salary is hidden.';
    } else if (
      !formData.hideSalary &&
      (touched.salaryMin || touched.salaryMax || submitted) &&
      !salaryValid
    ) {
      errors.salary = 'Salary must be ₱1–₱999,999, and maximum salary must be at least the minimum.';
    }

    if ((touched.applicationDeadline || submitted) && submitted && !formData.applicationDeadline) {
      errors.applicationDeadline = 'Application deadline is required.';
    } else if ((touched.applicationDeadline || submitted) && formData.applicationDeadline && !isDeadlineValid) {
      errors.applicationDeadline = 'Application deadline must be from today up to exactly 6 months from today.';
    }

    if ((touched.skillsRequired || submitted) && !skillsCountValid) {
      errors.skillsRequired = `Please limit skills to 10. You entered ${skillsAll.length}.`;
    } else if ((touched.skillsRequired || submitted) && skillsAll.some((skill) => skill.length > 100)) {
      errors.skillsRequired = 'Each skill must not exceed 100 characters.';
    }

    if ((touched.locationImage || submitted) && locationImageFile) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(locationImageFile.type)) {
        errors.locationImage = 'Location image must be JPG, JPEG, or PNG only.';
      }
    }

    return errors;
  }, [formData, touched, submitted, salaryValid, isDeadlineValid, skillsCountValid, skillsAll.length, locationImageFile]);

  const validateForPublish = () => {
    const titleError = getJobTitleError(formData.title);
    if (titleError) return titleError;
    if (!String(formData.jobType || '').trim()) return 'Employment type is required';
    if (!String(formData.workMode || '').trim()) return 'Work mode is required';
    if (!/^\d+$/.test(String(formData.vacancies)) || Number(formData.vacancies) < 1 || Number(formData.vacancies) > 50) return 'Vacancies must be a whole number from 1 to 50';
    const descriptionText = getRichTextPlainText(formData.description);
    const requirementsText = getRichTextPlainText(formData.requirements);
    if (!descriptionText) return 'Job description is required';
    if (descriptionText.length < JOB_TEXT_MIN || descriptionText.length > JOB_TEXT_MAX) return 'Job description must contain 1,000 to 2,000 characters';
    if (!requirementsText) return 'Job requirements are required';
    if (requirementsText.length < JOB_TEXT_MIN || requirementsText.length > JOB_TEXT_MAX) return 'Qualifications must contain 1,000 to 2,000 characters';
    if (!formData.location.trim()) return 'Complete work address is required';
    if (!formData.applicationDeadline) return 'Application deadline is required';
    if (!isDeadlineValid) return 'Application deadline must be from today through 6 months from today';
    if (!formData.hideSalary && (formData.salaryMin === '' || formData.salaryMax === '')) {
      return 'Minimum and maximum salary are required unless salary is hidden';
    }
    if (!formData.hideSalary && !salaryValid) {
      return 'Salary must be ₱1–₱999,999, and maximum must be at least the minimum';
    }
    if (!skillsCountValid) return 'Skills must be 10 or fewer';
    if (skillsAll.some((skill) => skill.length > 100)) return 'Each skill must not exceed 100 characters';
    if (customBenefits.some((benefit) => benefit.length > 80)) return 'Each custom benefit must not exceed 80 characters';

    const exp = normalizeExperienceLevel(formData.experienceLevel);
    if (!EXPERIENCE_LEVELS.includes(exp)) return 'Invalid experience level';

    const edu = String(formData.educationLevel || '').trim();
    if (!edu) return 'Education level is required';
    if (!EDUCATION_LEVELS.includes(edu)) return 'Invalid education level';

    const relocate = String(formData.willingToRelocate || '').trim();
    if (!relocate) return 'Willing to relocate option is required';
    if (!WILLING_TO_RELOCATE_OPTIONS.includes(relocate)) return 'Invalid relocate option';

    if (locationImageFile) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(locationImageFile.type)) return 'Location image must be JPG, JPEG, or PNG only';
    }

    const employerIndustry = normalizeCategory(storedUser?.employerProfile?.industry);
    if (!employerIndustry) return 'Please set your company industry first.';

    return '';
  };

  const postJob = async ({ isDraft }) => {
    const token = localStorage.getItem('token');

    const normalizedSkillsString = skills.join(', ');
    const normalizedExperienceLevel = normalizeExperienceLevel(formData.experienceLevel);

    const payload = new FormData();
    payload.append('title', normalizeSingleLine(formData.title));
    payload.append('description', formData.description);
    payload.append('requirements', formData.requirements);
    payload.append('jobType', formData.jobType);
    payload.append('salaryMin', formData.salaryMin);
    payload.append('salaryMax', formData.salaryMax);
    payload.append('hideSalary', String(Boolean(formData.hideSalary)));
    payload.append('isUrgent', String(Boolean(formData.isUrgent)));
    payload.append('workMode', formData.workMode);
    payload.append('applicationDeadline', formData.applicationDeadline);
    payload.append('vacancies', formData.vacancies);
    payload.append('skillsRequired', normalizedSkillsString);
    payload.append('experienceLevel', normalizedExperienceLevel);
    payload.append('status', isDraft ? 'draft' : 'published');
    payload.append('category', companyCategoryDefault);
    payload.append('location', String(formData.location || '').trim());
    payload.append('locationProvince', '');
    payload.append('locationCity', '');
    payload.append('educationLevel', String(formData.educationLevel || '').trim());

    payload.append('openToFreshGraduates', String(formData.openToFreshGraduates));
    payload.append('otherBenefits', String(formData.otherBenefits || '').trim());
    payload.append('willingToRelocate', String(formData.willingToRelocate || '').trim());
    payload.append('perksAndBenefits', JSON.stringify(formData.perksAndBenefits || []));

    payload.append('locationLatitude', String(formData.locationLatitude || ''));
    payload.append('locationLongitude', String(formData.locationLongitude || ''));

    if (locationImageFile) {
      payload.append('locationImage', locationImageFile);
    }

    return axios.post('https://phinmaau-job-portal-atlas.onrender.com/api/jobs', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  const requestLeaveJobPosting = useCallback(
    (destination = '/employer/manage-jobs') => {
      if (!hasJobPostProgress || allowNavigationRef.current) {
        allowNavigationRef.current = true;
        navigate(destination);
        return;
      }

      setPendingLeavePath(destination);
      setShowCancelModal(true);
    },
    [hasJobPostProgress, navigate]
  );

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!hasJobPostProgress || allowNavigationRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${destination.pathname}${destination.search}${destination.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingLeavePath(nextPath);
      setShowCancelModal(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [hasJobPostProgress]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasJobPostProgress || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasJobPostProgress]);

  useEffect(() => {
    if (!hasJobPostProgress) return undefined;

    window.history.pushState({ agapayJobPostGuard: true }, '', window.location.href);

    const handlePopState = () => {
      if (allowNavigationRef.current) return;

      window.history.pushState({ agapayJobPostGuard: true }, '', window.location.href);
      setPendingLeavePath('__browser_back__');
      setShowCancelModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasJobPostProgress]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    setSuccess('');

    try {
      const response = await postJob({ isDraft: true });
      const savedJob = response?.data?.job;
      const savedJobId = savedJob?._id || savedJob?.id || '';

      setSuccess('Draft saved successfully.');
      allowNavigationRef.current = true;

      navigate('/employer/manage-jobs', {
        replace: true,
        state: {
          jobDraftSaved: true,
          successType: 'post-draft',
          savedJobId,
          savedJobTitle: savedJob?.title || formData.title || 'Untitled Draft',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCancelAndSaveDraft = async () => {
    setSavingCancelDraft(true);
    setError('');
    setSuccess('');

    try {
      const response = await postJob({ isDraft: true });
      const savedJob = response?.data?.job;
      const savedJobId = savedJob?._id || savedJob?.id || '';
      setShowCancelModal(false);
      allowNavigationRef.current = true;

      if (pendingLeavePath === '__browser_back__') {
        window.history.go(-2);
      } else {
        const destination = pendingLeavePath || '/employer/manage-jobs';
        navigate(destination, {
          state: destination === '/employer/manage-jobs'
            ? {
                jobDraftSaved: true,
                successType: 'post-draft',
                savedJobId,
                savedJobTitle: savedJob?.title || formData.title || 'Untitled Draft',
              }
            : undefined,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the job as draft. Please try again.');
      setShowCancelModal(false);
    } finally {
      setSavingCancelDraft(false);
    }
  };

  const handleOpenPreview = () => {
    setSubmitted(true);
    setError('');
    setSuccess('');

    if (!isCompanyProfileComplete) {
      setError('You have not yet completed your company profile. A complete company profile is required to post a job.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isEmployerVerified) {
      setError('Your company is not verified yet. You can save drafts, but you can’t publish until verified.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const msg = validateForPublish();
    if (msg) {
      setError('Please fix the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPrivacyAccepted(false);
    setShowPreviewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setLoading(true);
    setError('');
    setSuccess('');

    if (!isCompanyProfileComplete) {
      setError('You have not yet completed your company profile. A complete company profile is required to post a job.');
      setLoading(false);
      return;
    }

    if (!isEmployerVerified) {
      setError('Your company is not verified yet. You can save drafts, but you can’t publish until verified.');
      setLoading(false);
      return;
    }

    const msg = validateForPublish();
    if (msg) {
      setError('Please fix the highlighted fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await postJob({ isDraft: false });
      if (response.data?.success) {
        const publishedJob = response.data?.job;
        const publishedJobId = publishedJob?._id || publishedJob?.id || '';

        setShowPrivacyModal(false);
        setShowPreviewModal(false);
        setSuccess('Job posted successfully!');
        await new Promise((resolve) => setTimeout(resolve, 1200));
        allowNavigationRef.current = true;
        navigate('/employer/manage-jobs', {
          replace: true,
          state: {
            jobPostSuccess: true,
            successType: 'post',
            highlightedJobId: publishedJobId,
          },
        });
      } else {
        setError(response.data?.message || 'Failed to post job');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/employer/login'), 1200);
      } else if (err.response?.status === 403) {
        if (err.response?.data?.code === 'COMPANY_PROFILE_INCOMPLETE') {
          setError(err.response?.data?.message || 'You have not yet completed your company profile.');
        } else if (err.response?.data?.code === 'EMPLOYER_NOT_VERIFIED') {
          setError(err.response?.data?.message || 'Your company is not verified yet.');
        } else {
          setError('Only employers can post jobs.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to post job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const descLen = getRichTextPlainText(formData.description).length;
  const reqLen = getRichTextPlainText(formData.requirements).length;

  const showDescCounterRed = (touched.description || submitted) && descLen > 0 && descLen < 80;
  const showReqCounterRed = (touched.requirements || submitted) && reqLen > 0 && reqLen < 40;

  return (
    <EmployerLayout>
      <div className="min-h-screen bg-gray-50 -mt-2">
        <div className="mx-auto max-w-7xl px-1 py-8">
          <div
            className={`mb-4 grid grid-cols-1 gap-4 ${
              !isCompanyProfileComplete
                ? 'lg:grid-cols-[minmax(260px,0.8fr)_minmax(480px,1.2fr)] lg:items-center'
                : ''
            }`}
          >
            <div className="min-w-0">
              <h1 className="text-[33px] leading-[40px] font-semibold text-gray-900">Post a Job</h1>
              <p className="text-gray-600">Create a job post that attracts the right candidates.</p>

              {isCompanyProfileComplete && !isEmployerVerified && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Verification required to publish
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Status: <span className="font-bold">{verificationStatus}</span>. You can save drafts anytime, but publishing is disabled until verified.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/employer/company-profile')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Go to Company Profile
                  </button>
                </div>
              )}
            </div>

            {!isCompanyProfileComplete && (
              <div className="w-full overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-blue-900">
                      Ready to Post a Job?
                    </p>
                    <p className="mt-1 text-sm leading-5 text-blue-800">
                      Complete your company profile and submit all required information to start posting jobs.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/employer/company-profile', { state: { openEdit: true } })}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#075fc8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064da3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      Go to Company Profile
                    </button>
                  </div>

                  <div className="hidden h-24 w-28 shrink-0 items-end justify-center sm:flex" aria-hidden="true">
                    <svg viewBox="0 0 140 110" className="h-full w-full" fill="none">
                      <path d="M17 97h106" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
                      <path d="M37 97V39h51v58" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M88 97V57h25v40" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M31 39h63L63 18 31 39Z" fill="#93C5FD" stroke="#60A5FA" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M56 97V75h15v22" fill="white" stroke="#60A5FA" strokeWidth="3" />
                      <path d="M47 50h9v9h-9zM69 50h9v9h-9zM47 64h9v9h-9zM69 64h9v9h-9zM96 68h9v9h-9zM96 82h9v9h-9z" fill="white" stroke="#93C5FD" strokeWidth="2" />
                      <circle cx="113" cy="30" r="8" fill="#DBEAFE" />
                      <path d="M107 19l6-7 6 7" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <div
            aria-disabled={!isCompanyProfileComplete}
            inert={!isCompanyProfileComplete ? '' : undefined}
            className={!isCompanyProfileComplete ? 'pointer-events-none select-none opacity-60' : ''}
          >
            <JobFormProgress activeStep={activeStep} onStepChange={handleStepChange} canOpenStep={canOpenStep} />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#075fc8]">
                        {currentStep.eyebrow}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-gray-900">{currentStep.title}</h2>
                      <p className="text-sm text-gray-500">{currentStep.description}</p>
                    </div>
                    <span className="w-fit rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-semibold text-[#075fc8]">
                      Step {activeStep} of {JOB_FORM_STEPS.length}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="mx-auto w-full max-w-5xl space-y-10">
                    <section className={`${activeStep === 1 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Basics</h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Field
                            id="title"
                            label="Job Title "
                            error={fieldErrors.title}
                          >
                            <input
                              id="title"
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              onBlur={() => markTouched('title')}
                              aria-invalid={!!fieldErrors.title}
                              className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.title ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="e.g., Junior Web Developer"
                              maxLength={100}
                              required
                            />
                          </Field>
                          <label className="mt-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.isUrgent)}
                              onChange={(e) => setFormData((prev) => ({ ...prev, isUrgent: e.target.checked }))}
                              className="mt-1 h-4 w-4 accent-orange-500"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-gray-900">Urgently Needed</span>
                              <span className="block text-xs leading-5 text-gray-500">
                               Let job seekers know you're looking to fill this role immediately.
                              </span>
                            </span>
                          </label>

                        </div>

                        <Field id="jobType" label="Employment Type" error={fieldErrors.jobType}>
                          <select
                            id="jobType"
                            name="jobType"
                            value={formData.jobType}
                            onChange={handleChange}
                            onBlur={() => markTouched('jobType')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${fieldErrors.jobType ? 'border-red-300' : 'border-gray-300'}`}
                          >
                            <option value="" disabled>Choose employment type</option>
                            {jobTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="workMode" label="Work Mode" error={fieldErrors.workMode}>
                          <select
                            id="workMode"
                            name="workMode"
                            value={formData.workMode}
                            onChange={handleChange}
                            onBlur={() => markTouched('workMode')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${fieldErrors.workMode ? 'border-red-300' : 'border-gray-300'}`}
                          >
                            <option value="" disabled>Choose work mode</option>
                            {workModes.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </Field>

                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field id="vacancies" label="Vacancies" error={fieldErrors.vacancies}>
                              <input
                                id="vacancies"
                                type="number"
                                name="vacancies"
                                value={formData.vacancies}
                                onChange={handleChange}
                                onKeyDown={(event) => {
                                  if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault();
                                }}
                                onPaste={(event) => {
                                  const pasted = event.clipboardData.getData('text');
                                  if (!/^\d+$/.test(pasted)) event.preventDefault();
                                }}
                                onBlur={() => markTouched('vacancies')}
                                min="1"
                                max="50"
                                step="1"
                                placeholder="Enter number of vacancies"
                                className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${fieldErrors.vacancies ? 'border-red-300' : 'border-gray-300'}`}
                                required
                              />
                            </Field>

                            <Field
                              id="applicationDeadline"
                              label="Application Deadline"
                            
                              error={fieldErrors.applicationDeadline}
                            >
                              <input
                                id="applicationDeadline"
                                type="date"
                                name="applicationDeadline"
                                value={formData.applicationDeadline}
                                onChange={handleChange}
                                onBlur={() => markTouched('applicationDeadline')}
                                min={minDeadlineISO}
                                max={maxDeadlineISO}
                                placeholder="Select application deadline"
                                aria-invalid={!!fieldErrors.applicationDeadline}
                                className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                  fieldErrors.applicationDeadline ? 'border-red-300' : 'border-gray-300'
                                }`}
                                required
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 1 ? 'block' : 'hidden'} space-y-5`}>
                      <div className="flex items-end justify-between">
                        <h3 className="text-base font-bold text-gray-900">
                          Salary Range
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="salaryMin" label="Minimum Salary" required>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              id="salaryMin"
                              type="text"
                              inputMode="numeric"
                              name="salaryMin"
                              value={formatSalaryInput(formData.salaryMin)}
                              onChange={(event) => setFormData((prev) => ({
                                ...prev,
                                salaryMin: sanitizeSalaryInput(event.target.value).slice(0, 6),
                              }))}
                              onBlur={() => markTouched('salaryMin')}
                              className={`w-full rounded-xl border px-4 py-3 pl-8 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.salary ? 'border-red-300' : 'border-gray-300'
                              } ${formData.hideSalary ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                              placeholder={formData.hideSalary ? 'Salary hidden' : 'Min'}
                              disabled={formData.hideSalary}
                              required={!formData.hideSalary}
                              maxLength={7}
                            />
                          </div>
                        </Field>

                        <Field id="salaryMax" label="Maximum Salary" required>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              id="salaryMax"
                              type="text"
                              inputMode="numeric"
                              name="salaryMax"
                              value={formatSalaryInput(formData.salaryMax)}
                              onChange={(event) => setFormData((prev) => ({
                                ...prev,
                                salaryMax: sanitizeSalaryInput(event.target.value).slice(0, 6),
                              }))}
                              onBlur={() => markTouched('salaryMax')}
                              className={`w-full rounded-xl border px-4 py-3 pl-8 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                                fieldErrors.salary ? 'border-red-300' : 'border-gray-300'
                              } ${formData.hideSalary ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                              placeholder={formData.hideSalary ? 'Salary hidden' : 'Max'}
                              disabled={formData.hideSalary}
                              required={!formData.hideSalary}
                              maxLength={7}
                            />
                          </div>
                        </Field>
                      </div>

                      {fieldErrors.salary && (
                        <p className="text-sm font-medium text-red-600">{fieldErrors.salary}</p>
                      )}
                    </section>

                    
                    <div className={activeStep === 1 ? 'block' : 'hidden'}>
                      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.hideSalary)}
                          onChange={(e) => setFormData((prev) => ({ ...prev, hideSalary: e.target.checked }))}
                          className="mt-1 h-4 w-4 accent-[#2e66a6]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">Hide salary from jobseekers</span>
                          <span className="block text-xs leading-5 text-gray-500">
                           Choose not to display the salary range on your job posting. Applicants will see "Salary not specified" instead.
                          </span>
                        </span>
                      </label>
                    </div>


                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 2 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Applicant Requirements</h3>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Open to Fresh Graduates</p>
                            <p className="text-xs text-gray-500">
                              Candidates will be evaluated based on their Profile regardless of high credential requirements.
                            </p>
                          </div>

                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              name="openToFreshGraduates"
                              checked={formData.openToFreshGraduates}
                              onChange={handleChange}
                              onBlur={() => markTouched('openToFreshGraduates')}
                              className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-[#2e66a6] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"></div>
                          </label>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="experienceLevel" label="Experience Required" error={fieldErrors.experienceLevel}>
                          <select
                            id="experienceLevel"
                            name="experienceLevel"
                            value={formData.experienceLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('experienceLevel')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${
                              fieldErrors.experienceLevel ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="" disabled>Choose required experience</option>
                            {experienceLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </Field>

                        <Field id="educationLevel" label="Educational Requirement" error={fieldErrors.educationLevel}>
                          <select
                            id="educationLevel"
                            name="educationLevel"
                            value={formData.educationLevel}
                            onChange={handleChange}
                            onBlur={() => markTouched('educationLevel')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${fieldErrors.educationLevel ? 'border-red-300' : 'border-gray-300'}`}
                          >
                            <option value="" disabled>Choose educational requirement</option>
                            {educationLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </section>

                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 2 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Job Details</h3>

                      <Field
                        id="description"
                        label="Job Description"
                        error={fieldErrors.description}
                      >
                        <div>
                          <RichTextEditor
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            onBlur={() => markTouched('description')}
                            rows={7}
                            error={Boolean(fieldErrors.description)}
                            placeholder="Describe the role, responsibilities, and what a typical day looks like..."
                          />
                          <div className="flex justify-end text-xs text-gray-500">
                            {getRichTextPlainText(formData.description).length.toLocaleString()} / {JOB_TEXT_MAX.toLocaleString()}
                          </div>
                        </div>
                      </Field>

                      <Field
                        id="requirements"
                        label="Qualifications"
                        error={fieldErrors.requirements}
                      >
                        <div>
                          <RichTextEditor
                            id="requirements"
                            name="requirements"
                            value={formData.requirements}
                            onChange={handleChange}
                            onBlur={() => markTouched('requirements')}
                            rows={6}
                            error={Boolean(fieldErrors.requirements)}
                            placeholder="List the qualifications, certifications or requirements..."
                          />
                          <div className="flex justify-end text-xs text-gray-500">
                            {getRichTextPlainText(formData.requirements).length.toLocaleString()} / {JOB_TEXT_MAX.toLocaleString()}
                          </div>
                        </div>
                      </Field>
                    </section>

                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 3 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Required Skills (Optional)</h3>

                      <Field
                        id="skillsRequired"
                       
                        error={fieldErrors.skillsRequired}
                      >
                        <div
                          className={`flex min-h-[50px] items-center rounded-xl border bg-white transition focus-within:ring-2 ${
                            fieldErrors.skillsRequired
                              ? 'border-red-300 focus-within:border-red-600 focus-within:ring-red-600'
                              : 'border-gray-300 focus-within:border-[#2e66a6] focus-within:ring-[#2e66a6]'
                          }`}
                        >
                          <input
                            id="skillsRequired"
                            value={skillInput}
                            onChange={handleSkillInputChange}
                            onKeyDown={handleSkillInputKeyDown}
                            onBlur={() => markTouched('skillsRequired')}
                            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-gray-900 outline-none disabled:cursor-not-allowed"
                            placeholder={skills.length >= 10 ? 'Maximum of 10 skills reached' : 'Type a skill'}
                            disabled={skills.length >= 10}
                            autoComplete="off"
                            maxLength={100}
                          />

                          <button
                            type="button"
                            onClick={() => addRequiredSkill(skillInput)}
                            disabled={!skillInput.trim() || skills.length >= 10}
                            className="mr-2 h-9 shrink-0 rounded-lg bg-[#2e66a6] px-4 text-sm font-semibold text-white transition hover:bg-[#24558d] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Add
                          </button>
                        </div>
                      </Field>

                    

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <span
                              key={`${skill}-${index}`}
                              className="group inline-flex min-w-0 max-w-full items-start gap-1 rounded-xl border border-[#cdddf0] bg-[#eef5fc] py-1 pl-3 pr-1 text-xs font-semibold text-[#24558d]"
                            >
                              <span className="min-w-0 flex-1 whitespace-normal break-all">{skill}</span>
                              <button
                                type="button"
                                onClick={() => removeRequiredSkill(index)}
                                aria-label={`Remove ${skill}`}
                                title={`Remove ${skill}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-[#24558d] opacity-100 transition hover:bg-[#d9e9f8] hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 3 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Perks and Benefits (Optional)</h3>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {perksAndBenefitsOptions.map((perk) => {
                          const active = formData.perksAndBenefits.includes(perk);
                          return (
                            <button
                              key={perk}
                              type="button"
                              onClick={() => handlePerkToggle(perk)}
                              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                                active
                                  ? 'border-[#2e66a6] bg-blue-50 text-[#2e66a6] font-semibold'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {perk}
                            </button>
                          );
                        })}
                      </div>

                      <Field
                        id="otherBenefits"
                        label="More Perks & Benefits (Optional)"
                      >
                        <div className="flex min-h-[50px] items-center rounded-xl border border-gray-300 bg-white focus-within:border-[#2e66a6] focus-within:ring-2 focus-within:ring-[#2e66a6]">
                          <input
                            id="otherBenefits"
                            value={customBenefitInput}
                            onChange={(event) => setCustomBenefitInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') { event.preventDefault(); addCustomBenefit(customBenefitInput); }
                            }}
                            maxLength={80}
                            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-gray-900 outline-none"
                            placeholder="e.g., Paid Bereavement Leave"
                          />
                          <button type="button" onClick={() => addCustomBenefit(customBenefitInput)} disabled={!customBenefitInput.trim()} className="mr-2 h-9 rounded-lg bg-[#2e66a6] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Add</button>
                        </div>
                      </Field>
                      {customBenefits.length > 0 && <div className="flex flex-wrap gap-2">{customBenefits.map((benefit, index) => (
                        <span key={`${benefit}-${index}`} className="inline-flex items-center gap-2 rounded-xl border border-[#cdddf0] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#24558d]">{benefit}<button type="button" onClick={() => removeCustomBenefit(index)} aria-label={`Remove ${benefit}`} className="text-base hover:text-red-600">×</button></span>
                      ))}</div>}
                    </section>

                    <div className="hidden border-t border-gray-100" />

                    <section className={`${activeStep === 4 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Additional Details</h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field id="willingToRelocate" label="Willing to Relocate" error={fieldErrors.willingToRelocate}>
                          <select
                            id="willingToRelocate"
                            name="willingToRelocate"
                            value={formData.willingToRelocate}
                            onChange={handleChange}
                            onBlur={() => markTouched('willingToRelocate')}
                            className={`w-full rounded-xl border px-4 py-3 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:border-[#2e66a6] ${fieldErrors.willingToRelocate ? 'border-red-300' : 'border-gray-300'}`}
                          >
                            <option value="" disabled>Choose an option</option>
                            {willingToRelocateOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </Field>

                        <div className="hidden md:block" />
                      </div>

                      <div className="w-fit max-w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Let applicants know if there's a possibility of relocation for this position. This helps candidates plan ahead.
                      </div>
                    </section>

                    <div className="hidden border-t border-gray-100" />
                    <section className={`${activeStep === 4 ? 'block' : 'hidden'} space-y-5`}>
                      <h3 className="text-base font-bold text-gray-900">Additional Details</h3>

                      <div className="grid grid-cols-1 gap-5">
                        <div>
                        <Field
                          id="location"
                          label="Complete Work Office Address"
                         
                          error={fieldErrors.location}
                        >
                          <LocationMapPicker
                            value={formData.location}
                            latitude={formData.locationLatitude}
                            longitude={formData.locationLongitude}
                            error={fieldErrors.location}
                            placeholder="e.g., Unit 201, ABC Building, 123 Rizal St., Brgy. San Roque, Cabanatuan City, Nueva Ecija."
                            onChange={({ address, lat, lng }) => {
                              setFormData((prev) => ({
                                ...prev,
                                location: address,
                                locationLatitude: lat,
                                locationLongitude: lng,
                              }));
                              markTouched('location');
                              setError('');
                              setSuccess('');
                            }}
                          />
                        </Field>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <div className="border-t border-gray-200 bg-white px-6 py-4">
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => requestLeaveJobPosting('/employer/manage-jobs')}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                  >
                    {savingDraft ? 'Saving…' : 'Save Draft'}
                  </button>

                  {activeStep > 1 && (
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                    >
                      Back
                    </button>
                  )}

                  {activeStep < JOB_FORM_STEPS.length ? (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      disabled={!stepReady[activeStep]}
                      className="rounded-xl bg-[#2e66a6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#23508a] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={loading || !requiredOk || !isCompanyProfileComplete || !isEmployerVerified}
                      title={!isCompanyProfileComplete ? 'Complete your company profile to continue.' : !isEmployerVerified ? 'Verify your company to continue.' : ''}
                      className="rounded-xl bg-[#2e66a6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#23508a] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6]"
                    >
                      {!isCompanyProfileComplete ? 'Complete Profile' : isEmployerVerified ? 'Continue →' : 'Verify to continue'}
                    </button>
                  )}
                </div>
                  </div>
              </div>
            </div>
        </div>
            </form>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-preview-title"
            className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e6edf5] bg-white px-6 py-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e66a6]">Almost There!</h2>
                <h3 id="job-preview-title" className="mt-1 text-xl font-bold text-gray-900">
                  Double-check your job posting before publishing.
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto bg-white p-5 sm:p-6">
              <div className="mx-auto w-full max-w-6xl space-y-5">
                <section className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-7">
                  <div className="flex min-w-0 flex-col gap-5">
                    <img
                      src={storedUser?.employerProfile?.coverPhoto || storedUser?.employerProfile?.companyCoverPhoto || '/images/jobback.png'}
                      alt="Company cover"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/jobback.png'; }}
                      className="h-36 w-full rounded-xl bg-slate-100 object-cover sm:h-52"
                    />
                    <div className="flex min-w-0 items-start gap-4">
                      {storedUser?.employerProfile?.companyLogo ? (
                        <img
                          src={storedUser.employerProfile.companyLogo}
                          alt="Company logo"
                          className="h-16 w-16 flex-shrink-0 rounded-2xl border border-slate-200 bg-white object-cover sm:h-20 sm:w-20"
                        />
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-600 sm:h-20 sm:w-20">
                          {(storedUser?.employerProfile?.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-3xl font-extrabold leading-tight tracking-tight text-black sm:text-4xl">
                          {formData.title || 'Untitled Job'}
                        </h3>

                        <div className="mt-2 flex items-center gap-2 text-sm text-black/70">
                          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.6}
                              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3.75h1.5m-1.5 3.75h1.5m3-7.5H15m-1.5 3.75H15m-1.5 3.75H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                            />
                          </svg>
                          <span className="truncate">{String(storedUser?.employerProfile?.companyName || '').trim() || 'Company not specified'}</span>
                        </div>

                        <div className="mt-2 flex items-start gap-2 text-sm uppercase tracking-wide text-black/60">
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                          <span className="break-words">{formData.location || companyLocationFromProfile}</span>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {[
                            { value: formData.jobType, icon: 'briefcase' },
                            { value: formData.workMode, icon: 'laptop' },
                            {
                              value: formData.vacancies
                                ? `${formData.vacancies} ${Number(formData.vacancies) === 1 ? 'Vacancy' : 'Vacancies'}`
                                : '',
                              icon: 'users',
                            },
                            { value: getRelocationDisplayLabel(formData.willingToRelocate), icon: 'location' },
                          ]
                            .filter((item) => item.value)
                            .map((item) => (
                              <span
                                key={`${item.icon}-${item.value}`}
                                className="inline-flex items-center gap-2 rounded-full border border-[#d8e2ee] bg-[#f7faff] px-3 py-1.5 text-xs font-semibold text-black/80"
                              >
                                {item.icon === 'briefcase' && (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zM3 13h18" />
                                  </svg>
                                )}
                                {item.icon === 'laptop' && (
                                  <JobDetailsSvgIcon name="laptop" className="h-4 w-4" />
                                )}
                                {item.icon === 'users' && (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1m7-4a4 4 0 10-8 0 4 4 0 008 0zm8 2a3 3 0 10-6 0 3 3 0 006 0z" />
                                  </svg>
                                )}
                                {item.icon === 'location' && (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
                                  </svg>
                                )}
                                {item.value}
                              </span>
                            ))}
                        </div>

                        <div className="mt-5 flex items-center gap-2 text-sm text-black/70">
                          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Ready to publish{formData.applicationDeadline ? ` and deadline of application is on ${formatApplicationDeadline(formData.applicationDeadline)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      title: 'Salary',
                      value: formData.hideSalary ? 'Salary not specified' : salaryRangeText.replace(/₱/g, '').trim(),
                      icon: '₱',
                    },
                    {
                      title: 'Experience',
                      value: normalizeExperienceLevel(formData.experienceLevel) || 'Experience not specified',
                      icon: 'clock',
                    },
                    {
                      title: 'Educational Requirement',
                      value: formData.educationLevel || 'Educational requirement not specified',
                      icon: 'graduation',
                    },
                    {
                      title: 'Website / Company URL',
                      value: companyWebsite || 'N/A',
                      icon: 'globe',
                    },
                  ].map((metric) => (
                    <div
                      key={metric.title}
                      className="min-h-[102px] rounded-xl border border-[#d9e2ec] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex h-full min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#d9dbe3] bg-[#f9fafb] text-[#6b7280]">
                          {metric.icon === '₱' ? (
                            <span className="text-sm font-bold">₱</span>
                          ) : metric.icon === 'clock' ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : metric.icon === 'graduation' ? (
                            <JobDetailsSvgIcon name="graduation" className="h-5 w-5" />
                          ) : (
                            <JobDetailsSvgIcon name="globe" className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-black">{metric.title}</p>
                          {metric.title === 'Website / Company URL' && companyWebsite ? (
                            <a
                              href={normalizeExternalUrl(companyWebsite)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block truncate text-sm text-[#2e66a6] hover:underline"
                              title={companyWebsite}
                            >
                              {companyWebsite}
                            </a>
                          ) : (
                            <p className="mt-1 truncate text-sm text-black/80" title={metric.value}>
                              {metric.value}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3 pt-2">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#2e66a6]/25 bg-[#2e66a6]/10 text-[#2e66a6]">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      <h3 className="text-base font-bold text-black">Job Description</h3>
                    </div>
                    <div
                      className="mt-4 break-words text-sm leading-relaxed text-black/70 sm:text-base [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: normalizeRichTextValue(formData.description) || 'No description provided.' }}
                    />
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3 pt-2">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#2e66a6]/25 bg-[#2e66a6]/10 text-[#2e66a6]">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.7 6.3a4 4 0 01-5.657 5.657l-5.04 5.04a2 2 0 102.829 2.828l5.04-5.04A4 4 0 0114.7 6.3zM19 7l-3 3" />
                        </svg>
                      </span>
                      <h3 className="text-base font-bold text-black">Qualification</h3>
                    </div>
                    <div
                      className="mt-4 break-words text-sm leading-relaxed text-black/70 sm:text-base [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: normalizeRichTextValue(formData.requirements) || 'No requirements provided.' }}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-[#e6edf5] bg-[#f8fafc] px-5 py-3.5 sm:px-6">
                      <p className="text-sm font-semibold text-black">Required Skills</p>
                    </div>
                    <div className="px-5 py-5 sm:px-6">
                      {skills.length ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {skills.map((skill) => (
                            <div key={skill} className="rounded-xl border border-[#d8e2ee] bg-white px-4 py-3 text-sm text-black/75">
                              {skill}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-black/70">No skills specified</p>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-[#e6edf5] bg-[#f8fafc] px-5 py-3.5 sm:px-6">
                      <p className="text-sm font-semibold text-black">Work Location</p>
                    </div>
                    <div className="h-[180px] overflow-hidden bg-black/5">
                      {hasUsableCoordinates(formData.locationLatitude, formData.locationLongitude) ? (
                        <iframe
                          title="Work location preview"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${Number(formData.locationLongitude) - 0.01},${Number(formData.locationLatitude) - 0.01},${Number(formData.locationLongitude) + 0.01},${Number(formData.locationLatitude) + 0.01}`)}&layer=mapnik&marker=${formData.locationLatitude},${formData.locationLongitude}`}
                          className="h-full w-full border-0"
                          loading="lazy"
                        />
                      ) : locationImagePreview ? (
                        <img src={locationImagePreview} alt="Work location preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-black/40">
                          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[#e6edf5] px-4 py-3">
                      <p className="text-xs text-[#2e66a6]">{formData.location || 'No work address provided.'}</p>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-[#e6edf5] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="border-b border-[#e6edf5] bg-[#f8fafc] px-5 py-3.5 sm:px-6">
                    <p className="text-sm font-semibold text-black">Perks and Benefits</p>
                  </div>
                  <div className="px-5 py-5 sm:px-6">
                    {previewBenefits.length ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {previewBenefits.map((benefit) => (
                          <div key={benefit} className="rounded-xl border border-[#d8e2ee] bg-white px-4 py-3 text-sm text-black/75">
                            {benefit}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-black/70">No perks or benefits specified</p>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#e6edf5] bg-white px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowPrivacyModal(true);
                }}
                className="rounded-xl bg-[#2e66a6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#23508a]"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-2 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-notice-title"
            className="relative flex w-full max-w-[860px] flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.20)]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2e66ff]/[0.07] blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#56b5dc]/[0.12] blur-3xl" />
              <div className="absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-[#1e4ba0]/[0.10] blur-3xl" />
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close privacy notice"
            >
              <span className="text-2xl leading-none" aria-hidden="true">×</span>
            </button>

            <div className="relative z-10 px-5 pb-5 pt-4 sm:px-8 sm:pb-5 lg:px-10">
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20" aria-hidden="true">
                  <div className="absolute inset-0 rounded-full bg-[#1e4ba0]/[0.06]" />
                  <div className="absolute inset-2 rounded-full border border-[#1e4ba0]/15" />
                  <div className="absolute left-2 top-5 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
                  <div className="absolute right-3 top-9 h-1.5 w-1.5 rounded-full bg-[#2e66ff]" />
                  <div className="absolute bottom-2 right-7 h-1.5 w-1.5 rounded-full bg-[#2e66ff]/70" />
                  <img
                    src="/images/lock.png"
                    alt="Lock"
                    className="relative h-14 w-14 object-contain sm:h-16 sm:w-16"
                    draggable="false"
                  />
                </div>
              </div>

              <h2
                id="privacy-notice-title"
                className="mt-0 text-center text-[22px] font-extrabold leading-tight text-[#071b3a] sm:text-[27px] lg:text-[30px]"
                style={{ letterSpacing: '0.04em' }}
              >
                PRIVACY NOTICE &amp; POSTING AGREEMENT
              </h2>

              <div className="mx-auto mt-2 flex items-center justify-center gap-3 text-[#1e4ba0]" aria-hidden="true">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#1e4ba0]" />
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                </svg>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#1e4ba0]" />
              </div>

              <div className="mx-auto mt-3 max-w-[760px] rounded-[16px] border border-[#d7e5ff] bg-gradient-to-br from-[#f9fbff] via-white to-[#eef5ff] px-5 py-4 shadow-[0_10px_30px_rgba(30,75,160,0.08)] sm:px-6 sm:py-4">
                <div className="space-y-2.5 text-justify text-[13px] leading-6 text-[#0f2442] sm:text-sm">
                  <p>By publishing this job post, you confirm that the information provided is <strong>accurate, complete, and intended for legitimate hiring purposes.</strong></p>
                  <p>Once published, your job post will be <strong>visible to eligible job seekers.</strong> Applicants may view the information you provide, including the job title, job description, qualifications, work location, salary (if disclosed), and other hiring details.</p>
                  <p>Any applicant information you receive through <strong>AGAPAY</strong> must be used only for recruitment purposes and handled with appropriate confidentiality. You are responsible for protecting applicants&apos; personal information and must <strong>keep it confidential and use it only for legitimate recruitment purposes.</strong></p>
                  <p>To maintain the integrity of job listings, this post cannot be edited after <strong>one (1) hour</strong> from publication. After this period, any changes require an <strong>edit request for administrator review and approval</strong> before you can edit the job post again.</p>
                </div>
              </div>

              <label className="mx-auto mt-3 flex max-w-[760px] cursor-pointer items-start gap-3 px-1 py-2">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-gray-300 focus:ring-2 focus:ring-offset-2"
                  style={{ accentColor: '#1e4ba0' }}
                />
                <span className="text-left text-sm font-semibold leading-5 text-[#0f2442]">
                  I have read and agree to the Privacy Notice &amp; Posting Agreement.
                </span>
              </label>

              <div className="mx-auto mt-4 flex max-w-[760px] flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrivacyModal(false);
                    setShowPreviewModal(true);
                  }}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Back to Preview
                </button>
                <button
                  type="button"
                  onClick={(event) => handleSubmit(event)}
                  disabled={!privacyAccepted || loading}
                  className="rounded-xl bg-[#1e4ba0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(30,75,160,0.25)] transition hover:bg-[#1b4290] disabled:cursor-not-allowed disabled:bg-[#93a6c9] disabled:shadow-none"
                >
                  {loading ? 'Publishing…' : 'Publish Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-post-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
         
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">
                  !
                </div>
                <h2 id="cancel-post-title" className="text-xl font-bold text-gray-900">
                  Leave Job Posting?
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Your current job post will be saved as a draft before you leave. You can continue editing it later from Manage Jobs.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setPendingLeavePath('/employer/manage-jobs');
                  }}
                  disabled={savingCancelDraft}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={handleCancelAndSaveDraft}
                  disabled={savingCancelDraft}
                  className="rounded-xl bg-[#2e66a6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#23508a] disabled:opacity-50"
                >
                  {savingCancelDraft ? 'Saving Draft…' : 'Save as Draft and Exit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
};

export default PostJob;

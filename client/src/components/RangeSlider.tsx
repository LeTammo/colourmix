import React, { useRef, useState, useEffect } from 'react';

export type RangeValue = number | [number, number];

export interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  // number of ticks (will use min..max evenly) or explicit tick values
  ticks?: number | number[];
  showLabels?: boolean;
  className?: string;
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

function roundToStep(value: number, step: number, min: number) {
  const offset = (value - min) / step;
  const rounded = Math.round(offset) * step + min;
  // handle floating point imprecision
  return Math.round(rounded / step) * step;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  ticks,
  showLabels = true,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<number | null>(null); // index of active thumb (0/1) or null

  // normalize to [low, high] for internal usage
  const isRange = Array.isArray(value);
  const low = isRange ? value[0] : (value as number);
  const high = isRange ? value[1] : (value as number);

  const valueToPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const percentToValue = (percent: number) => roundToStep(min + (percent / 100) * (max - min), step, min);

  // Create tick values
  let tickValues: number[] = [];
  if (Array.isArray(ticks)) {
    tickValues = ticks;
  } else {
    const tickCount = typeof ticks === 'number' && ticks > 1 ? ticks : Math.floor((max - min) / step) + 1;
    const stepTick = (max - min) / Math.max(1, tickCount - 1);
    tickValues = Array.from({ length: tickCount }, (_, i) => Math.round((min + i * stepTick) / step) * step);
    // ensure within bounds
    tickValues = tickValues.map(v => clamp(v, min, max));
  }

  useEffect(() => {
    const onMove = (e: Event) => {
      const ev = e as MouseEvent | TouchEvent | PointerEvent;
      if (active === null) return;
      const track = trackRef.current;
      if (!track) return;

      // Prevent touch scrolling while dragging
      if ('touches' in ev && (ev as TouchEvent).touches?.length) {
        (ev as TouchEvent).preventDefault?.();
      }

      const rect = track.getBoundingClientRect();
      let clientX: number;
      if ('touches' in ev && (ev as TouchEvent).touches?.[0]) {
        clientX = (ev as TouchEvent).touches[0].clientX;
      } else if ('clientX' in ev) {
        clientX = (ev as MouseEvent | PointerEvent).clientX;
      } else {
        clientX = 0;
      }

      const percent = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const newVal = percentToValue(percent);

      if (!isRange) {
        onChange(newVal);
      } else {
        const curLow = low as number;
        const curHigh = high as number;
        if (active === 0) {
          const nextLow = clamp(Math.min(newVal, curHigh), min, max);
          onChange([nextLow, curHigh]);
        } else {
          const nextHigh = clamp(Math.max(newVal, curLow), min, max);
          onChange([curLow, nextHigh]);
        }
      }
    };

    const onUp = () => setActive(null);

    if (active !== null) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
      window.addEventListener('touchcancel', onUp);
      window.addEventListener('pointerup', onUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, low, high, min, max, step, isRange]);

  const handleTrackClick = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const percent = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const newVal = percentToValue(percent);

    if (!isRange) {
      onChange(newVal);
    } else {
      // decide which thumb to move: the closest
      const distLow = Math.abs(newVal - (low as number));
      const distHigh = Math.abs(newVal - (high as number));
      if (distLow <= distHigh) {
        const nextLow = clamp(Math.min(newVal, high as number), min, max);
        onChange([nextLow, high as number]);
      } else {
        const nextHigh = clamp(Math.max(newVal, low as number), min, max);
        onChange([low as number, nextHigh]);
      }
    }
  };

  const thumbCommon = (index: number) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const eps = 1e-6;
      const moveThreshold = 2; // pixels
      // if thumbs are not overlapping, select immediately
      if (!isRange || Math.abs(lowPct - highPct) > eps) {
        setActive(index);
        return;
      }

      const startX = e.clientX;
      const onFirstMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) < moveThreshold) return;
        setActive(dx < 0 ? 0 : 1);
        window.removeEventListener('mousemove', onFirstMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onFirstMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onFirstMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const eps = 1e-6;
      const moveThreshold = 2; // pixels
      if (!isRange || Math.abs(lowPct - highPct) > eps) {
        setActive(index);
        return;
      }

      const startX = e.touches[0]?.clientX ?? 0;
      const onFirstTouch = (ev: TouchEvent) => {
        const dx = (ev.touches[0]?.clientX ?? 0) - startX;
        if (Math.abs(dx) < moveThreshold) return;
        setActive(dx < 0 ? 0 : 1);
        window.removeEventListener('touchmove', onFirstTouch);
        window.removeEventListener('touchend', onTouchEnd);
      };
      const onTouchEnd = () => {
        window.removeEventListener('touchmove', onFirstTouch);
        window.removeEventListener('touchend', onTouchEnd);
      };
      window.addEventListener('touchmove', onFirstTouch, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const eps = 1e-6;
      const moveThreshold = 2; // pixels
      const target = e.currentTarget as Element;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore if not supported
      }

      if (!isRange || Math.abs(lowPct - highPct) > eps) {
        setActive(index);
        return;
      }

      const startX = e.clientX;
      const onFirstPointer = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) < moveThreshold) return;
        setActive(dx < 0 ? 0 : 1);
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        window.removeEventListener('pointermove', onFirstPointer);
        window.removeEventListener('pointerup', onPointerUp);
      };
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onFirstPointer);
        window.removeEventListener('pointerup', onPointerUp);
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      };
      window.addEventListener('pointermove', onFirstPointer);
      window.addEventListener('pointerup', onPointerUp);
    },
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      const key = e.key;
      const delta = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      if (delta === 0) return;
      e.preventDefault();
      if (!isRange) {
        const next = clamp((value as number) + delta, min, max);
        onChange(next);
      } else {
        const [curLow, curHigh] = value as [number, number];
        if (index === 0) {
          const nextLow = clamp(Math.min(curLow + delta, curHigh), min, max);
          onChange([nextLow, curHigh]);
        } else {
          const nextHigh = clamp(Math.max(curHigh + delta, curLow), min, max);
          onChange([curLow, nextHigh]);
        }
      }
    },
  });

  const lowPct = valueToPercent(low as number);
  const highPct = valueToPercent(high as number);

  return (
    <div className={`w-full mb-4 ${className}`}>
      <div className="relative h-15">
        {/* Track */}
        <div
          ref={trackRef}
          className="absolute inset-0 flex items-center"
          onMouseDown={handleTrackClick}
          role="presentation"
        >
          <div className="w-full h-1 bg-gray-200 rounded" />
          {/* highlighted range */}
          <div
            className="absolute h-1 bg-blue-600 rounded"
            style={{ left: `${isRange ? lowPct : 0}%`, width: `${isRange ? Math.max(0, highPct - lowPct) : lowPct}%` }}
          />

          {/* ticks */}
          <div className="absolute top-12 inset-0 flex items-start justify-between pointer-events-none">
            {tickValues.map((t, i) => (
              <div key={i} className="flex flex-col items-center -mt-2 w-0">
                <div className="w-px h-2 bg-gray-400" />
                {showLabels && <div className="text-xs text-gray-500 mt-1">{t}</div>}
              </div>
            ))}
          </div>

          {/* thumbs */}
          {!isRange && (
            <div
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={low as number}
                  className="absolute top-1/2 w-5 h-5 bg-white border border-gray-300 rounded-full shadow transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30"
              style={{ left: `${lowPct}%` }}
              {...thumbCommon(0)}
            />
          )}

          {isRange && (
            <>
              <div
                role="slider"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={(value as [number, number])[0]}
                  className="absolute top-1/2 w-5 h-5 bg-white border border-gray-300 rounded-full shadow transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
                style={{ left: `${lowPct}%` }}
                {...thumbCommon(0)}
              />
              <div
                  role="slider"
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={(value as [number, number])[1]}
                  className="absolute top-1/2 w-5 h-5 bg-white border border-gray-300 rounded-full shadow transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                  style={{ left: `${highPct}%` }}
                  {...thumbCommon(1)}
                />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;

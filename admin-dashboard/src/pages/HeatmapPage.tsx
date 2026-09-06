import { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw } from 'lucide-react';
import * as heatmapService from '@/services/heatmap.service';
import type { HeatmapZone, PageMeta } from '@/types';
import { RISK_LEVEL_LABEL } from '@/constants';
import { PageSpinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';
import { Pagination } from '@/components/common/Pagination';
import { RoleGate } from '@/components/common/RoleGate';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

const RISK_COLOR: Record<string, string> = { green: '#1F8A57', yellow: '#C97A1F', red: '#D6402F' };

function riskTone(level: string) {
  if (level === 'red') return 'red' as const;
  if (level === 'yellow') return 'amber' as const;
  return 'green' as const;
}

const LIMIT = 50;

export function HeatmapPage() {
  const [zones, setZones] = useState<HeatmapZone[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showRecalc, setShowRecalc] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [bbox, setBbox] = useState({ minLng: '', minLat: '', maxLng: '', maxLat: '' });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await heatmapService.listZones(page, LIMIT);
      setZones(res.zones);
      setMeta(res.meta);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Initialize the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [88.3639, 22.5726], // Kolkata — SafeSathi's initial deployment city
      zoom: 11,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw zone markers whenever the list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = zones.map((zone) => {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.15)';
      el.style.background = RISK_COLOR[zone.riskLevel] ?? '#5B6472';
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([zone.center.coordinates[0], zone.center.coordinates[1]])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            `<div style="font-family:Inter,sans-serif;font-size:12.5px">
              <strong>${RISK_LEVEL_LABEL[zone.riskLevel] ?? zone.riskLevel}</strong><br/>
              Risk score: ${zone.riskScore}<br/>
              Reports: ${zone.reportCount} · SOS: ${zone.sosCount}
            </div>`
          )
        )
        .addTo(map);
      return marker;
    });
  }, [zones]);

  async function handleRecalculate(e: FormEvent) {
    e.preventDefault();
    const parsed = {
      minLng: Number(bbox.minLng),
      minLat: Number(bbox.minLat),
      maxLng: Number(bbox.maxLng),
      maxLat: Number(bbox.maxLat),
    };
    if (Object.values(parsed).some((v) => Number.isNaN(v))) {
      toast.error('All bounding box fields must be numbers.');
      return;
    }
    setRecalculating(true);
    try {
      const updated = await heatmapService.recalculateZones(parsed);
      toast.success(`Recalculated ${updated.length} zone${updated.length === 1 ? '' : 's'}.`);
      setShowRecalc(false);
      setBbox({ minLng: '', minLat: '', maxLng: '', maxLat: '' });
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[13px] text-slate-muted">
          {Object.entries(RISK_LEVEL_LABEL).map(([level, label]) => (
            <span key={level} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLOR[level] }} />
              {label}
            </span>
          ))}
        </div>
        <RoleGate allow={['super_admin', 'moderator']}>
          <button onClick={() => setShowRecalc(true)} className="btn-primary">
            <RefreshCw size={14} /> Recalculate zones
          </button>
        </RoleGate>
      </div>

      <div ref={mapContainerRef} className="h-80 w-full rounded-lg border border-line" />

      <div className="panel overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : zones.length === 0 ? (
          <EmptyState title="No zones calculated yet" description="Recalculate a bounding box to generate risk zones." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-slate-muted">
                  <th className="px-4 py-2.5 font-medium">Zone</th>
                  <th className="px-4 py-2.5 font-medium">Risk</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Reports</th>
                  <th className="px-4 py-2.5 font-medium">SOS</th>
                  <th className="px-4 py-2.5 font-medium">Last calculated</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone._id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-2.5 font-mono text-[12.5px]">{zone.zoneId}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill label={RISK_LEVEL_LABEL[zone.riskLevel]} tone={riskTone(zone.riskLevel)} />
                    </td>
                    <td className="px-4 py-2.5">{zone.riskScore}</td>
                    <td className="px-4 py-2.5">{zone.reportCount}</td>
                    <td className="px-4 py-2.5">{zone.sosCount}</td>
                    <td className="px-4 py-2.5 text-slate-muted">
                      {new Date(zone.lastCalculatedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {showRecalc && (
        <Modal
          title="Recalculate risk zones"
          onClose={() => setShowRecalc(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowRecalc(false)}>
                Cancel
              </button>
              <button form="recalc-form" type="submit" className="btn-primary" disabled={recalculating}>
                {recalculating ? 'Recalculating…' : 'Recalculate'}
              </button>
            </>
          }
        >
          <form id="recalc-form" onSubmit={handleRecalculate} className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-[13px] text-slate-muted">
              Enter the bounding box to rebuild risk scores for — this recomputes every zone whose center falls
              inside it from current reports and SOS data.
            </p>
            {(['minLng', 'minLat', 'maxLng', 'maxLat'] as const).map((key) => (
              <div key={key}>
                <label className="field-label capitalize" htmlFor={key}>
                  {key.replace('min', 'Min ').replace('max', 'Max ')}
                </label>
                <input
                  id={key}
                  type="number"
                  step="any"
                  required
                  className="field-input"
                  value={bbox[key]}
                  onChange={(e) => setBbox((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </form>
        </Modal>
      )}
    </div>
  );
}

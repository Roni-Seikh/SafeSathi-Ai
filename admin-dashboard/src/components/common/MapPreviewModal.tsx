import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Modal } from './Modal';

interface MapPreviewModalProps {
  title: string;
  lat: number;
  lng: number;
  markerColor?: string;
  onClose: () => void;
}

/** OpenStreetMap raster tiles via MapLibre — matches the mobile app's map
 * provider (see README §3) so admins see the same basemap the field uses. */
export function MapPreviewModal({ title, lat, lng, markerColor = '#D6402F', onClose }: MapPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
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
      center: [lng, lat],
      zoom: 15,
    });

    new maplibregl.Marker({ color: markerColor }).setLngLat([lng, lat]).addTo(map);
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.remove();
  }, [lat, lng, markerColor]);

  return (
    <Modal title={title} onClose={onClose}>
      <div ref={containerRef} className="h-72 w-full rounded-md" />
      <p className="mt-2 text-[12.5px] text-slate-muted">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
    </Modal>
  );
}

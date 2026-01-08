import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { useState, useEffect, useMemo, useRef } from "react";
import { DateTime } from "luxon";
import { cn } from "~/lib/utils";
import type { MarkerClusterer as MarkerClustererType } from "@googlemaps/markerclusterer";
import pkg from "@googlemaps/markerclusterer";
const { MarkerClusterer } = pkg;

interface TravelMapProps {
    tweets: any[];
    className?: string;
}

export function TravelMap({ tweets, className }: TravelMapProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 좌표가 있는 트윗만 필터링 및 시간순 정렬
    const mapItems = useMemo(() => {
        return tweets
            .filter(t => t.latitude && t.longitude)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [tweets]);

    const selectedTweet = useMemo(() =>
        mapItems.find(t => t.id === selectedId),
        [mapItems, selectedId]);

    // 지도 중심 계산 (데이터가 없으면 서울 기준)
    const center = useMemo(() => {
        if (mapItems.length === 0) return { lat: 37.5665, lng: 126.9780 };
        const latSum = mapItems.reduce((acc, curr) => acc + curr.latitude, 0);
        const lngSum = mapItems.reduce((acc, curr) => acc + curr.longitude, 0);
        return { lat: latSum / mapItems.length, lng: lngSum / mapItems.length };
    }, [mapItems]);

    return (
        <div className={cn("w-full h-[500px] rounded-2xl overflow-hidden border border-border shadow-inner relative", className)}>
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                <Map
                    defaultCenter={center}
                    defaultZoom={12}
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    mapId="TRAVEL_MAP_ID"
                >
                    {/* 경로 시각화 (Polyline) */}
                    <TravelPolyline items={mapItems} />

                    {/* 마커 및 클러스터러 */}
                    <Markers
                        items={mapItems}
                        onMarkerClick={(id) => setSelectedId(id)}
                    />

                    {/* 인포 윈도우 (선택된 마커 정보) */}
                    {selectedId && selectedTweet && (
                        <InfoWindow
                            position={{ lat: selectedTweet.latitude, lng: selectedTweet.longitude }}
                            onCloseClick={() => setSelectedId(null)}
                        >
                            <div className="p-2 max-w-[200px]">
                                {selectedTweet.media?.[0] && (
                                    <img
                                        src={selectedTweet.media[0].url}
                                        alt="Thumbnail"
                                        className="w-full h-24 object-cover rounded-md mb-2"
                                    />
                                )}
                                <h4 className="font-bold text-sm truncate">{selectedTweet.locationName || "알 수 없는 장소"}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{selectedTweet.content}</p>
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    {DateTime.fromISO(selectedTweet.createdAt).setLocale("ko").toFormat("yyyy.MM.dd HH:mm")}
                                </p>
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>

            {mapItems.length === 0 && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <p className="text-muted-foreground font-medium">위치 정보가 포함된 여행기가 없습니다.</p>
                    <p className="text-xs text-muted-foreground/60">AI 여행 일지 기능을 통해 위치와 함께 기록해보세요!</p>
                </div>
            )}
        </div>
    );
}

// 클러스터러를 포함한 마커 렌더링 컴포넌트
function Markers({ items, onMarkerClick }: { items: any[], onMarkerClick: (id: string) => void }) {
    const map = useMap();
    const [markers, setMarkers] = useState<{ [key: string]: google.maps.Marker }>({});
    const clusterer = useRef<MarkerClustererType | null>(null);

    // 클러스터러 초기화
    useEffect(() => {
        if (!map) return;
        if (!clusterer.current) {
            clusterer.current = new MarkerClusterer({ map });
        }
    }, [map]);

    // 마커가 변경될 때 클러스터러 업데이트
    useEffect(() => {
        if (!clusterer.current) return;

        clusterer.current.clearMarkers();
        clusterer.current.addMarkers(Object.values(markers));
    }, [markers]);

    const setMarkerRef = (marker: google.maps.Marker | null, key: string) => {
        if (marker && markers[key]) return;
        if (!marker && !markers[key]) return;

        setMarkers(prev => {
            if (marker) {
                return { ...prev, [key]: marker };
            } else {
                const newMarkers = { ...prev };
                delete newMarkers[key];
                return newMarkers;
            }
        });
    };

    return (
        <>
            {items.map((item, index) => (
                <Marker
                    key={item.id}
                    position={{ lat: item.latitude, lng: item.longitude }}
                    onClick={() => onMarkerClick(item.id)}
                    label={(index + 1).toString()}
                    ref={marker => setMarkerRef(marker, item.id)}
                />
            ))}
        </>
    );
}

// 경로를 그리는 보조 컴포넌트
function TravelPolyline({ items }: { items: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || items.length < 2) return;

        // 시간 간격에 따라 세그먼트 분리 (예: 24시간 이상 차이 나면 다른 여행으로 간주)
        const segments: google.maps.LatLngLiteral[][] = [];
        let currentSegment: google.maps.LatLngLiteral[] = [];

        items.forEach((item, index) => {
            const currentPoint = { lat: item.latitude, lng: item.longitude };

            if (index === 0) {
                currentSegment.push(currentPoint);
            } else {
                const prevItem = items[index - 1];
                const timeDiff = new Date(item.createdAt).getTime() - new Date(prevItem.createdAt).getTime();
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                if (hoursDiff > 24) {
                    segments.push(currentSegment);
                    currentSegment = [currentPoint];
                } else {
                    currentSegment.push(currentPoint);
                }
            }
        });
        segments.push(currentSegment);

        const polylines = segments.filter(seg => seg.length >= 2).map(path => {
            const polyline = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: "#ff385c",
                strokeOpacity: 0.8,
                strokeWeight: 4,
            });
            polyline.setMap(map);
            return polyline;
        });

        return () => {
            polylines.forEach(p => p.setMap(null));
        };
    }, [map, items]);

    return null;
}
